import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/crypto';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/server-auth';

type StreamMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL ?? 'openai/gpt-4o-mini';

function normalizeModel(model: unknown): string {
    if (typeof model !== 'string' || !model.trim() || model === 'default') {
        return DEFAULT_MODEL;
    }

    const trimmed = model.trim();
    if (trimmed === 'gpt-4o-mini') {
        return 'openai/gpt-4o-mini';
    }

    return trimmed;
}

function buildMessages(messages: unknown, prompt: unknown): StreamMessage[] {
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
                    return { role, content } as StreamMessage;
                }

                return null;
            })
            .filter((message): message is StreamMessage => message !== null);

        if (normalized.length > 0) {
            return normalized;
        }
    }

    if (typeof prompt === 'string' && prompt.trim()) {
        return [{ role: 'user', content: prompt }];
    }

    return [{ role: 'user', content: 'Hello' }];
}

async function resolveApiKey(userId: string): Promise<string | undefined> {
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
                return decrypt(encrypted);
            } catch (decryptError) {
                console.error('[AI Stream API] Decryption failed:', decryptError);
            }
        }
    } catch (firestoreError) {
        console.warn('[AI Stream API] Failed to read user settings:', firestoreError);
    }

    return process.env.OPENROUTER_API_KEY;
}

function sseResponse(stream: ReadableStream): Response {
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}

function createSingleEventStream(payload: Record<string, string>): ReadableStream {
    const encoder = new TextEncoder();

    return new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
        },
    });
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
        } catch {
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

        const apiKey = await resolveApiKey(auth.user.uid);
        if (!apiKey) {
            return NextResponse.json(
                { error: 'API key not configured. Please add your OpenRouter API key in Settings.' },
                { status: 401 }
            );
        }

        const payloadMessages = buildMessages(messages, prompt);
        const selectedModel = normalizeModel(model);
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
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
                            stream: true,
                        }),
                    });

                    if (!response.ok) {
                        const error = await response.json().catch(() => null);
                        const message = error?.error?.message || `API request failed (${response.status})`;
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ error: message, content: 'Streaming request failed.' })}\n\n`)
                        );
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                        return;
                    }

                    const reader = response.body?.getReader();
                    if (!reader) {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`)
                        );
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                        return;
                    }

                    const decoder = new TextDecoder();
                    let buffer = '';
                    let emitted = false;

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() ?? '';

                        for (const line of lines) {
                            if (!line.startsWith('data: ')) {
                                continue;
                            }

                            const data = line.slice(6).trim();
                            if (data === '[DONE]') {
                                continue;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content;

                                if (typeof content === 'string' && content.length > 0) {
                                    emitted = true;
                                    controller.enqueue(
                                        encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                                    );
                                }
                            } catch {
                                // ignore malformed chunks
                            }
                        }
                    }

                    if (!emitted) {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ content: 'Stream completed with no content.' })}\n\n`)
                        );
                    }

                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (error) {
                    const err = error as Error;
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: err.message || 'Unknown stream error' })}\n\n`)
                    );
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                }
            },
        });

        return sseResponse(stream);
    } catch (error) {
        const err = error as Error;
        console.error('AI Stream API Error:', error);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const auth = await requireAuth(req);
    if (!auth.ok) {
        return auth.response;
    }

    return sseResponse(
        createSingleEventStream({ content: 'AI stream endpoint is reachable.' })
    );
}
