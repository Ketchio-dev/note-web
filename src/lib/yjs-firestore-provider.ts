/**
 * Yjs Firestore Provider
 * Syncs Yjs document with Firestore for real-time collaboration
 */

import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    onSnapshot,
    addDoc,
    query,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
    where,
} from 'firebase/firestore';

interface FirestoreUpdate {
    data: string; // base64 encoded Yjs update
    timestamp: Timestamp;
    userId: string;
}

export class FirestoreYjsProvider {
    public ydoc: Y.Doc;
    public awareness: Awareness;
    private pageId: string;
    private userId: string;
    private unsubscribe: (() => void) | null = null;
    private synced = false;

    constructor(pageId: string, userId: string, ydoc?: Y.Doc) {
        this.pageId = pageId;
        this.userId = userId;
        this.ydoc = ydoc || new Y.Doc();
        this.awareness = new Awareness(this.ydoc);

        // Set user info in awareness
        this.awareness.setLocalStateField('user', {
            userId: this.userId,
            color: this.getUserColor(userId),
        });

        this.connect();
    }

    /**
     * Connect to Firestore and setup sync
     */
    private connect() {
        // Listen to local Yjs changes
        this.ydoc.on('update', this.handleLocalUpdate.bind(this));

        // Subscribe to Firestore updates
        this.subscribeToFirestore();
    }

    /**
     * Handle local Yjs document updates
     */
    private handleLocalUpdate = async (update: Uint8Array, origin: any) => {
        // Don't sync back updates that came from Firestore
        if (origin === 'firestore') return;

        try {
            // Encode update to base64
            const encoded = btoa(String.fromCharCode(...Array.from(update)));

            // Send to Firestore
            await addDoc(collection(db, `pages/${this.pageId}/yjs-updates`), {
                data: encoded,
                timestamp: serverTimestamp(),
                userId: this.userId,
            });
        } catch (error) {
            console.error('Failed to send update to Firestore:', error);
        }
    };

    /**
     * Subscribe to Firestore updates
     */
    private subscribeToFirestore() {
        const updatesRef = collection(db, `pages/${this.pageId}/yjs-updates`);
        const q = query(
            updatesRef,
            orderBy('timestamp', 'asc'),
            limit(100) // Last 100 updates
        );

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data() as FirestoreUpdate;

                    // Don't apply our own updates
                    if (data.userId === this.userId) return;

                    try {
                        // Decode from base64
                        const updateArray = Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0));

                        // Apply update with 'firestore' origin to prevent loop
                        Y.applyUpdate(this.ydoc, updateArray, 'firestore');

                        if (!this.synced) {
                            this.synced = true;
                            console.log('✅ Yjs document synced with Firestore');
                        }
                    } catch (error) {
                        console.error('Failed to apply Firestore update:', error);
                    }
                }
            });
        });
    }

    /**
     * Generate consistent color for user
     */
    private getUserColor(userId: string): string {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
            '#98D8C8', '#6C5CE7', '#A29BFE', '#FD79A8',
            '#FDCB6E', '#6C5CE7', '#00B894', '#00CEC9',
        ];

        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colors[Math.abs(hash) % colors.length];
    }

    /**
     * Disconnect from Firestore
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        this.ydoc.off('update', this.handleLocalUpdate);
        this.awareness.destroy();
    }
}

/**
 * Setup Yjs for a page with offline support
 */
export async function setupYjsForPage(pageId: string, userId: string) {
    const { IndexeddbPersistence } = await import('y-indexeddb');

    const ydoc = new Y.Doc();

    // IndexedDB persistence for offline support
    const indexeddbProvider = new IndexeddbPersistence(pageId, ydoc);

    await indexeddbProvider.whenSynced;
    console.log('✅ Yjs synced with IndexedDB');

    // Firestore provider for real-time sync
    const firestoreProvider = new FirestoreYjsProvider(pageId, userId, ydoc);

    return {
        ydoc,
        awareness: firestoreProvider.awareness,
        destroy: () => {
            indexeddbProvider.destroy();
            firestoreProvider.destroy();
        },
    };
}
