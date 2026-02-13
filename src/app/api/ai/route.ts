import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/crypto';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/server-auth';

type AIMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL ?? 'openai/gpt-4o-mini';
const MODEL_ALIASES: Record<string, string> = {
    'gpt-4o-mini': 'openai/gpt-4o-mini',
    'anthropic/claude-4.5-sonnet': 'anthropic/claude-3.5-sonnet',
    'anthropic/claude-4.5-opus': 'anthropic/claude-3-opus',
    'google/gemini-3.0-pro': 'google/gemini-3-pro-preview',
    'openai/gpt-5.2': 'openai/gpt-5.2-chat',
};

function normalizeModel(model: unknown): string {
    if (typeof model !== 'string' || !model.trim() || model === 'default') {
        return DEFAULT_MODEL;
    }

    const trimmed = model.trim();
    return MODEL_ALIASES[trimmed] || trimmed;
}

function buildMessages(messages: unknown, prompt: unknown): AIMessage[] {
    if (Array.isArray(messages) && messages.length > 0) {
        const normalized = messages
            .map((message) => {
                if (!message || typeof message !== 'object') {
                    return null;
                }

                const role = (message as { role?: unknown }).role;
                const content = (message as { content?: unknown }).content;

                if (
                    (role === 'system' || role === 'user' || role === 'assistant')
                    && typeof content === 'string'
                    && content.trim().length > 0
                ) {
                    return { role, content } as AIMessage;
                }

                return null;
            })
            .filter((msg): msg is AIMessage => msg !== null);

        if (normalized.length > 0) {
            return normalized;
        }
    }

    if (typeof prompt === 'string' && prompt.trim()) {
        return [
            {
                role: 'system',
                content: 'You are a helpful writing assistant. Answer clearly and concisely.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ];
    }

    return [
        {
            role: 'user',
            content: 'Please provide a concise helpful response.',
        },
    ];
}

async function resolveApiKey(userId: string): Promise<{ apiKey?: string; source: 'user' | 'environment' | 'none' }> {
    try {
        const db = getAdminFirestore();
        const settingsDoc = await db
            .collection('users')
            .doc(userId)
            .collection('private')
            .doc('settings')
            .get();

        const encrypted = settingsDoc.data()?.openrouterKey;
        if (typeof encrypted === 'string' && encrypted.trim()) {
            try {
                return { apiKey: decrypt(encrypted), source: 'user' };
            } catch (decryptError) {
                console.error('[AI API] Failed to decrypt user API key:', decryptError);
            }
        }
    } catch (firestoreError) {
        console.warn('[AI API] Failed to load user settings:', firestoreError);
    }

    const envKey = process.env.OPENROUTER_API_KEY;
    if (envKey) {
        return { apiKey: envKey, source: 'environment' };
    }

    return { source: 'none' };
}

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        let body;
        try {
            body = await req.json();
        } catch (error) {
            console.warn('[AI API] Failed to parse request body:', error);
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { messages, prompt, model, userId } = body as {
            messages?: unknown;
            prompt?: unknown;
            model?: unknown;
            userId?: unknown;
        };

        if (userId && userId !== auth.user.uid) {
            return NextResponse.json({ error: 'Forbidden: userId mismatch' }, { status: 403 });
        }

        const payloadMessages = buildMessages(messages, prompt);
        const selectedModel = normalizeModel(model);
        const { apiKey, source } = await resolveApiKey(auth.user.uid);

        if (!apiKey) {
            return NextResponse.json(
                {
                    error: 'API key not configured. Please add your OpenRouter API key in Settings.',
                    details: 'OPENROUTER_API_KEY env var is missing and no user key provided.'
                },
                { status: 401 }
            );
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://note.myarchive.cc',
                'X-Title': 'MyArchive Note',
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: payloadMessages,
                reasoning: { max_tokens: 2048 },
            }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const upstreamMessage = data?.error?.message || `OpenRouter request failed (${response.status})`;
            console.error('[AI API] OpenRouter Error:', response.status, upstreamMessage);

            if (response.status === 401 || response.status === 403) {
                return NextResponse.json(
                    { error: 'Invalid or expired token. Please reauthenticate.' },
                    { status: 401 }
                );
            }

            return NextResponse.json({ error: upstreamMessage }, { status: 500 });
        }

        const choice = data?.choices?.[0]?.message;
        const content = typeof choice?.content === 'string' ? choice.content : '';
        const reasoning = typeof choice?.reasoning === 'string' ? choice.reasoning : '';
        const generated = content || 'Request processed successfully.';

        return NextResponse.json({
            content: generated,
            generated,
            reasoning,
            model: selectedModel,
            keySource: source,
        });
    } catch (error) {
        const err = error as Error;
        console.error('[AI API] Internal Error:', error);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
