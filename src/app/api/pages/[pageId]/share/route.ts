import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';

export async function POST(
    req: Request,
    context: { params: Promise<{ pageId: string }> }
) {
    try {
        const { email, role } = await req.json();
        const { pageId } = await context.params;

        if (!email || !role) {
            return NextResponse.json(
                { error: 'Email and role are required' },
                { status: 400 }
            );
        }

        const pageRef = doc(db, 'pages', pageId);
        const pageSnap = await getDoc(pageRef);

        if (!pageSnap.exists()) {
            return NextResponse.json(
                { error: 'Page not found' },
                { status: 404 }
            );
        }

        const pageData = pageSnap.data();

        // Check if user exists (optional - we can invite unregistered users)
        const userQuery = query(
            collection(db, 'users'),
            where('email', '==', email.toLowerCase())
        );
        const userSnapshot = await getDocs(userQuery);

        let invitedUserId = null;
        if (!userSnapshot.empty) {
            // User is already registered
            invitedUserId = userSnapshot.docs[0].id;
        }

        // Create invitation record
        const invitation = {
            pageId,
            email: email.toLowerCase(),
            role,
            invitedBy: 'current-user-id', // TODO: Get from auth
            invitedAt: serverTimestamp(),
            accepted: false,
            workspaceId: pageData.workspaceId || 'default'
        };

        const invitationRef = await addDoc(collection(db, 'invitations'), invitation);

        // If user exists, also update page permissions
        if (invitedUserId) {
            const permissions = pageData.permissions || {
                owner: pageData.createdBy || pageData.ownerId,
                shared: {},
                generalAccess: 'private'
            };

            permissions.shared = {
                ...permissions.shared,
                [invitedUserId]: role
            };

            await updateDoc(pageRef, { permissions });
        }

        // TODO: Send email notification
        // await sendInvitationEmail({
        //     to: email,
        //     inviterName: 'Current User',
        //     pageTitle: pageData.title,
        //     pageId,
        //     role,
        //     invitationId: invitationRef.id
        // });

        return NextResponse.json({
            success: true,
            message: invitedUserId
                ? 'User added to page'
                : 'Invitation sent via email',
            invitationId: invitationRef.id,
            userId: invitedUserId
        });
    } catch (error: any) {
        console.error('Share API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
