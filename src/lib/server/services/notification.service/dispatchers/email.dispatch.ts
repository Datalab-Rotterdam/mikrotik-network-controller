export type EmailConfig = {
    to: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
};

export default async (config: EmailConfig, subject: string, body: string): Promise<void> => {
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
