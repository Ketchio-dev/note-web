import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { acceptInvitation } from '@/lib/server-invitations';
import { toPlainJson } from '@/lib/server-json';

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const body = await req.json() as {
            invitationId?: string;
            userId?: string;
        };

        if (!body.invitationId) {
            return NextResponse.json(
                { error: 'invitationId is required' },
                { status: 400 }
            );
        }

        if (body.userId && body.userId !== auth.user.uid) {
            return NextResponse.json({ error: 'Forbidden: userId mismatch' }, { status: 403 });
        }

        const invitation = await acceptInvitation(body.invitationId, auth.user);

        return NextResponse.json(toPlainJson({
            invitationId: invitation.id,
            workspaceId: invitation.workspaceId || null,
            pageId: invitation.pageId || null,
            role: invitation.role || 'viewer',
            status: invitation.status || 'accepted',
        }));
    } catch (error) {
        const err = error as Error;

        if (err.message === 'INVITATION_NOT_FOUND') {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        if (err.message === 'INVITATION_EMAIL_MISMATCH') {
            return NextResponse.json({ error: 'This invitation is not for your email' }, { status: 403 });
        }

        console.error('Accept Invitation Error:', error);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
