/**
 * Enhanced Slash Command Menu
 * Comprehensive slash commands for blocks, AI, and formatting
 */

"use client";

import { useState, useCallback, useEffect } from 'react';
import {
    Type, Heading1, Heading2, Heading3, List, ListOrdered,
    CheckSquare, Code, Table, Database, Image, FileText,
    Sparkles, Quote, AlertCircle, Calendar, BarChart
} from 'lucide-react';
import { BlockType } from '@/lib/block-model';

interface SlashCommand {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    category: 'basic' | 'advanced' | 'database' | 'media' | 'ai';
    keywords: string[];
    action: () => void;
    blockType?: BlockType;
}

interface EnhancedSlashMenuProps {
    onSelect: (command: SlashCommand) => void;
    onClose: () => void;
    position: { x: number; y: number };
}

export function EnhancedSlashMenu({ onSelect, onClose, position }: EnhancedSlashMenuProps) {
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Define all slash commands
    const commands: SlashCommand[] = [
        // Basic Text
        {
            id: 'paragraph',
            title: 'Text',
            description: 'Plain text paragraph',
            icon: Type,
            category: 'basic',
            keywords: ['text', 'paragraph', 'p'],
            action: () => { },
            blockType: 'paragraph',
        },
        {
            id: 'heading1',
            title: 'Heading 1',
            description: 'Large heading',
            icon: Heading1,
            category: 'basic',
            keywords: ['heading', 'h1', 'title'],
            action: () => { },
            blockType: 'heading_1',
        },
        {
            id: 'heading2',
            title: 'Heading 2',
            description: 'Medium heading',
            icon: Heading2,
            category: 'basic',
            keywords: ['heading', 'h2', 'subtitle'],
            action: () => { },
            blockType: 'heading_2',
        },
        {
            id: 'heading3',
            title: 'Heading 3',
            description: 'Small heading',
            icon: Heading3,
            category: 'basic',
            keywords: ['heading', 'h3'],
            action: () => { },
            blockType: 'heading_3',
        },

        // Lists
        {
            id: 'bulleted',
            title: 'Bulleted List',
            description: 'Unordered list',
            icon: List,
            category: 'basic',
            keywords: ['bullet', 'list', 'ul'],
            action: () => { },
            blockType: 'bulleted_list_item',
        },
        {
            id: 'numbered',
            title: 'Numbered List',
            description: 'Ordered list',
            icon: ListOrdered,
            category: 'basic',
            keywords: ['number', 'list', 'ol', 'ordered'],
            action: () => { },
            blockType: 'numbered_list_item',
        },
        {
            id: 'todo',
            title: 'Todo List',
            description: 'Checklist item',
            icon: CheckSquare,
            category: 'basic',
            keywords: ['todo', 'checkbox', 'task', 'check'],
            action: () => { },
            blockType: 'todo',
        },

        // Advanced
        {
            id: 'toggle',
            title: 'Toggle',
            description: 'Collapsible section',
            icon: FileText,
            category: 'advanced',
            keywords: ['toggle', 'collapse', 'accordion'],
            action: () => { },
            blockType: 'toggle',
        },
        {
            id: 'quote',
            title: 'Quote',
            description: 'Block quote',
            icon: Quote,
            category: 'advanced',
            keywords: ['quote', 'blockquote', 'citation'],
            action: () => { },
            blockType: 'quote',
        },
        {
            id: 'callout',
            title: 'Callout',
            description: 'Highlighted box',
            icon: AlertCircle,
            category: 'advanced',
            keywords: ['callout', 'alert', 'note', 'warning'],
            action: () => { },
            blockType: 'callout',
        },
        {
            id: 'code',
            title: 'Code',
            description: 'Code block',
            icon: Code,
            category: 'advanced',
            keywords: ['code', 'snippet', 'programming'],
            action: () => { },
            blockType: 'code',
        },
        {
            id: 'divider',
            title: 'Divider',
            description: 'Horizontal line',
            icon: FileText,
            category: 'advanced',
            keywords: ['divider', 'line', 'hr', 'separator'],
            action: () => { },
            blockType: 'divider',
        },

        // Database
        {
            id: 'table',
            title: 'Table',
            description: 'Simple table',
            icon: Table,
            category: 'database',
            keywords: ['table', 'grid'],
            action: () => { },
            blockType: 'table',
        },
        {
            id: 'database',
            title: 'Database',
            description: 'Inline database',
            icon: Database,
            category: 'database',
            keywords: ['database', 'collection', 'data'],
            action: () => { },
            blockType: 'database_inline',
        },
        {
            id: 'calendar',
            title: 'Calendar',
            description: 'Calendar view',
            icon: Calendar,
            category: 'database',
            keywords: ['calendar', 'date', 'schedule'],
            action: () => { },
        },
        {
            id: 'chart',
            title: 'Chart',
            description: 'Data visualization',
            icon: BarChart,
            category: 'database',
            keywords: ['chart', 'graph', 'visualization'],
            action: () => { },
        },

        // Media
        {
            id: 'image',
            title: 'Image',
            description: 'Upload or embed image',
            icon: Image,
            category: 'media',
            keywords: ['image', 'picture', 'photo', 'img'],
            action: () => { },
            blockType: 'image',
        },
        {
            id: 'file',
            title: 'File',
            description: 'Upload file',
            icon: FileText,
            category: 'media',
            keywords: ['file', 'attachment', 'upload'],
            action: () => { },
            blockType: 'file',
        },

        // AI Commands
        {
            id: 'ai-summarize',
            title: 'AI: Summarize',
            description: 'Summarize selected text',
            icon: Sparkles,
            category: 'ai',
            keywords: ['ai', 'summarize', 'summary', 'tldr'],
            action: () => {
                // Trigger AI summarization
            },
        },
        {
            id: 'ai-translate',
            title: 'AI: Translate',
            description: 'Translate to another language',
            icon: Sparkles,
            category: 'ai',
            keywords: ['ai', 'translate', 'translation', 'language'],
            action: () => {
                // Trigger AI translation
            },
        },
        {
            id: 'ai-improve',
            title: 'AI: Improve Writing',
            description: 'Enhance text quality',
            icon: Sparkles,
            category: 'ai',
            keywords: ['ai', 'improve', 'enhance', 'writing'],
            action: () => {
                // Trigger AI improvement
            },
        },
        {
            id: 'ai-expand',
            title: 'AI: Make Longer',
            description: 'Expand with more details',
            icon: Sparkles,
            category: 'ai',
            keywords: ['ai', 'expand', 'longer', 'elaborate'],
            action: () => {
                // Trigger AI expansion
            },
        },
        {
            id: 'ai-shorten',
            title: 'AI: Make Shorter',
            description: 'Condense text',
            icon: Sparkles,
            category: 'ai',
            keywords: ['ai', 'shorten', 'condense', 'brief'],
            action: () => {
                // Trigger AI shortening
            },
        },
    ];

    // Filter commands based on search
    const filteredCommands = commands.filter(cmd => {
        const searchLower = search.toLowerCase();
        return (
            cmd.title.toLowerCase().includes(searchLower) ||
            cmd.description.toLowerCase().includes(searchLower) ||
            cmd.keywords.some(kw => kw.includes(searchLower))
        );
    });

    // Group commands by category
    const groupedCommands = filteredCommands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
    }, {} as Record<string, SlashCommand[]>);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    onSelect(filteredCommands[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, filteredCommands, onSelect, onClose]);

    const categoryLabels = {
        basic: '📝 Basic Blocks',
        advanced: '⚡ Advanced',
        database: '🗂️ Database',
        media: '🖼️ Media',
        ai: '✨ AI Actions',
    };

    return (
        <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-80 max-h-96 overflow-hidden"
            style={{ top: position.y, left: position.x }}
        >
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search commands..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded border-none outline-none text-sm"
                    autoFocus
                />
            </div>

            {/* Commands List */}
            <div className="overflow-y-auto max-h-80">
                {Object.entries(groupedCommands).map(([category, cmds]) => (
                    <div key={category} className="py-1">
                        <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                            {categoryLabels[category as keyof typeof categoryLabels]}
                        </div>
                        {cmds.map((cmd, index) => {
                            const globalIndex = filteredCommands.indexOf(cmd);
                            const Icon = cmd.icon;

                            return (
                                <button
                                    key={cmd.id}
                                    onClick={() => onSelect(cmd)}
                                    className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${globalIndex === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                        }`}
                                >
                                    <Icon size={18} className="text-gray-600 dark:text-gray-400" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {cmd.title}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {cmd.description}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ))}

                {filteredCommands.length === 0 && (
                    <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No commands found
                    </div>
                )}
            </div>
        </div>
    );
}

export { type SlashCommand };
