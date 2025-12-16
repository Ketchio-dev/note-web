/**
 * Simple Block Editor Component
 * Renders and manages individual editable blocks
 */

"use client";

import { useState, useEffect, useRef } from 'react';
import { Block, BlockType } from '@/lib/block-model';
import {
    subscribeToPageBlocks,
    createBlockInFirestore,
    updateBlockInFirestore,
    deleteBlock,
} from '@/lib/block-operations';
import { useAuth } from '@/context/AuthContext';
import { Plus, GripVertical, Trash2, Zap } from 'lucide-react';
import { BlockErrorBoundary } from './BlockErrorBoundary';
import { VirtualBlockList } from './VirtualBlockList';

interface SimpleBlockEditorProps {
    pageId: string;
    useVirtualScrolling?: boolean; // Enable for large documents
}

export default function SimpleBlockEditor({
    pageId,
    useVirtualScrolling = false
}: SimpleBlockEditorProps) {
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Subscribe to blocks
    useEffect(() => {
        const unsubscribe = subscribeToPageBlocks(pageId, (fetchedBlocks) => {
            setBlocks(fetchedBlocks);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [pageId]);

    const handleAddBlock = async (type: BlockType = 'paragraph') => {
        if (!user) return;

        await createBlockInFirestore(
            type,
            pageId,
            user.uid,
            { type: 'paragraph', content: [] },
            null
        );
    };

    const handleUpdateBlock = async (blockId: string, newContent: string) => {
        if (!user) return;

        await updateBlockInFirestore(
            blockId,
            {
                content: { type: 'paragraph', text: newContent },
                plainText: newContent,
            },
            user.uid
        );
    };

    const handleDeleteBlock = async (blockId: string) => {
        await deleteBlock(blockId);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500 dark:text-gray-400">Loading blocks...</div>
            </div>
        );
    }

    // Use virtual scrolling for large documents (>100 blocks)
    const shouldUseVirtual = useVirtualScrolling || blocks.length > 100;

    if (shouldUseVirtual) {
        return (
            <div className="w-full h-screen">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm">
                        <Zap size={14} />
                        Virtual scrolling enabled ({blocks.length} blocks)
                    </div>
                    <VirtualBlockList
                        blocks={blocks}
                        renderBlock={(block, index) => (
                            <BlockErrorBoundary key={block.id} blockId={block.id}>
                                <EditableBlock
                                    block={block}
                                    pageId={pageId}
                                    onDelete={() => handleDeleteBlock(block.id)}
                                    onUpdate={(content) => handleUpdateBlock(block.id, content)}
                                />
                            </BlockErrorBoundary>
                        )}
                        estimateSize={60}
                        overscan={10}
                    />
                </div>
            </div>
        );
    }

    // Regular rendering for small documents
    return (
        <div className="w-full max-w-4xl mx-auto py-8 px-4">
            <div className="space-y-1">
                {blocks.map((block) => (
                    <BlockErrorBoundary key={block.id} blockId={block.id}>
                        <EditableBlock
                            block={block}
                            pageId={pageId}
                            onDelete={() => handleDeleteBlock(block.id)}
                            onUpdate={(content) => handleUpdateBlock(block.id, content)}
                        />
                    </BlockErrorBoundary>
                ))}
            </div>

            {blocks.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        No blocks yet. Start writing!
                    </p>
                </div>
            )}

            <button
                onClick={() => handleAddBlock('paragraph')}
                className="mt-4 flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
            >
                <Plus size={16} />
                Add block
            </button>
        </div>
    );
}

/**
 * Individual Editable Block
 */
interface EditableBlockProps {
    block: Block;
    pageId: string;
    onDelete: () => void;
    onUpdate: (content: string) => void;
}

function EditableBlock({ block, pageId, onDelete, onUpdate }: EditableBlockProps) {
    const [content, setContent] = useState(block.plainText || '');
    const [isHovered, setIsHovered] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Update content when block changes
    useEffect(() => {
        setContent(block.plainText || '');
    }, [block.plainText]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content]);

    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        onUpdate(newContent);
    };

    const getBlockIcon = () => {
        switch (block.type) {
            case 'heading_1': return 'H1';
            case 'heading_2': return 'H2';
            case 'heading_3': return 'H3';
            case 'todo': return '☐';
            case 'bulleted_list_item': return '•';
            case 'numbered_list_item': return '1.';
            default: return '¶';
        }
    };

    return (
        <div
            className="group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Block controls */}
            {isHovered && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        title="Drag to reorder"
                    >
                        <GripVertical size={14} className="text-gray-400" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                        title="Delete block"
                    >
                        <Trash2 size={14} className="text-gray-400 hover:text-red-600" />
                    </button>
                </div>
            )}

            {/* Block content */}
            <div className="flex items-start gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-600 mt-3 w-6 flex-shrink-0">
                    {getBlockIcon()}
                </span>
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Type something..."
                    className="flex-1 bg-transparent border-none outline-none resize-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 py-2 min-h-[2.5rem]"
                />
            </div>
        </div>
    );
}
