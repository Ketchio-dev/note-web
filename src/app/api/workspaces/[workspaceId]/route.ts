import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { toPlainJson } from '@/lib/server-json';

type WorkspaceData = {
    ownerId?: string;
    members?: string[];
    [key: string]: unknown;
};

function isWorkspaceMember(workspace: WorkspaceData, uid: string): boolean {
    const members = Array.isArray(workspace.members) ? workspace.members : [];
    return workspace.ownerId === uid || members.includes(uid);
}

export async function GET(
    req: Request,
    context: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { workspaceId } = await context.params;
        const db = getAdminFirestore();
        const workspaceRef = db.collection('workspaces').doc(workspaceId);
        const workspaceSnap = await workspaceRef.get();

        if (!workspaceSnap.exists) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        const workspace = { id: workspaceSnap.id, ...workspaceSnap.data() } as WorkspaceData;
        if (!isWorkspaceMember(workspace, auth.user.uid)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(toPlainJson(workspace));
    } catch (error) {
        const err = error as Error;
        console.error('Get Workspace Error:', error);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { workspaceId } = await context.params;
        const db = getAdminFirestore();
        const workspaceRef = db.collection('workspaces').doc(workspaceId);
        const workspaceSnap = await workspaceRef.get();

        if (!workspaceSnap.exists) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        const workspace = workspaceSnap.data() as WorkspaceData;
        if (workspace.ownerId !== auth.user.uid) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await workspaceRef.delete();

        return NextResponse.json({ success: true, id: workspaceId });
    } catch (error) {
        const err = error as Error;
        console.error('Delete Workspace Error:', error);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
