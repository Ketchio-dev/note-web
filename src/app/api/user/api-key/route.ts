import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { encrypt } from '@/lib/crypto';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/server-auth';

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { apiKey, userId } = await req.json() as {
            apiKey?: string;
            userId?: string;
        };

        if (userId && userId !== auth.user.uid) {
            return NextResponse.json({ error: 'Forbidden: userId mismatch' }, { status: 403 });
        }

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API key is required' },
                { status: 400 }
            );
        }

        if (typeof apiKey !== 'string' || apiKey.length < 10) {
            return NextResponse.json(
                { error: 'Invalid API key format' },
                { status: 400 }
            );
        }

        const encryptedKey = encrypt(apiKey);
        const db = getAdminFirestore();

        await db
            .collection('users')
            .doc(auth.user.uid)
            .collection('private')
            .doc('settings')
            .set(
                {
                    openrouterKey: encryptedKey,
                    updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
            );

        return NextResponse.json({
            success: true,
            message: 'API key saved securely',
        });
    } catch (error) {
        const err = error as Error;
        console.error('[API Key] Save failed:', error);
        return NextResponse.json(
            { error: err.message || 'Failed to save API key' },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (userId && userId !== auth.user.uid) {
            return NextResponse.json({ error: 'Forbidden: userId mismatch' }, { status: 403 });
        }

        const db = getAdminFirestore();
        const settingsDoc = await db
            .collection('users')
            .doc(auth.user.uid)
            .collection('private')
            .doc('settings')
            .get();

        const hasKey = settingsDoc.exists && Boolean(settingsDoc.data()?.openrouterKey);

        return NextResponse.json({ hasApiKey: hasKey });
    } catch (error) {
        const err = error as Error;
        console.error('[API Key] Check failed:', error);
        return NextResponse.json(
            { error: err.message || 'Failed to check API key status' },
            { status: 500 }
        );
    }
}
