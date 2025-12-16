/**
 * Draggable Block List with Multi-Selection
 * Supports drag & drop reordering and multi-block actions
 */

"use client";

import { useState, useCallback } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableBlockItem } from './SortableBlockItem';
import { Block } from '@/lib/block-model';
import { generatePositionBetween } from '@/lib/fractional-index';
import { moveBlock } from '@/lib/block-operations';

interface DraggableBlockListProps {
    blocks: Block[];
    onBlocksReorder: (newBlocks: Block[]) => void;
    onBlockUpdate: (blockId: string, content: string) => void;
    onBlockDelete: (blockId: string) => void;
    onMultiDelete?: (blockIds: string[]) => void;
}

export function DraggableBlockList({
    blocks,
    onBlocksReorder,
    onBlockUpdate,
    onBlockDelete,
    onMultiDelete,
}: DraggableBlockListProps) {
    const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement to start drag
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    /**
     * Handle drag end
     */
    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const oldIndex = blocks.findIndex(b => b.id === active.id);
        const newIndex = blocks.findIndex(b => b.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        // Reorder locally first for immediate feedback
        const reorderedBlocks = arrayMove(blocks, oldIndex, newIndex);
        onBlocksReorder(reorderedBlocks);

        // Update fractional index in Firestore
        const block = blocks[oldIndex];
        const beforeBlock = newIndex > 0 ? reorderedBlocks[newIndex - 1] : null;
        const afterBlock = newIndex < reorderedBlocks.length - 1 ? reorderedBlocks[newIndex + 1] : null;

        try {
            await moveBlock(
                block.id,
                block.parent_id,
                beforeBlock?.id || null,
                afterBlock?.id || null
            );
        } catch (error) {
            console.error('Failed to move block:', error);
            // Revert on error
            onBlocksReorder(blocks);
        }
    }, [blocks, onBlocksReorder]);

    /**
     * Handle block selection
     */
    const handleBlockSelect = useCallback((blockId: string, event: React.MouseEvent) => {
        const index = blocks.findIndex(b => b.id === blockId);

        if (event.shiftKey && lastSelectedId) {
            // Range selection
            const lastIndex = blocks.findIndex(b => b.id === lastSelectedId);
            const start = Math.min(index, lastIndex);
            const end = Math.max(index, lastIndex);

            const newSelected = new Set(selectedBlocks);
            for (let i = start; i <= end; i++) {
                newSelected.add(blocks[i].id);
            }
            setSelectedBlocks(newSelected);
        } else if (event.metaKey || event.ctrlKey) {
            // Multi-selection toggle
            const newSelected = new Set(selectedBlocks);
            if (newSelected.has(blockId)) {
                newSelected.delete(blockId);
            } else {
                newSelected.add(blockId);
            }
            setSelectedBlocks(newSelected);
            setLastSelectedId(blockId);
        } else {
            // Single selection
            setSelectedBlocks(new Set([blockId]));
            setLastSelectedId(blockId);
        }
    }, [blocks, selectedBlocks, lastSelectedId]);

    /**
     * Handle multi-block delete
     */
    const handleMultiDelete = useCallback(() => {
        if (selectedBlocks.size === 0) return;

        if (onMultiDelete) {
            onMultiDelete(Array.from(selectedBlocks));
        } else {
            // Fallback: delete one by one
            selectedBlocks.forEach(blockId => onBlockDelete(blockId));
        }

        setSelectedBlocks(new Set());
        setLastSelectedId(null);
    }, [selectedBlocks, onMultiDelete, onBlockDelete]);

    /**
     * Keyboard shortcuts
     */
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Delete/Backspace: Delete selected blocks
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlocks.size > 0) {
            e.preventDefault();
            handleMultiDelete();
        }

        // Escape: Clear selection
        if (e.key === 'Escape') {
            setSelectedBlocks(new Set());
            setLastSelectedId(null);
        }

        // Cmd/Ctrl+A: Select all
        if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
            e.preventDefault();
            setSelectedBlocks(new Set(blocks.map(b => b.id)));
        }
    }, [selectedBlocks, handleMultiDelete, blocks]);

    return (
        <div onKeyDown={handleKeyDown} tabIndex={0} className="outline-none">
            {/* Multi-selection toolbar */}
            {selectedBlocks.size > 0 && (
                <div className="sticky top-0 z-10 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 mb-4 flex items-center justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                        {selectedBlocks.size} block{selectedBlocks.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleMultiDelete}
                            className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/40"
                        >
                            Delete
                        </button>
                        <button
                            onClick={() => setSelectedBlocks(new Set())}
                            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={blocks.map(b => b.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {blocks.map(block => (
                        <SortableBlockItem
                            key={block.id}
                            block={block}
                            isSelected={selectedBlocks.has(block.id)}
                            onSelect={handleBlockSelect}
                            onUpdate={onBlockUpdate}
                            onDelete={onBlockDelete}
                        />
                    ))}
                </SortableContext>
            </DndContext>

            {blocks.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No blocks yet. Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">/ </kbd> to add a block
                </div>
            )}
        </div>
    );
}
