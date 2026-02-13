import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        await req.json();

        return NextResponse.json({
            success: true,
            message: 'Sync initialized',
            docId: `sync-${auth.user.uid}-${Date.now()}`,
        });
    } catch (error) {
        const err = error as Error;
        console.error('Sync Error:', error);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
