/**
 * Virtual Block List
 * Renders only visible blocks for optimal performance with large documents
 */

"use client";

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Block } from '@/lib/block-model';
import { BlockErrorBoundary } from './BlockErrorBoundary';

interface VirtualBlockListProps {
    blocks: Block[];
    renderBlock: (block: Block, index: number) => React.ReactNode;
    estimateSize?: number;
    overscan?: number;
}

/**
 * Virtual scrolling for block lists
 * Only renders visible blocks + overscan for smooth scrolling
 */
export function VirtualBlockList({
    blocks,
    renderBlock,
    estimateSize = 60,  // Average block height in pixels
    overscan = 5,        // Number of blocks to render outside viewport
}: VirtualBlockListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    // Initialize virtualizer
    const virtualizer = useVirtualizer({
        count: blocks.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => estimateSize,
        overscan,
        // Enable dynamic size measurement
        measureElement:
            typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
                ? (element) => element?.getBoundingClientRect().height
                : undefined,
    });

    const virtualItems = virtualizer.getVirtualItems();

    return (
        <div
            ref={parentRef}
            className="h-full overflow-auto"
            style={{
                contain: 'strict', // CSS containment for better performance
            }}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    position: 'relative',
                }}
            >
                {virtualItems.map((virtualRow) => {
                    const block = blocks[virtualRow.index];

                    return (
                        <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <BlockErrorBoundary blockId={block.id}>
                                {renderBlock(block, virtualRow.index)}
                            </BlockErrorBoundary>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Simple wrapper with default block renderer
 */
interface VirtualBlockEditorProps {
    blocks: Block[];
    onBlockUpdate?: (blockId: string, content: string) => void;
    onBlockDelete?: (blockId: string) => void;
}

export function VirtualBlockEditor({
    blocks,
    onBlockUpdate,
    onBlockDelete,
}: VirtualBlockEditorProps) {
    const renderBlock = useMemo(
        () => (block: Block, index: number) => (
            <div className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition">
                <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-400 dark:text-gray-600 mt-1 w-6 flex-shrink-0">
                        {getBlockIcon(block.type)}
                    </span>
                    <div className="flex-1">
                        <input
                            type="text"
                            defaultValue={block.plainText || ''}
                            onChange={(e) => onBlockUpdate?.(block.id, e.target.value)}
                            placeholder="Type something..."
                            className="w-full bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        />
                    </div>
                    {onBlockDelete && (
                        <button
                            onClick={() => onBlockDelete(block.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 text-xs"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>
        ),
        [onBlockUpdate, onBlockDelete]
    );

    return (
        <VirtualBlockList
            blocks={blocks}
            renderBlock={renderBlock}
            estimateSize={60}
            overscan={10}
        />
    );
}

function getBlockIcon(type: string): string {
    switch (type) {
        case 'heading_1': return 'H1';
        case 'heading_2': return 'H2';
        case 'heading_3': return 'H3';
        case 'todo': return '☐';
        case 'bulleted_list_item': return '•';
        case 'numbered_list_item': return '1.';
        case 'quote': return '"';
        case 'code': return '</>';
        default: return '¶';
    }
}
