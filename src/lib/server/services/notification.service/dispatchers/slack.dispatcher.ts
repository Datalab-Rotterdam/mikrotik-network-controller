import {v} from "@sourceregistry/node-validator";
import type {InferValidator} from "@sourceregistry/node-env";

export const type = "slack"

export type SlackConfig = {
    webhookUrl: string;
}

export const validate = v.tuple([
    v.object({webhookUrl: v.string()}),
    v.object({message: v.string()})
])


export default async ([config, input]: InferValidator<typeof validate>) => {
    const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text: input.message}),
        signal: AbortSignal.timeout(10_000)
    });
    if (!res.ok) {
        throw new Error(`Slack webhook returned ${res.status}`);
    }
}
