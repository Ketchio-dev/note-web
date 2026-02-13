import { NextResponse } from 'next/server';
import { apiRateLimiter, getClientIp } from '@/lib/rateLimit';
import { requireAuth } from '@/lib/server-auth';
import { rejectInvitation } from '@/lib/server-invitations';

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const clientIp = getClientIp(req);
        const allowed = apiRateLimiter.check(10, clientIp);

        if (!allowed) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429 }
            );
        }

        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { id } = await context.params;
        const body = await req.json() as { userId?: string };

        if (body.userId && body.userId !== auth.user.uid) {
            return NextResponse.json({ error: 'Forbidden: userId mismatch' }, { status: 403 });
        }

        await rejectInvitation(id, auth.user);

        return NextResponse.json({
            success: true,
            message: 'Invitation rejected successfully',
        });
    } catch (error) {
        const err = error as Error;
        console.error('Reject invitation error:', err);

        if (err.message === 'INVITATION_NOT_FOUND') {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        if (err.message === 'INVITATION_EMAIL_MISMATCH') {
            return NextResponse.json({ error: 'This invitation is not for your email' }, { status: 403 });
        }

        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
