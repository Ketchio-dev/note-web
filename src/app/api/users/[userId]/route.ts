import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { toPlainJson } from '@/lib/server-json';

export async function GET(
    req: Request,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { userId } = await context.params;
        const db = getAdminFirestore();
        const userSnap = await db.collection('users').doc(userId).get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(toPlainJson({ id: userSnap.id, ...userSnap.data() }));
    } catch (error) {
        const err = error as Error;
        console.error('Get User Error:', error);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { userId } = await context.params;
        if (userId !== auth.user.uid) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const db = getAdminFirestore();
        await db.collection('users').doc(userId).delete();

        return NextResponse.json({ success: true, id: userId });
    } catch (error) {
        const err = error as Error;
        console.error('Delete User Error:', error);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
