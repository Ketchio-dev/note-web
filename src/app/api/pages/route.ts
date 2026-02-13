import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { toPlainJson } from '@/lib/server-json';

interface PagePermissions {
    owner?: string;
    shared?: Record<string, string>;
    generalAccess?: 'private' | 'public';
}

function canViewPage(page: Record<string, unknown>, uid: string): boolean {
    const permissions = (page.permissions || {}) as PagePermissions;
    const shared = permissions.shared || {};

    return (
        page.ownerId === uid
        || page.createdBy === uid
        || permissions.owner === uid
        || Boolean(shared[uid])
        || permissions.generalAccess === 'public'
    );
}

export async function GET(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspaceId');

        const db = getAdminFirestore();
        const snapshot = workspaceId
            ? await db.collection('pages').where('workspaceId', '==', workspaceId).get()
            : await db.collection('pages').where('createdBy', '==', auth.user.uid).get();

        const pages = snapshot.docs
            .map((pageDoc) => ({ id: pageDoc.id, ...pageDoc.data() }))
            .filter((page) => canViewPage(page as Record<string, unknown>, auth.user.uid))
            .map((page) => toPlainJson(page));

        return NextResponse.json({ pages });
    } catch (error) {
        const err = error as Error;
        console.error('List Pages Error:', error);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const body = await req.json() as {
            workspaceId?: string;
            title?: string;
            parentId?: string | null;
            type?: 'page' | 'database' | 'calendar';
            userId?: string;
            content?: string;
        };

        if (body.userId && body.userId !== auth.user.uid) {
            return NextResponse.json({ error: 'Forbidden: userId mismatch' }, { status: 403 });
        }

        const now = new Date();
        const db = getAdminFirestore();
        const pageRef = db.collection('pages').doc();

        const page = {
            id: pageRef.id,
            workspaceId: typeof body.workspaceId === 'string' && body.workspaceId.trim()
                ? body.workspaceId
                : 'default-workspace',
            parentId: body.parentId || null,
            title: body.title || 'Untitled',
            content: typeof body.content === 'string' ? body.content : '',
            type: body.type || 'page',
            section: 'workspace',
            createdBy: auth.user.uid,
            ownerId: auth.user.uid,
            properties: [],
            createdAt: now,
            updatedAt: now,
            font: 'default',
            fullWidth: false,
            smallText: false,
            locked: false,
            inTrash: false,
            order: Date.now(),
            permissions: {
                owner: auth.user.uid,
                shared: {},
                generalAccess: 'private',
            },
        };

        await pageRef.set(page);

        return NextResponse.json(toPlainJson(page), { status: 201 });
    } catch (error) {
        const err = error as Error;
        console.error('Create Page Error:', error);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
