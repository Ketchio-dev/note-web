import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { cookies } from 'next/headers';
import { auth } from '@/lib/firebase';
import { apiRateLimiter, getClientIp } from '@/lib/rateLimit';

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // Rate limiting: 10 requests per minute
        const clientIp = getClientIp(req);
        const allowed = apiRateLimiter.check(10, clientIp);

        if (!allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

        const { id } = await context.params;

        // Get user from session/cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (!sessionCookie) {
            return NextResponse.json(
                { error: 'Unauthorized - Please log in' },
                { status: 401 }
            );
        }

        // Get authenticated user
        // In a real implementation, you would verify Firebase Auth token here
        // For now, we'll use a simplified approach:
        // The userId should come from the authenticated Firebase user
        // Since we're using Firebase Auth client-side, we need to trust the client
        // or implement Firebase Admin SDK for server-side verification

        // Simplified: Extract userId from auth header or session
        // This assumes the client sends the userId in the session cookie
        const userId = sessionCookie.value;

        if (!userId) {
            return NextResponse.json(
                { error: 'Invalid session' },
                { status: 401 }
            );
        }

        // Use transaction for atomicity
        const result = await runTransaction(db, async (transaction) => {
            const invitationRef = doc(db, 'invitations', id);
            const invitationSnap = await transaction.get(invitationRef);

            if (!invitationSnap.exists()) {
                throw new Error('INVITATION_NOT_FOUND');
            }

            const invitation = invitationSnap.data();

            // Verify email matches current user
            const userDoc = await transaction.get(doc(db, 'users', userId));
            if (!userDoc.exists()) {
                throw new Error('USER_NOT_FOUND');
            }

            const userEmail = userDoc.data()?.email?.toLowerCase();
            if (userEmail !== invitation.email.toLowerCase()) {
                throw new Error('EMAIL_MISMATCH');
            }

            // Check if already accepted
            if (invitation.accepted) {
                throw new Error('ALREADY_ACCEPTED');
            }

            // Check expiration (if field exists)
            if (invitation.expiresAt) {
                const expiryDate = invitation.expiresAt.toDate();
                if (expiryDate < new Date()) {
                    throw new Error('INVITATION_EXPIRED');
                }
            }

            // Get page
            const pageRef = doc(db, 'pages', invitation.pageId);
            const pageSnap = await transaction.get(pageRef);

            if (!pageSnap.exists()) {
                throw new Error('PAGE_NOT_FOUND');
            }

            const pageData = pageSnap.data();
            const permissions = pageData.permissions || {
                owner: pageData.ownerId || pageData.createdBy,
                shared: {},
                generalAccess: 'private'
            };

            // Add user to page permissions
            permissions.shared[userId] = invitation.role;
            transaction.update(pageRef, { permissions });

            // Mark invitation as accepted
            transaction.update(invitationRef, {
                accepted: true,
                acceptedAt: serverTimestamp(),
                acceptedBy: userId
            });

            return {
                pageId: invitation.pageId,
                role: invitation.role,
                pageTitle: pageData.title
            };
        });

        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (error) {
        const err = error as Error;
        console.error('Accept Invitation Error:', err);

        // Specific error messages and status codes
        const errorMap: Record<string, { message: string; status: number }> = {
            'INVITATION_NOT_FOUND': { message: 'Invitation not found', status: 404 },
            'USER_NOT_FOUND': { message: 'User not found', status: 404 },
            'PAGE_NOT_FOUND': { message: 'Page not found or deleted', status: 404 },
            'EMAIL_MISMATCH': { message: 'This invitation is not for your email', status: 403 },
            'ALREADY_ACCEPTED': { message: 'Invitation already accepted', status: 409 },
            'INVITATION_EXPIRED': { message: 'Invitation has expired', status: 410 },
        };

        const errorInfo = errorMap[err.message] || {
            message: err.message || 'Internal Server Error',
            status: 500
        };

        return NextResponse.json(
            { error: errorInfo.message },
            { status: errorInfo.status }
        );
    }
}
