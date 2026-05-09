import {v} from "@sourceregistry/node-validator";
import type {InferValidator} from "@sourceregistry/node-env";

export const type = "webhook"

type WebhookConfig = {
    url: string;
    headers?: Record<string, string>;
};

export const validate = v.tuple([
    v.object({
        url: v.string(),
        headers: v.record(v.string()),
    }),
    v.record(v.any())
])

export default async ([config, input]: InferValidator<typeof validate>) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(config.headers ?? {})
    };

    const res = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(10_000)
    });

    if (!res.ok) {
        throw new Error(`Webhook returned ${res.status}`);
    }
}
