/**
 * Block CRUD operations for Firestore
 */

import { db } from './firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    writeBatch,
    Timestamp,
} from 'firebase/firestore';
import { Block, BlockType, JSONContent, createBlock, updateBlockContent } from './block-model';
import { generatePositionBetween } from './fractional-index';

/**
 * Create a new block
 */
export async function createBlockInFirestore(
    type: BlockType,
    pageId: string,
    userId: string,
    content: JSONContent = { type: 'doc', content: [] },
    parentId: string | null = null,
    position?: string
): Promise<Block> {
    // Generate position if not provided
    if (!position) {
        const siblings = await getBlocksByParent(pageId, parentId);
        const lastPosition = siblings.length > 0 ? siblings[siblings.length - 1].position : null;
        position = generatePositionBetween(lastPosition, null);
    }

    const block = createBlock(type, pageId, userId, content, parentId, position);

    const blockRef = doc(db, 'blocks', block.id);
    await setDoc(blockRef, {
        ...block,
        created_time: serverTimestamp(),
        last_edited_time: serverTimestamp(),
    });

    return block;
}

/**
 * Get a single block by ID
 */
export async function getBlock(blockId: string): Promise<Block | null> {
    const blockRef = doc(db, 'blocks', blockId);
    const blockSnap = await getDoc(blockRef);

    if (!blockSnap.exists()) return null;

    return { id: blockSnap.id, ...blockSnap.data() } as Block;
}

/**
 * Get all blocks for a page
 */
export async function getPageBlocks(pageId: string): Promise<Block[]> {
    const q = query(
        collection(db, 'blocks'),
        where('page_id', '==', pageId),
        orderBy('position', 'asc')
    );

    const snapshot = await getDocs(q);
    const blocks: Block[] = [];

    snapshot.forEach(doc => {
        blocks.push({ id: doc.id, ...doc.data() } as Block);
    });

    return blocks;
}

/**
 * Get blocks by parent ID (for hierarchical structure)
 */
export async function getBlocksByParent(
    pageId: string,
    parentId: string | null
): Promise<Block[]> {
    const q = query(
        collection(db, 'blocks'),
        where('page_id', '==', pageId),
        where('parent_id', '==', parentId),
        orderBy('position', 'asc')
    );

    const snapshot = await getDocs(q);
    const blocks: Block[] = [];

    snapshot.forEach(doc => {
        blocks.push({ id: doc.id, ...doc.data() } as Block);
    });

    return blocks;
}

/**
 * Update block content
 */
export async function updateBlockInFirestore(
    blockId: string,
    updates: Partial<Block>,
    userId: string
): Promise<void> {
    const blockRef = doc(db, 'blocks', blockId);

    await updateDoc(blockRef, {
        ...updates,
        last_edited_time: serverTimestamp(),
        last_edited_by: userId,
        version: (updates.version || 0) + 1,
    });
}

/**
 * Delete a block (and optionally its children)
 */
export async function deleteBlock(blockId: string, deleteChildren: boolean = true): Promise<void> {
    if (deleteChildren) {
        // Get block to find its children
        const block = await getBlock(blockId);
        if (!block) return;

        // Get all child blocks
        const children = await getBlocksByParent(block.page_id, blockId);

        // Delete children recursively
        const batch = writeBatch(db);

        for (const child of children) {
            await deleteBlock(child.id, true);
        }

        // Delete the block itself
        const blockRef = doc(db, 'blocks', blockId);
        batch.delete(blockRef);

        await batch.commit();
    } else {
        // Just delete this block
        const blockRef = doc(db, 'blocks', blockId);
        await deleteDoc(blockRef);
    }
}

/**
 * Move a block to a new position
 */
export async function moveBlock(
    blockId: string,
    newParentId: string | null,
    beforeBlockId: string | null,
    afterBlockId: string | null
): Promise<void> {
    const block = await getBlock(blockId);
    if (!block) throw new Error('Block not found');

    // Calculate new position
    let beforePosition: string | null = null;
    let afterPosition: string | null = null;

    if (beforeBlockId) {
        const beforeBlock = await getBlock(beforeBlockId);
        if (beforeBlock) beforePosition = beforeBlock.position;
    }

    if (afterBlockId) {
        const afterBlock = await getBlock(afterBlockId);
        if (afterBlock) afterPosition = afterBlock.position;
    }

    const newPosition = generatePositionBetween(beforePosition, afterPosition);

    // Update block
    await updateBlockInFirestore(blockId, {
        parent_id: newParentId,
        position: newPosition,
    }, block.last_edited_by);
}

/**
 * Subscribe to blocks for real-time updates
 */
export function subscribeToPageBlocks(
    pageId: string,
    callback: (blocks: Block[]) => void
): () => void {
    const q = query(
        collection(db, 'blocks'),
        where('page_id', '==', pageId),
        orderBy('position', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const blocks: Block[] = [];
        snapshot.forEach(doc => {
            blocks.push({ id: doc.id, ...doc.data() } as Block);
        });
        callback(blocks);
    });
}

/**
 * Bulk create blocks (for page initialization)
 */
export async function bulkCreateBlocks(blocks: Block[]): Promise<void> {
    const batch = writeBatch(db);

    blocks.forEach(block => {
        const blockRef = doc(db, 'blocks', block.id);
        batch.set(blockRef, {
            ...block,
            created_time: serverTimestamp(),
            last_edited_time: serverTimestamp(),
        });
    });

    await batch.commit();
}

/**
 * Create a block page (new Page with blocks support)
 */
export async function createBlockPage(
    workspaceId: string,
    userId: string,
    title: string = 'Untitled',
    parentId: string | null = null,
    section: 'private' | 'workspace' = 'workspace'
): Promise<{ pageId: string; blockId: string }> {
    // Create the page document
    const pageRef = doc(collection(db, 'pages'));
    const pageId = pageRef.id;

    await setDoc(pageRef, {
        workspaceId,
        parentId,
        title,
        type: 'page',
        section,
        created_time: serverTimestamp(),
        last_edited_time: serverTimestamp(),
        created_by: userId,
        last_edited_by: userId,
        migrated: true, // Mark as block-based from the start
        block_based: true,
    });

    // Create initial empty paragraph block
    const initialBlock = await createBlockInFirestore(
        'paragraph',
        pageId,
        userId,
        { type: 'paragraph', content: [] },
        null,
        'a0'
    );

    return { pageId, blockId: initialBlock.id };
}
