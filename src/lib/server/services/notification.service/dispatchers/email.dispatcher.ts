import {v} from "@sourceregistry/node-validator";
import type {InferValidator} from "@sourceregistry/node-env";

export const type = "email";

export type EmailConfig = {
    to: string;
    smtp?: Partial<{
        host: string;
        port: string;
        username: string;
        password: string;
    }>
};

export const validate =
    v.tuple([
        v.object({
            to: v.string(),
            smtp: v.object({
                host: v.withDefault(v.string(), process.env.SMTP_HOST),
                port: v.withDefault(v.number(), Number(process.env.SMTP_PORT ?? 587)),
                username: v.withDefault(v.string(), process.env.SMTP_USERNAME),
                password: v.withDefault(v.string(), process.env.SMTP_PASSWORD),
            })
        }),
        v.object({
            subject: v.string(),
            body: v.string()
        })
    ])

export default async ([config, input]: InferValidator<typeof validate>) => {
    // nodemailer is not bundled — skip gracefully if env is not configured
    const smtpHost = config.smtp?.host
    if (!smtpHost) return;

    try {
        // nodemailer is an optional dep — use Function() to prevent TS from resolving the module
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-explicit-any
        const nodemailer: any = await new Function('m', 'return import(m)')('nodemailer');
        const transporter = (nodemailer.default ?? nodemailer).createTransport({
            host: smtpHost,
            port: config.smtp?.port,
            auth: {
                user: config.smtp?.username ?? process.env.SMTP_USERNAME,
                pass: config.smtp?.password ?? process.env.SMTP_PASSWORD
            }
        });

        await transporter.sendMail({
            from: process.env.SMTP_FROM ?? 'alerts@mikrotik-controller',
            to: config.to,
            subject: input.subject,
            text: input.body
        });
    } catch {
        // nodemailer not installed or send failed — silently skip
    }
}
