import { AlertRepository } from '$lib/server/repositories/alerts.repository';
import { alertEvaluatorEvents } from '$lib/server/services/alert-evaluator.service';

type WebhookConfig = {
	url: string;
	headers?: Record<string, string>;
};

type SlackConfig = {
	webhookUrl: string;
};

type EmailConfig = {
	to: string;
	smtpHost?: string;
	smtpPort?: number;
	smtpUser?: string;
	smtpPass?: string;
};

async function dispatchWebhook(
	config: WebhookConfig,
	payload: Record<string, unknown>
): Promise<void> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(config.headers ?? {})
	};

	const res = await fetch(config.url, {
		method: 'POST',
		headers,
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(10_000)
	});

	if (!res.ok) {
		throw new Error(`Webhook returned ${res.status}`);
	}
}

async function dispatchSlack(config: SlackConfig, message: string): Promise<void> {
	const res = await fetch(config.webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text: message }),
		signal: AbortSignal.timeout(10_000)
	});

	if (!res.ok) {
		throw new Error(`Slack webhook returned ${res.status}`);
	}
}

async function dispatchEmail(config: EmailConfig, subject: string, body: string): Promise<void> {
	// nodemailer is not bundled — skip gracefully if env is not configured
	const smtpHost = config.smtpHost ?? process.env.SMTP_HOST;
	if (!smtpHost) return;

	try {
		// nodemailer is an optional dep — use Function() to prevent TS from resolving the module
		// eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-explicit-any
		const nodemailer: any = await new Function('m', 'return import(m)')('nodemailer');
		const transporter = (nodemailer.default ?? nodemailer).createTransport({
			host: smtpHost,
			port: config.smtpPort ?? Number(process.env.SMTP_PORT ?? 587),
			auth: {
				user: config.smtpUser ?? process.env.SMTP_USER,
				pass: config.smtpPass ?? process.env.SMTP_PASS
			}
		});

		await transporter.sendMail({
			from: process.env.SMTP_FROM ?? 'alerts@mikrotik-controller',
			to: config.to,
			subject,
			text: body
		});
	} catch {
		// nodemailer not installed or send failed — silently skip
	}
}

async function notifyChannels(
	ruleId: string,
	severity: string,
	message: string,
	metadata: Record<string, unknown>
): Promise<void> {
	const channels = await AlertRepository.getChannelsForRule(ruleId);

	await Promise.allSettled(
		channels
			.filter((ch) => ch.enabled)
			.map(async (channel) => {
				const cfg = channel.config as Record<string, unknown>;

				if (channel.type === 'webhook') {
					await dispatchWebhook(cfg as WebhookConfig, {
						severity,
						message,
						ruleId,
						timestamp: new Date().toISOString(),
						...metadata
					});
				} else if (channel.type === 'slack') {
					const emoji = severity === 'critical' ? ':red_circle:' : severity === 'warning' ? ':warning:' : ':information_source:';
					await dispatchSlack(
						cfg as SlackConfig,
						`${emoji} *[${severity.toUpperCase()}]* ${message}`
					);
				} else if (channel.type === 'email') {
					await dispatchEmail(
						cfg as EmailConfig,
						`[${severity.toUpperCase()}] Alert: ${message}`,
						`Alert triggered at ${new Date().toISOString()}\n\nSeverity: ${severity}\nMessage: ${message}\nRule ID: ${ruleId}`
					);
				}
			})
	);
}

export function startNotificationService(): void {
	alertEvaluatorEvents.on('alert:fired', (detail) => {
		void notifyChannels(detail.ruleId, detail.severity, detail.message, {
			eventId: detail.eventId,
			deviceId: detail.deviceId,
			siteId: detail.siteId
		}).catch(() => {
			/* ignore notification failures */
		});
	});
}
