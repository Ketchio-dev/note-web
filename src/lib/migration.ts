/**
 * Page Migration Utility
 * Converts existing HTML/Markdown pages to Block-based system
 */

import { db } from './firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc } from 'firebase/firestore';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Block, createBlock, JSONContent } from './block-model';
import { tiptapDocToBlocks } from './block-tiptap-bridge';

/**
 * Check if a page has been migrated
 */
export async function isPageMigrated(pageId: string): Promise<boolean> {
    const pageRef = doc(db, 'pages', pageId);
    const pageDoc = await getDoc(pageRef);

    if (!pageDoc.exists()) return false;

    const data = pageDoc.data();
    return data.migrated === true;
}

/**
 * Get blocks for a page
 */
export async function getPageBlocks(pageId: string): Promise<Block[]> {
    const blocksRef = collection(db, 'blocks');
    const q = query(blocksRef, where('page_id', '==', pageId));
    const snapshot = await getDocs(q);

    const blocks: Block[] = [];
    snapshot.forEach((doc) => {
        blocks.push({ id: doc.id, ...doc.data() } as Block);
    });

    // Sort by position
    blocks.sort((a, b) => a.position.localeCompare(b.position));

    return blocks;
}

/**
 * Convert HTML content to Blocks
 */
export function htmlToBlocks(
    html: string,
    pageId: string,
    userId: string
): Block[] {
    if (!html || html.trim() === '') {
        // Create a default empty paragraph block
        return [createBlock('paragraph', pageId, userId)];
    }

    try {
        // Create temporary editor to parse HTML
        const editor = new Editor({
            extensions: [
                StarterKit.configure({
                    heading: { levels: [1, 2, 3] },
                }),
            ],
            content: html,
        });

        // Get JSON from editor
        const doc = editor.getJSON();

        // Destroy editor
        editor.destroy();

        // Convert Tiptap JSON to Blocks
        const partialBlocks = tiptapDocToBlocks(doc, pageId, userId);

        // Complete the blocks with required fields
        const blocks: Block[] = partialBlocks.map((partial, index) => {
            const block = createBlock(
                partial.type || 'paragraph',
                pageId,
                userId,
                partial.content,
                partial.parent_id,
                partial.position || generatePosition(index)
            );

            // Merge any additional properties
            return {
                ...block,
                ...partial,
                properties: partial.properties || {},
            };
        });

        return blocks.length > 0 ? blocks : [createBlock('paragraph', pageId, userId)];
    } catch (error) {
        console.error('Failed to parse HTML:', error);
        // Fallback: create a single paragraph with plain text
        const plainText = html.replace(/<[^>]*>/g, '').trim();
        return [
            createBlock('paragraph', pageId, userId, {
                type: 'paragraph',
                content: [
                    {
                        type: 'text',
                        text: plainText || 'Empty page',
                    },
                ],
            }),
        ];
    }
}

/**
 * Generate fractional index position
 */
function generatePosition(index: number): string {
    const base62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    let num = index;

    if (num === 0) return 'a0';

    while (num > 0) {
        result = base62[num % 62] + result;
        num = Math.floor(num / 62);
    }

    return 'a' + result;
}

/**
 * Migrate a single page to block system
 */
export async function migratePage(pageId: string, userId: string): Promise<{
    success: boolean;
    blocksCreated: number;
    error?: string;
}> {
    try {
        // Check if already migrated
        if (await isPageMigrated(pageId)) {
            return {
                success: true,
                blocksCreated: 0,
                error: 'Page already migrated',
            };
        }

        // Get page data
        const pageRef = doc(db, 'pages', pageId);
        const pageDoc = await getDoc(pageRef);

        if (!pageDoc.exists()) {
            return {
                success: false,
                blocksCreated: 0,
                error: 'Page not found',
            };
        }

        const pageData = pageDoc.data();
        const htmlContent = pageData.content || '';

        // Convert HTML to blocks
        const blocks = htmlToBlocks(htmlContent, pageId, userId);

        // Save blocks to Firestore
        for (const block of blocks) {
            const blockRef = doc(db, 'blocks', block.id);
            await setDoc(blockRef, block);
        }

        // Mark page as migrated
        await updateDoc(pageRef, {
            migrated: true,
            migratedAt: new Date(),
            migratedBy: userId,
        });

        return {
            success: true,
            blocksCreated: blocks.length,
        };
    } catch (error) {
        console.error('Migration failed:', error);
        return {
            success: false,
            blocksCreated: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Migrate all pages in a workspace
 */
export async function migrateWorkspace(
    workspaceId: string,
    userId: string,
    onProgress?: (current: number, total: number, pageTitle: string) => void
): Promise<{
    success: boolean;
    totalPages: number;
    migratedPages: number;
    skippedPages: number;
    failedPages: number;
    errors: { pageId: string; title: string; error: string }[];
}> {
    const results = {
        success: true,
        totalPages: 0,
        migratedPages: 0,
        skippedPages: 0,
        failedPages: 0,
        errors: [] as { pageId: string; title: string; error: string }[],
    };

    try {
        // Get all pages in workspace
        const pagesRef = collection(db, 'pages');
        const q = query(pagesRef, where('workspaceId', '==', workspaceId));
        const snapshot = await getDocs(q);

        results.totalPages = snapshot.size;

        let current = 0;
        for (const pageDoc of snapshot.docs) {
            current++;
            const pageData = pageDoc.data();
            const pageId = pageDoc.id;
            const pageTitle = pageData.title || 'Untitled';

            onProgress?.(current, results.totalPages, pageTitle);

            // Skip database pages (they don't need migration)
            if (pageData.type === 'database') {
                results.skippedPages++;
                continue;
            }

            // Migrate page
            const result = await migratePage(pageId, userId);

            if (result.success) {
                if (result.error === 'Page already migrated') {
                    results.skippedPages++;
                } else {
                    results.migratedPages++;
                }
            } else {
                results.failedPages++;
                results.errors.push({
                    pageId,
                    title: pageTitle,
                    error: result.error || 'Unknown error',
                });
            }
        }

        results.success = results.failedPages === 0;
    } catch (error) {
        console.error('Workspace migration failed:', error);
        results.success = false;
    }

    return results;
}

/**
 * Get migration status for a workspace
 */
export async function getWorkspaceMigrationStatus(workspaceId: string): Promise<{
    totalPages: number;
    migratedPages: number;
    pendingPages: number;
    percentComplete: number;
}> {
    const pagesRef = collection(db, 'pages');
    const q = query(pagesRef, where('workspaceId', '==', workspaceId));
    const snapshot = await getDocs(q);

    let migratedCount = 0;
    let totalCount = 0;

    snapshot.forEach((doc) => {
        const data = doc.data();
        // Don't count database pages
        if (data.type !== 'database') {
            totalCount++;
            if (data.migrated === true) {
                migratedCount++;
            }
        }
    });

    return {
        totalPages: totalCount,
        migratedPages: migratedCount,
        pendingPages: totalCount - migratedCount,
        percentComplete: totalCount > 0 ? Math.round((migratedCount / totalCount) * 100) : 100,
    };
}
