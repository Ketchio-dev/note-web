import { auth } from '@/lib/firebase';

async function getAuthToken(): Promise<string> {
    const user = auth.currentUser;

    if (!user) {
        throw new Error('Authentication required. Please sign in again.');
    }

    return user.getIdToken();
}

function needsJsonContentType(init: RequestInit): boolean {
    if (!init.method || init.method.toUpperCase() === 'GET') {
        return false;
    }

    return !(init.body instanceof FormData);
}

export async function fetchWithAuth(input: string, init: RequestInit = {}): Promise<Response> {
    const token = await getAuthToken();
    const headers = new Headers(init.headers || {});

    headers.set('Authorization', `Bearer ${token}`);

    if (needsJsonContentType(init) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(input, {
        ...init,
        headers,
    });
}
