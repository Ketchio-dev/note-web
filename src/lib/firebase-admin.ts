import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

const REQUIRED_ENV_VARS = [
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PRIVATE_KEY',
] as const;

type RequiredAdminEnvKey = (typeof REQUIRED_ENV_VARS)[number];

type AdminEnv = Record<RequiredAdminEnvKey, string>;

function normalizePrivateKey(value: string): string {
    const withoutWrappingQuotes = value.replace(/^"|"$/g, '');
    return withoutWrappingQuotes.replace(/\\n/g, '\n');
}

function loadAdminEnv(): AdminEnv {
    const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        const message = `[Firebase Admin] Missing required environment variables: ${missing.join(', ')}`;
        console.error(message);
        throw new Error(message);
    }

    return {
        FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID as string,
        FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL as string,
        FIREBASE_ADMIN_PRIVATE_KEY: normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY as string),
    };
}

export function getFirebaseAdminApp(): App {
    const existing = getApps()[0];
    if (existing) {
        return existing;
    }

    const env = loadAdminEnv();

    return initializeApp({
        credential: cert({
            projectId: env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY,
        }),
        projectId: env.FIREBASE_ADMIN_PROJECT_ID,
    });
}

export function getAdminAuth(): Auth {
    return getAuth(getFirebaseAdminApp());
}

export function getAdminFirestore(): Firestore {
    return getFirestore(getFirebaseAdminApp());
}
