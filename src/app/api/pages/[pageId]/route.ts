import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { toPlainJson } from '@/lib/server-json';

interface PagePermissions {
    owner?: string;
    shared?: Record<string, string>;
    generalAccess?: 'private' | 'public';
}

type PageData = Record<string, unknown>;

function getPermissions(page: PageData): PagePermissions {
    const raw = page.permissions;

    if (!raw || typeof raw !== 'object') {
        return {
            owner: (page.ownerId as string) || (page.createdBy as string),
            shared: {},
            generalAccess: 'private',
        };
    }

    const permissions = raw as PagePermissions;
    return {
        owner: permissions.owner || (page.ownerId as string) || (page.createdBy as string),
        shared: permissions.shared || {},
        generalAccess: permissions.generalAccess || 'private',
    };
}

function canViewPage(page: PageData, uid: string): boolean {
    const permissions = getPermissions(page);
    return (
        page.ownerId === uid
        || page.createdBy === uid
        || permissions.owner === uid
        || Boolean(permissions.shared?.[uid])
        || permissions.generalAccess === 'public'
    );
}

function canEditPage(page: PageData, uid: string): boolean {
    const permissions = getPermissions(page);
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

function canDeletePage(page: PageData, uid: string): boolean {
    const permissions = getPermissions(page);
    return page.ownerId === uid || page.createdBy === uid || permissions.owner === uid;
}

function pickAllowedPageUpdates(body: Record<string, unknown>): Record<string, unknown> {
    const allowedFields = new Set([
        'title',
        'content',
        'parentId',
        'type',
        'icon',
        'cover',
        'section',
        'properties',
        'propertyValues',
        'savedViews',
        'font',
        'fullWidth',
        'smallText',
        'locked',
        'inTrash',
        'trashDate',
        'isFavorite',
        'order',
        'permissions',
    ]);

    const updates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(body)) {
        if (allowedFields.has(key)) {
            updates[key] = value;
        }
    }

    return updates;
}

async function getPageDoc(pageId: string) {
    const db = getAdminFirestore();
    const ref = db.collection('pages').doc(pageId);
    const snapshot = await ref.get();
    return { ref, snapshot };
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
        if (!pageId) {
            return NextResponse.json({ error: 'Page ID required' }, { status: 400 });
        }

        const { snapshot } = await getPageDoc(pageId);
        if (!snapshot.exists) {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 });
        }

        const page = { id: snapshot.id, ...snapshot.data() } as PageData;
        if (!canViewPage(page, auth.user.uid)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(toPlainJson(page));
    } catch (error) {
        const err = error as Error;
        console.error('Get Page Error:', error);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

async function updatePageHandler(
    req: Request,
    context: { params: Promise<{ pageId: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { pageId } = await context.params;
        if (!pageId) {
            return NextResponse.json({ error: 'Page ID required' }, { status: 400 });
        }

        const { ref, snapshot } = await getPageDoc(pageId);
        if (!snapshot.exists) {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 });
        }

        const existingPage = { id: snapshot.id, ...snapshot.data() } as PageData;
        if (!canEditPage(existingPage, auth.user.uid)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json() as Record<string, unknown>;
        if (body.userId && body.userId !== auth.user.uid) {
            return NextResponse.json({ error: 'Forbidden: userId mismatch' }, { status: 403 });
        }

        const updates = pickAllowedPageUpdates(body);
        const updatedAt = new Date();

        await ref.set(
            {
                ...updates,
                updatedAt,
            },
            { merge: true }
        );

        const updatedSnapshot = await ref.get();
        const updatedPage = { id: updatedSnapshot.id, ...updatedSnapshot.data() };

        return NextResponse.json(toPlainJson(updatedPage));
    } catch (error) {
        const err = error as Error;
        console.error('Update Page Error:', error);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    context: { params: Promise<{ pageId: string }> }
) {
    return updatePageHandler(req, context);
}

export async function PATCH(
    req: Request,
    context: { params: Promise<{ pageId: string }> }
) {
    return updatePageHandler(req, context);
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ pageId: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { pageId } = await context.params;
        if (!pageId) {
            return NextResponse.json({ error: 'Page ID required' }, { status: 400 });
        }

        const { ref, snapshot } = await getPageDoc(pageId);
        if (!snapshot.exists) {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 });
        }

        const page = { id: snapshot.id, ...snapshot.data() } as PageData;
        if (!canDeletePage(page, auth.user.uid)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await ref.delete();

        return NextResponse.json({ success: true, id: pageId });
    } catch (error) {
        const err = error as Error;
        console.error('Delete Page Error:', error);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
