import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { canViewInvitation, InvitationData } from '@/lib/server-invitations';
import { toPlainJson } from '@/lib/server-json';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 });
        }

        const db = getAdminFirestore();
        const invitationSnap = await db.collection('invitations').doc(id).get();

        if (!invitationSnap.exists) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        const invitation = { id: invitationSnap.id, ...invitationSnap.data() } as InvitationData;
        if (!canViewInvitation(invitation, auth.user)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(toPlainJson(invitation));
    } catch (error) {
        const err = error as Error;
        console.error('Get Invitation Error:', error);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 });
        }

        const db = getAdminFirestore();
        const invitationRef = db.collection('invitations').doc(id);
        const invitationSnap = await invitationRef.get();

        if (!invitationSnap.exists) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        const invitation = { id: invitationSnap.id, ...invitationSnap.data() } as InvitationData;
        if (invitation.invitedBy !== auth.user.uid) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await invitationRef.delete();
        return NextResponse.json({ success: true });
    } catch (error) {
        const err = error as Error;
        console.error('Delete Invitation Error:', error);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
