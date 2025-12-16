/**
 * Block-Tiptap Bridge
 * Converts between Block system and Tiptap/ProseMirror format
 */

import { Block, BlockType, JSONContent, Mark } from './block-model';
import { JSONContent as TiptapJSON } from '@tiptap/core';

/**
 * Convert Block to Tiptap JSONContent
 */
export function blockToTiptap(block: Block): TiptapJSON {
    const baseNode: TiptapJSON = {
        type: mapBlockTypeToTiptap(block.type),
        attrs: {
            id: block.id,
            ...block.properties,
        },
        content: block.content.content || [],
    };

    // Special handling for different block types
    switch (block.type) {
        case 'heading_1':
        case 'heading_2':
        case 'heading_3':
            return {
                ...baseNode,
                attrs: {
                    ...baseNode.attrs,
                    level: block.properties.level || parseInt(block.type.split('_')[1]),
                },
            };

        case 'code':
            return {
                ...baseNode,
                attrs: {
                    ...baseNode.attrs,
                    language: block.properties.language || 'plaintext',
                },
            };

        case 'todo':
            return {
                ...baseNode,
                attrs: {
                    ...baseNode.attrs,
                    checked: block.properties.checked || false,
                },
            };

        case 'toggle':
            return {
                ...baseNode,
                attrs: {
                    ...baseNode.attrs,
                    collapsed: block.properties.collapsed || false,
                },
            };

        default:
            return baseNode;
    }
}

/**
 * Convert Tiptap JSONContent to Block structure
 */
export function tiptapToBlock(
    node: TiptapJSON,
    pageId: string,
    userId: string,
    parentId: string | null = null,
    position: string = 'a0'
): Partial<Block> {
    const blockType = mapTiptapTypeToBlock(node.type || 'paragraph');

    // Extract content without block-specific attrs
    const { id, level, language, checked, collapsed, ...otherAttrs } = node.attrs || {};

    // Normalize content to Block JSONContent format
    const content: JSONContent = {
        type: node.type || 'paragraph',
        attrs: otherAttrs,
        content: node.content as any, // Type cast needed for compatibility
        text: node.text,
    };

    // Build block properties based on type
    const properties: any = {};

    if (level) properties.level = level;
    if (language) properties.language = language;
    if (checked !== undefined) properties.checked = checked;
    if (collapsed !== undefined) properties.collapsed = collapsed;

    return {
        id: id || crypto.randomUUID(),
        type: blockType,
        content,
        parent_id: parentId,
        page_id: pageId,
        position,
        properties,
    };
}

/**
 * Convert multiple blocks to Tiptap document
 */
export function blocksToTiptapDoc(blocks: Block[]): TiptapJSON {
    return {
        type: 'doc',
        content: blocks.map(blockToTiptap),
    };
}

/**
 * Convert Tiptap document to blocks
 */
export function tiptapDocToBlocks(
    doc: TiptapJSON,
    pageId: string,
    userId: string
): Partial<Block>[] {
    if (!doc.content) return [];

    return doc.content.map((node, index) =>
        tiptapToBlock(node, pageId, userId, null, generatePosition(index))
    );
}

/**
 * Map Block type to Tiptap node type
 */
function mapBlockTypeToTiptap(blockType: BlockType): string {
    const typeMap: Record<BlockType, string> = {
        paragraph: 'paragraph',
        heading_1: 'heading',
        heading_2: 'heading',
        heading_3: 'heading',
        bulleted_list_item: 'listItem',
        numbered_list_item: 'listItem',
        todo: 'taskItem',
        toggle: 'details',
        quote: 'blockquote',
        callout: 'callout',
        code: 'codeBlock',
        divider: 'horizontalRule',
        image: 'image',
        video: 'video',
        file: 'file',
        embed: 'iframe',
        table: 'table',
        database_inline: 'databaseView',
        equation: 'math',
        bookmark: 'bookmark',
    };

    return typeMap[blockType] || 'paragraph';
}

/**
 * Map Tiptap node type to Block type
 */
function mapTiptapTypeToBlock(nodeType: string): BlockType {
    const typeMap: Record<string, BlockType> = {
        paragraph: 'paragraph',
        heading: 'heading_1', // Will be refined by level attr
        listItem: 'bulleted_list_item',
        taskItem: 'todo',
        details: 'toggle',
        blockquote: 'quote',
        callout: 'callout',
        codeBlock: 'code',
        horizontalRule: 'divider',
        image: 'image',
        video: 'video',
        file: 'file',
        iframe: 'embed',
        table: 'table',
        databaseView: 'database_inline',
        math: 'equation',
        bookmark: 'bookmark',
    };

    return typeMap[nodeType] || 'paragraph';
}

/**
 * Generate fractional index position
 */
function generatePosition(index: number): string {
    // Simple base62 encoding for position
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
 * Sync Block updates to Tiptap editor
 */
export function syncBlockToEditor(
    editor: any,
    block: Block,
    position: number
): void {
    const tiptapNode = blockToTiptap(block);

    editor
        .chain()
        .focus()
        .setNodeSelection(position)
        .deleteSelection()
        .insertContentAt(position, tiptapNode)
        .run();
}

/**
 * Extract blocks from current editor state
 */
export function extractBlocksFromEditor(
    editor: any,
    pageId: string,
    userId: string
): Partial<Block>[] {
    const json = editor.getJSON();
    return tiptapDocToBlocks(json, pageId, userId);
}
