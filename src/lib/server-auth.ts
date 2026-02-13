import { DecodedIdToken } from 'firebase-admin/auth';
import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export interface AuthenticatedUser {
    uid: string;
    email?: string;
    token: DecodedIdToken;
}

export type AuthResult =
    | { ok: true; user: AuthenticatedUser }
    | { ok: false; response: NextResponse };

function unauthorized(message: string): NextResponse {
    return NextResponse.json(
        { error: message },
        { status: 401 }
    );
}

function extractBearerToken(req: Request): string | null {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
        return null;
    }

    if (!authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.slice(7).trim();
    return token || null;
}

export async function requireAuth(req: Request): Promise<AuthResult> {
    const token = extractBearerToken(req);

    if (!token) {
        return {
            ok: false,
            response: unauthorized('Authorization token required. Please reauthenticate.'),
        };
    }

    try {
        const decoded = await getAdminAuth().verifyIdToken(token);

        return {
            ok: true,
            user: {
                uid: decoded.uid,
                email: decoded.email,
                token: decoded,
            },
        };
    } catch (error) {
        console.error('[Auth] Failed to verify Firebase ID token:', error);
        return {
            ok: false,
            response: unauthorized('Invalid or expired token. Please reauthenticate.'),
        };
    }
}
