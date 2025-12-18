/**
 * UnifiedEditor - Integrated Block-based WYSIWYG Editor
 * Combines Tiptap with Block system for Notion-like editing experience
 */

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import debounce from 'lodash.debounce';

// Import our custom extensions
import { BlockExtension } from '@/extensions/block-extension';
import { SlashCommand, suggestion } from './extensions';

// Import bridge utilities
import {
    blocksToTiptapDoc,
    extractBlocksFromEditor,
    blockToTiptap,
} from '@/lib/block-tiptap-bridge';

// Import block system
import { Block, createBlock } from '@/lib/block-model';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';

interface UnifiedEditorProps {
    pageId: string;
    workspaceId: string;
    userId: string;
    initialBlocks?: Block[];
    enableCollaboration?: boolean;
    enableBlocks?: boolean;
    readOnly?: boolean;
    onSave?: (blocks: Block[]) => void;
    placeholder?: string;
}

export default function UnifiedEditor({
    pageId,
    workspaceId,
    userId,
    initialBlocks = [],
    enableCollaboration = false,
    enableBlocks = true,
    readOnly = false,
    onSave,
    placeholder = 'Press / for commands...',
}: UnifiedEditorProps) {
    const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
    const editorRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize Tiptap editor
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            Underline,
            Highlight.configure({
                multicolor: true,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500 underline cursor-pointer',
                },
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
                HTMLAttributes: {
                    class: 'flex items-start gap-2',
                },
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            SlashCommand.configure({
                suggestion,
            }),
            // Add Block Extension if enabled
            ...(enableBlocks
                ? [
                    BlockExtension.configure({
                        enableDragHandle: true,
                        // onBlockChange will be handled via onUpdate
                    }),
                ]
                : []),
        ],
        content: blocksToTiptapDoc(blocks),
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            if (enableBlocks) {
                const updatedBlocks = extractBlocksFromEditor(editor, pageId, userId);
                debouncedSaveBlocks(updatedBlocks as Block[]);
            }
        },
    });

    // Store editor ref
    useEffect(() => {
        if (editor) {
            editorRef.current = editor;
        }
    }, [editor]);

    // Load blocks from Firestore on mount
    useEffect(() => {
        if (!enableBlocks) {
            setIsLoading(false);
            return;
        }

        loadBlocksFromFirestore();
    }, [pageId, enableBlocks]);

    // Real-time subscription to blocks (if collaboration enabled)
    useEffect(() => {
        if (!enableCollaboration || !enableBlocks) return;

        const blocksRef = collection(db, 'blocks');
        const q = query(blocksRef, where('page_id', '==', pageId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const updatedBlocks: Block[] = [];
            snapshot.forEach((doc) => {
                updatedBlocks.push({ id: doc.id, ...doc.data() } as Block);
            });

            // Sort by position
            updatedBlocks.sort((a, b) => a.position.localeCompare(b.position));

            setBlocks(updatedBlocks);

            // Update editor content
            if (editor && !editor.isDestroyed) {
                const doc = blocksToTiptapDoc(updatedBlocks);
                editor.commands.setContent(doc);
            }
        });

        return () => unsubscribe();
    }, [pageId, enableCollaboration, enableBlocks, editor]);

    /**
     * Load blocks from Firestore
     */
    const loadBlocksFromFirestore = async () => {
        try {
            setIsLoading(true);
            const blocksRef = collection(db, 'blocks');
            const q = query(blocksRef, where('page_id', '==', pageId));
            const snapshot = await getDocs(q);

            const loadedBlocks: Block[] = [];
            snapshot.forEach((doc) => {
                loadedBlocks.push({ id: doc.id, ...doc.data() } as Block);
            });

            // Sort by position
            loadedBlocks.sort((a, b) => a.position.localeCompare(b.position));

            setBlocks(loadedBlocks);

            // Update editor with loaded blocks
            if (editor && !editor.isDestroyed) {
                const doc = blocksToTiptapDoc(loadedBlocks);
                editor.commands.setContent(doc);
            }
        } catch (error) {
            console.error('Failed to load blocks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handle block changes from Block Extension
     */
    const handleBlockChange = useCallback(
        (editorBlocks: any[]) => {
            // Convert to Block format
            const updatedBlocks = extractBlocksFromEditor(editor!, pageId, userId);
            debouncedSaveBlocks(updatedBlocks as Block[]);
        },
        [editor, pageId, userId]
    );

    /**
     * Save blocks to Firestore (debounced)
     */
    const saveBlocksToFirestore = async (blocksToSave: Block[]) => {
        try {
            // Save each block
            for (const block of blocksToSave) {
                const blockRef = doc(db, 'blocks', block.id);
                await setDoc(blockRef, block, { merge: true });
            }

            // Callback
            onSave?.(blocksToSave);

            console.log(`Saved ${blocksToSave.length} blocks`);
        } catch (error) {
            console.error('Failed to save blocks:', error);
        }
    };

    // Debounced save function
    const debouncedSaveBlocks = useMemo(
        () => debounce(saveBlocksToFirestore, 500),
        []
    );

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            debouncedSaveBlocks.cancel();
        };
    }, [debouncedSaveBlocks]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading editor...</div>
            </div>
        );
    }

    if (!editor) {
        return null;
    }

    return (
        <div className="unified-editor w-full">
            {/* Editor Toolbar */}
            {!readOnly && (
                <div className="editor-toolbar sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center gap-2">
                    <EditorToolbar editor={editor} />
                </div>
            )}

            {/* Editor Content */}
            <div
                className="editor-content px-4 py-6 min-h-[500px] cursor-text"
                onClick={() => editor?.chain().focus().run()}
            >
                <EditorContent
                    editor={editor}
                    className="prose dark:prose-invert max-w-none focus:outline-none min-h-[500px]"
                />
            </div>

            {/* Block Count (Debug) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-1 rounded text-xs">
                    {blocks.length} blocks
                </div>
            )}
        </div>
    );
}

/**
 * Editor Toolbar Component
 */
function EditorToolbar({ editor }: { editor: any }) {
    if (!editor) return null;

    const Button = ({ onClick, active, children, title }: any) => (
        <button
            onClick={onClick}
            title={title}
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition ${active ? 'bg-gray-200 dark:bg-gray-700' : ''
                }`}
        >
            {children}
        </button>
    );

    return (
        <>
            <Button
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive('bold')}
                title="Bold (Cmd+B)"
            >
                <strong>B</strong>
            </Button>

            <Button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive('italic')}
                title="Italic (Cmd+I)"
            >
                <em>I</em>
            </Button>

            <Button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                active={editor.isActive('underline')}
                title="Underline (Cmd+U)"
            >
                <u>U</u>
            </Button>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

            <Button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                active={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
            >
                H1
            </Button>

            <Button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
            >
                H2
            </Button>

            <Button
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
            >
                H3
            </Button>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

            <Button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive('bulletList')}
                title="Bullet List"
            >
                •
            </Button>

            <Button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive('orderedList')}
                title="Numbered List"
            >
                1.
            </Button>

            <Button
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                active={editor.isActive('taskList')}
                title="Task List"
            >
                ☑
            </Button>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

            <Button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                active={editor.isActive('codeBlock')}
                title="Code Block"
            >
                &lt;/&gt;
            </Button>

            <Button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                active={editor.isActive('blockquote')}
                title="Quote"
            >
                "
            </Button>

            <Button onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
                —
            </Button>
        </>
    );
}
