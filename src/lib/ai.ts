const MODEL_MAPPING: Record<string, string> = {
    "anthropic/claude-4.5-sonnet": "anthropic/claude-3.5-sonnet",
    "anthropic/claude-4.5-opus": "anthropic/claude-3-opus",
    "google/gemini-2.5-flash": "google/gemini-flash-1.5",
    "google/gemini-3.0-pro": "google/gemini-pro-1.5",
    "openai/gpt-5.2": "openai/gpt-4o"
};

export function resolveModelID(modelId: string): string {
    return MODEL_MAPPING[modelId] || modelId;
}

export async function generateAIContent(prompt: string, systemPrompt?: string, modelOverride?: string): Promise<string> {
    try {
        const apiKey = localStorage.getItem("openrouter_api_key");
        const storedModel = localStorage.getItem("openrouter_model");
        // Prefer override, then stored, then default (Future ID)
        const rawModel = modelOverride || storedModel || "google/gemini-3.0-pro";
        // Resolve to Real ID for API
        const model = resolveModelID(rawModel);

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
