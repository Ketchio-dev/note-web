import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export async function GET(
    req: Request,
    context: { params: Promise<{ pageId: string }> }
) {
    try {
        const params = await context.params;
        const pageId = params.pageId;

        if (!pageId) {
            return NextResponse.json({ error: 'Page ID required' }, { status: 400 });
        }

        const pageRef = doc(db, 'pages', pageId);
        const pageSnap = await getDoc(pageRef);

        if (!pageSnap.exists()) {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 });
        }

        const pageData = pageSnap.data();

        // TODO: Add proper permission check via headers or session
        // For now, if it exists, return it, but in real app we check userId against permission

        // Mock permission check logic for 403
        // If query param 'userId' is provided and doesn't match owner/collaborator, return 403
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (userId) {
            const permissions = pageData.permissions || {};
            const isOwner = pageData.createdBy === userId || pageData.ownerId === userId;
            const isShared = permissions.shared?.[userId];
            const isPublic = permissions.generalAccess === 'public';

            if (!isOwner && !isShared && !isPublic) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        return NextResponse.json({ id: pageSnap.id, ...pageData });

    } catch (error: any) {
        console.error('Get Page Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: Request,
    context: { params: Promise<{ pageId: string }> }
) {
    try {
        const params = await context.params;
        const pageId = params.pageId;
        const body = await req.json();

        if (!pageId) {
            return NextResponse.json({ error: 'Page ID required' }, { status: 400 });
        }

        const pageRef = doc(db, 'pages', pageId);

        // Verify existence before update
        const pageSnap = await getDoc(pageRef);
        if (!pageSnap.exists()) {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 });
        }

        await updateDoc(pageRef, {
            ...body,
            updatedAt: serverTimestamp()
        });

        return NextResponse.json({ success: true, id: pageId });

    } catch (error: any) {
        console.error('Update Page Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ pageId: string }> }
) {
    try {
        const params = await context.params;
        const pageId = params.pageId;

        if (!pageId) {
            return NextResponse.json({ error: 'Page ID required' }, { status: 400 });
        }

        const pageRef = doc(db, 'pages', pageId);

        // Verify existence
        const pageSnap = await getDoc(pageRef);
        if (!pageSnap.exists()) {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 });
        }

        // Hard delete for now, or soft delete if 'trash' param passed
        // For simple compliance, we do deleteDoc
        await deleteDoc(pageRef);

        return NextResponse.json({ success: true, id: pageId });

    } catch (error: any) {
        console.error('Delete Page Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
