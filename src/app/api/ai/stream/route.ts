import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/crypto';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: Request) {
    try {
        const { messages, model, userId } = await req.json();

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Fetch encrypted API key
        const settingsRef = doc(db, 'users', userId, 'private', 'settings');
        const settingsDoc = await getDoc(settingsRef);

        let apiKey: string | undefined;

        // Try to get from user settings first
        if (settingsDoc.exists() && settingsDoc.data()?.openrouterKey) {
            try {
                const encryptedKey = settingsDoc.data().openrouterKey;
                apiKey = decrypt(encryptedKey);
            } catch (decryptError) {
                console.error('Decryption failed, falling back to env:', decryptError);
            }
        }

        // Fallback to environment variable if no user key or decryption failed
        if (!apiKey) {
            apiKey = process.env.OPENROUTER_API_KEY;
        }

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API key not configured. Please add your OpenRouter API key in Settings.' },
                { status: 401 }
            );
        }

        // Streaming response
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': 'https://note.myarchive.cc',
                            'X-Title': 'MyArchive Note'
                        },
                        body: JSON.stringify({
                            model: model || 'openai/gpt-3.5-turbo',
                            messages,
                            stream: true // Enable streaming
                        })
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error?.message || 'API request failed');
                    }

                    const reader = response.body?.getReader();
                    if (!reader) {
                        throw new Error('No response body');
                    }

                    const decoder = new TextDecoder();

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        // Decode chunk
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6).trim();

                                if (data === '[DONE]') {
                                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                                    continue;
                                }

                                try {
                                    const json = JSON.parse(data);
                                    const content = json.choices?.[0]?.delta?.content;

                                    if (content) {
                                        controller.enqueue(
                                            encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                                        );
                                    }
                                } catch (e) {
                                    // Skip invalid JSON
                                }
                            }
                        }
                    }

                    controller.close();
                } catch (error: any) {
                    const errorMessage = JSON.stringify({ error: error.message });
                    controller.enqueue(encoder.encode(`data: ${errorMessage}\n\n`));
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        });

    } catch (error: any) {
        console.error('AI Stream API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
