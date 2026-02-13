import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { toPlainJson } from '@/lib/server-json';

interface WorkspaceData {
    ownerId?: string;
    members?: string[];
    memberRoles?: Record<string, string[]>;
}

interface PagePermissions {
    owner?: string;
    shared?: Record<string, string>;
}

function canInviteToWorkspace(workspace: WorkspaceData, uid: string): boolean {
    const members = Array.isArray(workspace.members) ? workspace.members : [];
    const role = workspace.memberRoles?.[uid] || [];

    return workspace.ownerId === uid || members.includes(uid) || role.includes('admin') || role.includes('write');
}

function canInviteToPage(page: Record<string, unknown>, uid: string): boolean {
    const permissions = (page.permissions || {}) as PagePermissions;
    const role = permissions.shared?.[uid];

    return (
        page.ownerId === uid
        || page.createdBy === uid
        || permissions.owner === uid
        || role === 'editor'
        || role === 'owner'
        || role === 'admin'
    );
}

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const body = await req.json() as {
            pageId?: string;
            workspaceId?: string;
            email?: string;
            role?: string;
            invitedBy?: string;
        };

        if (body.invitedBy && body.invitedBy !== auth.user.uid) {
            return NextResponse.json({ error: 'Forbidden: invitedBy mismatch' }, { status: 403 });
        }

        if (!body.email || (!body.pageId && !body.workspaceId)) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (body.pageId && body.workspaceId) {
            return NextResponse.json({ error: 'Provide either pageId or workspaceId, not both' }, { status: 400 });
        }

        const db = getAdminFirestore();
        const normalizedEmail = body.email.toLowerCase();

        if (body.workspaceId) {
            const workspaceRef = db.collection('workspaces').doc(body.workspaceId);
            const workspaceSnap = await workspaceRef.get();

            if (!workspaceSnap.exists) {
                return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
            }

            const workspace = workspaceSnap.data() as WorkspaceData;
            if (!canInviteToWorkspace(workspace, auth.user.uid)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        if (body.pageId) {
            const pageRef = db.collection('pages').doc(body.pageId);
            const pageSnap = await pageRef.get();

            if (!pageSnap.exists) {
                return NextResponse.json({ error: 'Page not found' }, { status: 404 });
            }

            const page = pageSnap.data() as Record<string, unknown>;
            if (!canInviteToPage(page, auth.user.uid)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const invitationRef = db.collection('invitations').doc();
        const now = new Date();

        const invitation = {
            id: invitationRef.id,
            type: body.workspaceId ? 'workspace' : 'page',
            pageId: body.pageId,
            workspaceId: body.workspaceId,
            email: normalizedEmail,
            role: body.role || 'member',
            invitedBy: auth.user.uid,
            status: 'pending',
            accepted: false,
            invitedAt: now,
            createdAt: now,
            updatedAt: now,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };

        await invitationRef.set(invitation);

        return NextResponse.json(toPlainJson(invitation), { status: 201 });
    } catch (error) {
        const err = error as Error;
        console.error('Create Invitation Error:', error);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
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

        const db = getAdminFirestore();
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspaceId');

        if (workspaceId) {
            const workspaceSnap = await db.collection('workspaces').doc(workspaceId).get();
            if (!workspaceSnap.exists) {
                return NextResponse.json({ invitations: [] });
            }

            const workspace = workspaceSnap.data() as WorkspaceData;
            if (!canInviteToWorkspace(workspace, auth.user.uid)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const snapshot = await db.collection('invitations').where('workspaceId', '==', workspaceId).get();
            const invitations = snapshot.docs.map((invitationDoc) => ({ id: invitationDoc.id, ...invitationDoc.data() }));
            return NextResponse.json({ invitations: toPlainJson(invitations) });
        }

        const invitationsByInviter = await db.collection('invitations').where('invitedBy', '==', auth.user.uid).get();

        const invitationsByEmail = auth.user.email
            ? await db.collection('invitations').where('email', '==', auth.user.email.toLowerCase()).get()
            : null;

        const map = new Map<string, Record<string, unknown>>();

        for (const invitationDoc of invitationsByInviter.docs) {
            map.set(invitationDoc.id, { id: invitationDoc.id, ...invitationDoc.data() });
        }

        if (invitationsByEmail) {
            for (const invitationDoc of invitationsByEmail.docs) {
                map.set(invitationDoc.id, { id: invitationDoc.id, ...invitationDoc.data() });
            }
        }

        return NextResponse.json({ invitations: toPlainJson([...map.values()]) });
    } catch (error) {
        const err = error as Error;
        console.error('List Invitations Error:', error);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
