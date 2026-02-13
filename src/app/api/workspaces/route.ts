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
        const [ownedSnapshot, memberSnapshot] = await Promise.all([
            db.collection('workspaces').where('ownerId', '==', auth.user.uid).get(),
            db.collection('workspaces').where('members', 'array-contains', auth.user.uid).get(),
        ]);

        const workspaceMap = new Map<string, Record<string, unknown>>();

        for (const workspaceDoc of [...ownedSnapshot.docs, ...memberSnapshot.docs]) {
            workspaceMap.set(workspaceDoc.id, {
                id: workspaceDoc.id,
                ...workspaceDoc.data(),
            });
        }

        return NextResponse.json({
            workspaces: [...workspaceMap.values()].map((workspace) => toPlainJson(workspace)),
        });
    } catch (error) {
        const err = error as Error;
        console.error('List Workspaces Error:', error);
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
            name?: string;
            ownerId?: string;
        };

        if (body.ownerId && body.ownerId !== auth.user.uid) {
            return NextResponse.json({ error: 'Forbidden: ownerId mismatch' }, { status: 403 });
        }

        const now = new Date();
        const db = getAdminFirestore();
        const workspaceRef = db.collection('workspaces').doc();

        const workspace = {
            id: workspaceRef.id,
            name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled Workspace',
            ownerId: auth.user.uid,
            members: [auth.user.uid],
            memberRoles: {
                [auth.user.uid]: ['admin', 'write', 'read'],
            },
            createdAt: now,
            updatedAt: now,
        };

        await workspaceRef.set(workspace);

        return NextResponse.json(toPlainJson(workspace), { status: 201 });
    } catch (error) {
        const err = error as Error;
        console.error('Create Workspace Error:', error);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
