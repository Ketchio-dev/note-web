import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { cookies } from 'next/headers';
import { apiRateLimiter, getClientIp } from '@/lib/rateLimit';

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // Rate limiting
        const clientIp = getClientIp(req);
        const allowed = apiRateLimiter.check(10, clientIp);

        if (!allowed) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429 }
            );
        }

        const { id } = await context.params;

        // Get user from session
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (!sessionCookie) {
            return NextResponse.json(
                { error: 'Unauthorized - Please log in' },
                { status: 401 }
            );
        }

        // Get authenticated user ID from session
        const userId = sessionCookie.value;

        if (!userId) {
            return NextResponse.json(
                { error: 'Invalid session' },
                { status: 401 }
            );
        }

        // Get invitation
        const invitationRef = doc(db, 'invitations', id);
        const invitationSnap = await getDoc(invitationRef);

        if (!invitationSnap.exists()) {
            return NextResponse.json(
                { error: 'Invitation not found' },
                { status: 404 }
            );
        }

        const invitation = invitationSnap.data();

        // Verify email matches
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const userEmail = userDoc.data()?.email?.toLowerCase();
        if (userEmail !== invitation.email.toLowerCase()) {
            return NextResponse.json(
                { error: 'This invitation is not for your email' },
                { status: 403 }
            );
        }

        // Delete invitation
        await deleteDoc(invitationRef);

        return NextResponse.json({
            success: true,
            message: 'Invitation rejected successfully'
        });

    } catch (error) {
        const err = error as Error;
        console.error('Reject invitation error:', err);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
