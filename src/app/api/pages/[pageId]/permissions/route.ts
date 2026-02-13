import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { toPlainJson } from '@/lib/server-json';

interface PagePermissions {
    owner: string;
    shared: Record<string, string>;
    generalAccess: 'private' | 'public';
}

type PageDocData = Record<string, unknown>;

function getNormalizedPermissions(page: PageDocData, uidFallback: string): PagePermissions {
    const raw = page.permissions;

    if (!raw || typeof raw !== 'object') {
        return {
            owner: (page.ownerId as string) || (page.createdBy as string) || uidFallback,
            shared: {},
            generalAccess: 'private',
        };
    }

    const parsed = raw as Partial<PagePermissions>;

    return {
        owner: parsed.owner || (page.ownerId as string) || (page.createdBy as string) || uidFallback,
        shared: parsed.shared || {},
        generalAccess: parsed.generalAccess || 'private',
    };
}

function canEditPermissions(page: PageDocData, uid: string): boolean {
    const permissions = getNormalizedPermissions(page, uid);
    const sharedRole = permissions.shared[uid];

    return (
        permissions.owner === uid
        || page.ownerId === uid
        || page.createdBy === uid
        || sharedRole === 'owner'
        || sharedRole === 'admin'
    );
}

export async function GET(
    req: Request,
    context: { params: Promise<{ pageId: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { pageId } = await context.params;
        const db = getAdminFirestore();
        const pageRef = db.collection('pages').doc(pageId);
        const pageSnap = await pageRef.get();

        if (!pageSnap.exists) {
            return NextResponse.json(
                { error: 'Page not found' },
                { status: 404 }
            );
        }

        const page = pageSnap.data() as PageDocData;
        const permissions = getNormalizedPermissions(page, auth.user.uid);
        const canRead = canEditPermissions(page, auth.user.uid) || permissions.shared[auth.user.uid] || permissions.generalAccess === 'public';

        if (!canRead) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({ permissions: toPlainJson(permissions) });
    } catch (error) {
        const err = error as Error;
        console.error('Get Permissions Error:', error);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    req: Request,
    context: { params: Promise<{ pageId: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { userId, role } = await req.json() as { userId?: string; role?: string | null };
        const { pageId } = await context.params;

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const db = getAdminFirestore();
        const pageRef = db.collection('pages').doc(pageId);
        const pageSnap = await pageRef.get();

        if (!pageSnap.exists) {
            return NextResponse.json(
                { error: 'Page not found' },
                { status: 404 }
            );
        }

        const page = pageSnap.data() as PageDocData;
        if (!canEditPermissions(page, auth.user.uid)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const permissions = getNormalizedPermissions(page, auth.user.uid);

        if (role === null) {
            delete permissions.shared[userId];
        } else {
            permissions.shared[userId] = role || 'viewer';
        }

        await pageRef.set(
            {
                permissions,
                updatedAt: new Date(),
            },
            { merge: true }
        );

        return NextResponse.json({ success: true, permissions: toPlainJson(permissions) });
    } catch (error) {
        const err = error as Error;
        console.error('Update Permissions Error:', error);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
