import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

interface PagePermissions {
    owner: string;
    shared: Record<string, string>;
    generalAccess: 'private' | 'public';
}

type PageData = Record<string, unknown>;

function getPermissions(page: PageData, fallbackUid: string): PagePermissions {
    const raw = page.permissions;

    if (!raw || typeof raw !== 'object') {
        return {
            owner: (page.ownerId as string) || (page.createdBy as string) || fallbackUid,
            shared: {},
            generalAccess: 'private',
        };
    }

    const parsed = raw as Partial<PagePermissions>;
    return {
        owner: parsed.owner || (page.ownerId as string) || (page.createdBy as string) || fallbackUid,
        shared: parsed.shared || {},
        generalAccess: parsed.generalAccess || 'private',
    };
}

function canSharePage(page: PageData, uid: string): boolean {
    const permissions = getPermissions(page, uid);
    const sharedRole = permissions.shared[uid];

    return (
        permissions.owner === uid
        || page.ownerId === uid
        || page.createdBy === uid
        || sharedRole === 'editor'
        || sharedRole === 'owner'
        || sharedRole === 'admin'
    );
}

export async function POST(
    req: Request,
    context: { params: Promise<{ pageId: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (!auth.ok) {
            return auth.response;
        }

        const { email, role } = await req.json() as { email?: string; role?: string };
        const { pageId } = await context.params;

        if (!email || !role) {
            return NextResponse.json(
                { error: 'Email and role are required' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase();
        const db = getAdminFirestore();
        const pageRef = db.collection('pages').doc(pageId);
        const pageSnap = await pageRef.get();

        if (!pageSnap.exists) {
            return NextResponse.json(
                { error: 'Page not found' },
                { status: 404 }
            );
        }

        const page = pageSnap.data() as PageData;
        if (!canSharePage(page, auth.user.uid)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const usersQuery = await db
            .collection('users')
            .where('email', '==', normalizedEmail)
            .limit(1)
            .get();

        const invitedUserId = usersQuery.empty ? null : usersQuery.docs[0].id;
        const invitationRef = db.collection('invitations').doc();

        const invitation = {
            id: invitationRef.id,
            pageId,
            email: normalizedEmail,
            role,
            invitedBy: auth.user.uid,
            invitedAt: new Date(),
            accepted: false,
            workspaceId: (page.workspaceId as string) || 'default',
            pageTitle: (page.title as string) || 'Untitled',
            inviterName: auth.user.email || 'Someone',
            type: 'page',
            status: 'pending',
        };

        await invitationRef.set(invitation);

        if (invitedUserId) {
            const permissions = getPermissions(page, auth.user.uid);
            permissions.shared[invitedUserId] = role;

            await pageRef.set(
                {
                    permissions,
                    updatedAt: new Date(),
                },
                { merge: true }
            );
        }

        return NextResponse.json({
            success: true,
            message: invitedUserId ? 'User added to page' : 'Invitation sent via email',
            invitationId: invitationRef.id,
            userId: invitedUserId,
        });
    } catch (error) {
        const err = error as Error;
        console.error('Share API Error:', error);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
