import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { toPlainJson } from '@/lib/server-json';

interface WorkspaceData {
    ownerId?: string;
    members?: string[];
    memberRoles?: Record<string, string[]>;
}

function isMember(workspace: WorkspaceData, uid: string): boolean {
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
            return NextResponse.json([], { status: 200 });
        }

        const workspace = workspaceSnap.data() as WorkspaceData;
        if (!isMember(workspace, auth.user.uid)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const members = Array.isArray(workspace.members) ? workspace.members : [];
        const memberRoles = workspace.memberRoles || {};

        const result = members.map((userId) => ({
            userId,
            permissions: memberRoles[userId] || ['read'],
        }));

        return NextResponse.json(toPlainJson(result));
    } catch (error) {
        const err = error as Error;
        console.error('Workspace Members Error:', error);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
