import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/crypto';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: Request) {
    try {
        const { messages, prompt, model, userId } = await req.json();

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Fetch encrypted API key from Firestore
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

        // Construct payload
        // If 'messages' is provided (new way), use it.
        // If only 'prompt' is provided (legacy slash command), construct messages.
        let payloadMessages = messages;
        if (!payloadMessages && prompt) {
            payloadMessages = [
                { "role": "system", "content": "You are a helpful writing assistant. Continue the text or answer the user's prompt directly and concisely." },
                { "role": "user", "content": prompt }
            ];
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://note.myarchive.cc", // Optional but good practice
                "X-Title": "MyArchive Note"
            },
            body: JSON.stringify({
                "model": model || "openai/gpt-3.5-turbo",
                "messages": payloadMessages,
                "reasoning": { "max_tokens": 2048 }
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message || 'OpenRouter Error');
        }

        const choice = data.choices?.[0]?.message;
        const content = choice?.content || "";
        const reasoning = choice?.reasoning || ""; // OpenRouter standard field

        return NextResponse.json({ content, reasoning });

    } catch (error: any) {
        console.error("AI API Error:", error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
