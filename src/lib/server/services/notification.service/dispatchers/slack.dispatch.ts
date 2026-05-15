export type SlackConfig = {
    webhookUrl: string;
};

export default async (config: SlackConfig, message: string): Promise<void> => {
    const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text: message}),
        signal: AbortSignal.timeout(10_000)
    });

    if (!res.ok) {
        throw new Error(`Slack webhook returned ${res.status}`);
    }
}
