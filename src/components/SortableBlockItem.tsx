/**
 * Sortable Block Item
 * Individual block with drag handle and selection support
 */

"use client";

import { useRef, useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Block } from '@/lib/block-model';

interface SortableBlockItemProps {
    block: Block;
    isSelected: boolean;
    onSelect: (blockId: string, event: React.MouseEvent) => void;
    onUpdate: (blockId: string, content: string) => void;
    onDelete: (blockId: string) => void;
}

export function SortableBlockItem({
    block,
    isSelected,
    onSelect,
    onUpdate,
    onDelete,
}: SortableBlockItemProps) {
    const [content, setContent] = useState(block.plainText || '');
    const [isHovered, setIsHovered] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

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
        onUpdate(block.id, newContent);
    };

    const getBlockIcon = () => {
        switch (block.type) {
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
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 rounded' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={(e) => onSelect(block.id, e)}
        >
            {/* Drag handle and controls */}
            {(isHovered || isDragging) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-grab active:cursor-grabbing"
                        title="Drag to reorder"
                    >
                        <GripVertical size={14} className="text-gray-400" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(block.id);
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                        title="Delete block"
                    >
                        <Trash2 size={14} className="text-gray-400 hover:text-red-600" />
                    </button>
                </div>
            )}

            {/* Block content */}
            <div className="flex items-start gap-2 px-2 py-1">
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

            {/* Selection indicator */}
            {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l" />
            )}
        </div>
    );
}
