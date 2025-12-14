const MODEL_MAPPING: Record<string, string> = {
    "anthropic/claude-4.5-sonnet": "anthropic/claude-3.5-sonnet",
    "anthropic/claude-4.5-opus": "anthropic/claude-3-opus",
    "google/gemini-2.5-flash": "google/gemini-2.5-flash",
    "google/gemini-3.0-pro": "google/gemini-3-pro-preview",
    "openai/gpt-5.2": "openai/gpt-5.2-chat"
};

export function resolveModelID(modelId: string): string {
    return MODEL_MAPPING[modelId] || modelId;
}

export interface AIResponse {
    content: string;
    reasoning?: string;
}

export async function generateAIContent(prompt: string, systemPrompt?: string, modelOverride?: string): Promise<AIResponse> {
    try {
        const apiKey = localStorage.getItem("openrouter_api_key");
        const storedModel = localStorage.getItem("openrouter_model");
        // Prefer override, then stored, then default (Future ID)
        const rawModel = modelOverride || storedModel || "google/gemini-3.0-pro";
        // Resolve to Real ID for API
        const model = resolveModelID(rawModel);

        if (!apiKey) {
            return { content: "Please set your OpenRouter API Key in Settings." };
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

        return { content: data.content, reasoning: data.reasoning };
    } catch (e: any) {
        console.error("AI Generation Failed", e);
        return { content: `[Error: ${e.message}]` };
    }
}
