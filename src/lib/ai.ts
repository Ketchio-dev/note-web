export async function generateAIContent(prompt: string, systemPrompt?: string, modelOverride?: string): Promise<string> {
    try {
        const apiKey = localStorage.getItem("openrouter_api_key");
        const storedModel = localStorage.getItem("openrouter_model");
        // Prefer override, then stored, then default
        const model = modelOverride || storedModel || "anthropic/claude-3.5-sonnet";

        if (!apiKey) {
            return "Please set your OpenRouter API Key in Settings.";
        }

        const messages = [
            { role: 'user', content: prompt }
        ];

        if (systemPrompt) {
            messages.unshift({ role: 'system', content: systemPrompt });
        }

        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-OpenRouter-Key': apiKey
            },
            body: JSON.stringify({ messages, model })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Failed to generate content');
        }

        return data.content;
    } catch (e: any) {
        console.error("AI Generation Failed", e);
        return `[Error: ${e.message}]`;
    }
}
