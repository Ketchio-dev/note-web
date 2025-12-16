/**
 * Block-based data model for granular content management
 * Enables versioning, collaboration, and fine-grained updates
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Block Types - mirrors Notion's block system
 */
export type BlockType =
    // Text blocks
    | 'paragraph'
    | 'heading_1'
    | 'heading_2'
    | 'heading_3'

    // List blocks
    | 'bulleted_list_item'
    | 'numbered_list_item'
    | 'todo'
    | 'toggle'

    // Media blocks
    | 'image'
    | 'video'
    | 'file'
    | 'embed'

    // Container blocks
    | 'quote'
    | 'callout'
    | 'code'
    | 'divider'

    // Database blocks
    | 'table'
    | 'database_inline'

    // Advanced blocks
    | 'equation'
    | 'bookmark';

/**
 * ProseMirror-compatible JSON content
 * Stores rich text with marks (bold, italic, etc.)
 */
export interface JSONContent {
    type: string;
    attrs?: Record<string, any>;
    content?: JSONContent[];
    marks?: Mark[];
    text?: string;
}

export interface Mark {
    type: 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link' | 'highlight';
    attrs?: Record<string, any>;
}

/**
 * Core Block interface
 */
export interface Block {
    // Identity
    id: string;                    // UUID
    type: BlockType;

    // Content
    content: JSONContent;          // ProseMirror JSON
    plainText?: string;            // For search indexing

    // Hierarchy
    parent_id: string | null;      // Parent block (null = root)
    page_id: string;               // Top-level page this belongs to
    position: string;              // Fractional index for ordering

    // Metadata
    created_time: Timestamp;
    last_edited_time: Timestamp;
    created_by: string;            // User ID
    last_edited_by: string;        // User ID

    // Block-specific properties
    properties: BlockProperties;

    // State
    version: number;               // For optimistic concurrency control
}

/**
 * Block-specific properties based on type
 */
export interface BlockProperties {
    // Heading
    level?: 1 | 2 | 3;

    // Todo
    checked?: boolean;

    // Toggle
    collapsed?: boolean;

    // Code
    language?: string;

    // Image/File
    url?: string;
    caption?: string;

    // Callout
    icon?: string;
    color?: string;

    // Bookmark
    title?: string;
    description?: string;
    favicon?: string;

    // Table
    hasColumnHeader?: boolean;
    hasRowHeader?: boolean;

    // Database
    database_id?: string;
    view_id?: string;
}

/**
 * Page as a collection of blocks
 */
export interface BlockPage {
    id: string;
    workspace_id: string;

    // Root blocks (top-level blocks on the page)
    block_ids: string[];

    // Page metadata (same as before)
    title: string;
    icon?: string;
    cover?: string;

    // Organization
    parent_id: string | null;
    section?: 'private' | 'workspace';

    // Timestamps
    created_time: Timestamp;
    last_edited_time: Timestamp;
    created_by: string;
    last_edited_by: string;

    // Options
    font?: 'default' | 'serif' | 'mono';
    fullWidth?: boolean;
    smallText?: boolean;

    // Migration flag
    migrated?: boolean;
}

/**
 * Helper function to create a new block
 */
export function createBlock(
    type: BlockType,
    pageId: string,
    userId: string,
    content: JSONContent = { type: 'doc', content: [] },
    parentId: string | null = null,
    position: string = 'a0'
): Block {
    const now = Timestamp.now();

    return {
        id: crypto.randomUUID(),
        type,
        content,
        plainText: extractPlainText(content),
        parent_id: parentId,
        page_id: pageId,
        position,
        created_time: now,
        last_edited_time: now,
        created_by: userId,
        last_edited_by: userId,
        properties: {},
        version: 1,
    };
}

/**
 * Extract plain text from JSONContent for search indexing
 */
export function extractPlainText(content: JSONContent): string {
    if (content.text) {
        return content.text;
    }

    if (content.content) {
        return content.content.map(extractPlainText).join(' ');
    }

    return '';
}

/**
 * Update block content
 */
export function updateBlockContent(
    block: Block,
    newContent: JSONContent,
    userId: string
): Block {
    return {
        ...block,
        content: newContent,
        plainText: extractPlainText(newContent),
        last_edited_time: Timestamp.now(),
        last_edited_by: userId,
        version: block.version + 1,
    };
}

/**
 * Firestore collection names
 */
export const COLLECTIONS = {
    BLOCKS: 'blocks',
    PAGES: 'pages',
} as const;
