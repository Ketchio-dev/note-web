/**
 * Offline Operation Queue
 * Queues operations when offline and processes them when online
 */

export interface QueuedOperation {
    id: string;
    type: 'block-create' | 'block-update' | 'block-delete' | 'page-update';
    timestamp: number;
    retryCount: number;
    data: any;
    pageId?: string;
    blockId?: string;
}

class OfflineQueue {
    private db: IDBDatabase | null = null;
    private processing = false;
    private initPromise: Promise<void> | null = null;
    private readonly DB_NAME = 'offline-queue-db';
    private readonly STORE_NAME = 'operations';
    private readonly FAILED_STORE = 'failed-operations';

    async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.setupOnlineListener();
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.FAILED_STORE)) {
                    db.createObjectStore(this.FAILED_STORE, { keyPath: 'id' });
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Setup listener for online/offline events
     */
    private setupOnlineListener() {
        window.addEventListener('online', () => {
            console.log('🌐 Back online - processing queue');
            this.processQueue();
        });

        window.addEventListener('offline', () => {
            console.log('📴 Offline - operations will be queued');
        });
    }

    /**
     * Add operation to queue
     */
    async enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('DB not initialized');

        const queuedOp: QueuedOperation = {
            ...operation,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            retryCount: 0,
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.add(queuedOp);

            request.onsuccess = () => {
                console.log('✅ Operation queued:', operation.type);
                resolve();

                // Try to process immediately if online
                if (navigator.onLine) {
                    this.processQueue();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Process all queued operations
     */
    async processQueue(): Promise<void> {
        if (this.processing || !navigator.onLine) return;

        await this.init();
        if (!this.db) return;

        this.processing = true;
        console.log('🔄 Processing offline queue...');

        try {
            const operations = await this.getAllOperations();
            console.log(`📋 Found ${operations.length} queued operations`);

            for (const op of operations) {
                try {
                    await this.executeOperation(op);
                    await this.removeOperation(op.id);
                    console.log('✅ Processed:', op.type, op.id);
                } catch (error) {
                    console.error('❌ Failed to process operation:', op, error);

                    if (this.isPermanentError(error)) {
                        await this.moveToFailed(op);
                        await this.removeOperation(op.id);
                    } else {
                        // Increment retry count
                        await this.updateRetryCount(op.id, op.retryCount + 1);

                        // Stop processing if too many retries
                        if (op.retryCount >= 3) {
                            await this.moveToFailed(op);
                            await this.removeOperation(op.id);
                        } else {
                            break; // Retry later
                        }
                    }
                }
            }
        } finally {
            this.processing = false;
            console.log('✅ Queue processing complete');
        }
    }

    /**
     * Execute a single operation
     */
    private async executeOperation(op: QueuedOperation): Promise<void> {
        // Import operations dynamically to avoid circular dependencies
        const { updateBlockInFirestore, createBlockInFirestore, deleteBlock } = await import('./block-operations');
        const { updatePage } = await import('./workspace');

        switch (op.type) {
            case 'block-create':
                await createBlockInFirestore(
                    op.data.type,
                    op.data.pageId,
                    op.data.userId,
                    op.data.content,
                    op.data.parentId,
                    op.data.position
                );
                break;

            case 'block-update':
                await updateBlockInFirestore(op.blockId!, op.data.updates, op.data.userId);
                break;

            case 'block-delete':
                await deleteBlock(op.blockId!);
                break;

            case 'page-update':
                await updatePage(op.pageId!, op.data);
                break;

            default:
                throw new Error(`Unknown operation type: ${(op as any).type}`);
        }
    }

    /**
     * Get all queued operations
     */
    private async getAllOperations(): Promise<QueuedOperation[]> {
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const index = store.index('timestamp');
            const request = index.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Remove operation from queue
     */
    private async removeOperation(id: string): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update retry count
     */
    private async updateRetryCount(id: string, retryCount: number): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const op = getRequest.result;
                if (op) {
                    op.retryCount = retryCount;
                    store.put(op);
                }
                resolve();
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Move operation to failed store
     */
    private async moveToFailed(op: QueuedOperation): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.FAILED_STORE], 'readwrite');
            const store = transaction.objectStore(this.FAILED_STORE);
            const request = store.put({ ...op, failedAt: Date.now() });

            request.onsuccess = () => {
                console.error('⚠️ Operation permanently failed:', op);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Check if error is permanent (shouldn't retry)
     */
    private isPermanentError(error: any): boolean {
        // Firestore permission errors, not found, etc.
        const message = error?.message || String(error);
        return (
            message.includes('permission') ||
            message.includes('not found') ||
            message.includes('invalid')
        );
    }

    /**
     * Get queue status
     */
    async getStatus(): Promise<{ pending: number; failed: number }> {
        await this.init();
        if (!this.db) return { pending: 0, failed: 0 };

        const pending = await this.getAllOperations();

        const failed = await new Promise<QueuedOperation[]>((resolve, reject) => {
            const transaction = this.db!.transaction([this.FAILED_STORE], 'readonly');
            const store = transaction.objectStore(this.FAILED_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        return {
            pending: pending.length,
            failed: failed.length,
        };
    }

    /**
     * Clear all queues (for testing/debugging)
     */
    async clearAll(): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME, this.FAILED_STORE], 'readwrite');

            transaction.objectStore(this.STORE_NAME).clear();
            transaction.objectStore(this.FAILED_STORE).clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();

// Initialize on app start
if (typeof window !== 'undefined') {
    offlineQueue.init().catch(error => {
        console.error('Failed to initialize offline queue:', error);
    });
}
