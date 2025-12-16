/**
 * IndexedDB-based local storage for offline-first capability
 */

import { Page } from './workspace';

const DB_NAME = 'note-web-db';
const DB_VERSION = 1;
const PAGES_STORE = 'pages';
const QUEUE_STORE = 'pending-operations';

export interface PendingOperation {
    id: string;
    type: 'update' | 'create' | 'delete';
    pageId: string;
    data: any;
    timestamp: number;
    retryCount: number;
}

class LocalStore {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create pages store
                if (!db.objectStoreNames.contains(PAGES_STORE)) {
                    const pagesStore = db.createObjectStore(PAGES_STORE, { keyPath: 'id' });
                    pagesStore.createIndex('workspaceId', 'workspaceId', { unique: false });
                    pagesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }

                // Create pending operations queue
                if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                    const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
                    queueStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Save page to local cache
     */
    async savePage(page: Page): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([PAGES_STORE], 'readwrite');
            const store = transaction.objectStore(PAGES_STORE);
            const request = store.put({
                ...page,
                _cachedAt: Date.now(),
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get page from local cache
     */
    async getPage(pageId: string): Promise<Page | null> {
        await this.init();
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([PAGES_STORE], 'readonly');
            const store = transaction.objectStore(PAGES_STORE);
            const request = store.get(pageId);

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    // Remove cache metadata
                    delete result._cachedAt;
                    resolve(result);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all pages for a workspace
     */
    async getWorkspacePages(workspaceId: string): Promise<Page[]> {
        await this.init();
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([PAGES_STORE], 'readonly');
            const store = transaction.objectStore(PAGES_STORE);
            const index = store.index('workspaceId');
            const request = index.getAll(workspaceId);

            request.onsuccess = () => {
                const pages = request.result.map((p: any) => {
                    delete p._cachedAt;
                    return p;
                });
                resolve(pages);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Queue an operation for when we're back online
     */
    async queueOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        const op: PendingOperation = {
            ...operation,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            retryCount: 0,
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(QUEUE_STORE);
            const request = store.add(op);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all pending operations
     */
    async getPendingOperations(): Promise<PendingOperation[]> {
        await this.init();
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([QUEUE_STORE], 'readonly');
            const store = transaction.objectStore(QUEUE_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Remove operation from queue
     */
    async removeOperation(operationId: string): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(QUEUE_STORE);
            const request = store.delete(operationId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all cached data (for logout/cleanup)
     */
    async clear(): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([PAGES_STORE, QUEUE_STORE], 'readwrite');

            transaction.objectStore(PAGES_STORE).clear();
            transaction.objectStore(QUEUE_STORE).clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// Singleton instance
export const localStore = new LocalStore();

// Initialize on app start
if (typeof window !== 'undefined') {
    localStore.init().catch(error => {
        console.error('Failed to initialize local store:', error);
    });
}
