export type WebhookConfig = {
    url: string;
    headers?: Record<string, string>;
};

export default async (
    config: WebhookConfig,
    payload: Record<string, unknown>
): Promise<void> => {
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
