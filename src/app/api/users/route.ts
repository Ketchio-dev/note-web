import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { toPlainJson } from '@/lib/server-json';

export async function GET(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const db = getAdminFirestore();
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email')?.toLowerCase();

        if (email) {
            const usersSnapshot = await db.collection('users').where('email', '==', email).limit(20).get();
            const users = usersSnapshot.docs.map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }));
            return NextResponse.json({ users: toPlainJson(users) });
        }

        const userDoc = await db.collection('users').doc(auth.user.uid).get();
        const user = userDoc.exists
            ? { id: userDoc.id, ...userDoc.data() }
            : { id: auth.user.uid, email: auth.user.email || null };

        return NextResponse.json({ users: [toPlainJson(user)] });
    } catch (error) {
        const err = error as Error;
        console.error('List Users Error:', error);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const body = await req.json() as {
            id?: string;
            email?: string;
            name?: string;
        };

        if (body.id && body.id !== auth.user.uid) {
            return NextResponse.json({ error: 'Forbidden: user id mismatch' }, { status: 403 });
        }

        const email = (body.email || auth.user.email || '').toLowerCase();
        if (!email) {
            return NextResponse.json({ error: 'email is required' }, { status: 400 });
        }

        const displayName = body.name || email.split('@')[0];
        const user = {
            id: auth.user.uid,
            email,
            name: displayName,
            displayName,
            updatedAt: new Date(),
        };

        const db = getAdminFirestore();
        await db.collection('users').doc(auth.user.uid).set(
            {
                uid: auth.user.uid,
                email,
                name: displayName,
                displayName,
                updatedAt: user.updatedAt,
                createdAt: new Date(),
            },
            { merge: true }
        );

        return NextResponse.json(toPlainJson(user), { status: 201 });
    } catch (error) {
        const err = error as Error;
        console.error('Create User Error:', error);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
