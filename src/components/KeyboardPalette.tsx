/**
 * Advanced Keyboard Shortcuts System
 * Cmd+K command palette and global shortcuts
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { Search, Command, Clock, FileText, Database, Calendar, Users } from 'lucide-react';

interface ShortcutCommand {
    id: string;
    title: string;
    description?: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    category: 'navigation' | 'actions' | 'recent' | 'search';
    shortcut?: string;
    action: () => void | Promise<void>;
}

interface KeyboardPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate?: (pageId: string) => void;
}

export function KeyboardPalette({ isOpen, onClose, onNavigate }: KeyboardPaletteProps) {
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentPages, setRecentPages] = useState<any[]>([]);

    // Define all commands
    const commands: ShortcutCommand[] = [
        {
            id: 'new-page',
            title: 'New Page',
            description: 'Create a new page',
            icon: FileText,
            category: 'actions',
            shortcut: 'Cmd+N',
            action: () => console.log('New page'),
        },
        {
            id: 'new-database',
            title: 'New Database',
            description: 'Create a new database',
            icon: Database,
            category: 'actions',
            shortcut: 'Cmd+Shift+D',
            action: () => console.log('New database'),
        },
        {
            id: 'search-all',
            title: 'Search Everything',
            description: 'Search across all pages',
            icon: Search,
            category: 'search',
            action: () => console.log('Search'),
        },
        {
            id: 'team-settings',
            title: 'Team Settings',
            description: 'Manage workspace settings',
            icon: Users,
            category: 'navigation',
            action: () => console.log('Settings'),
        },
    ];

    // Filter commands
    const filteredCommands = search
        ? commands.filter(cmd =>
            cmd.title.toLowerCase().includes(search.toLowerCase()) ||
            cmd.description?.toLowerCase().includes(search.toLowerCase())
        )
        : commands;

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

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
                    filteredCommands[selectedIndex].action();
                    onClose();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filteredCommands, onClose]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setSearch('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Palette */}
            <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <Search size={20} className="text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Type a command or search..."
                            className="flex-1 bg-transparent border-none outline-none text-lg"
                            autoFocus
                        />
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd>
                    </div>

                    {/* Commands List */}
                    <div className="max-h-96 overflow-y-auto">
                        {filteredCommands.length === 0 ? (
                            <div className="px-4 py-12 text-center text-gray-500">
                                No results found
                            </div>
                        ) : (
                            filteredCommands.map((cmd, index) => {
                                const Icon = cmd.icon;
                                return (
                                    <button
                                        key={cmd.id}
                                        onClick={() => {
                                            cmd.action();
                                            onClose();
                                        }}
                                        className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                            }`}
                                    >
                                        <Icon size={20} className="text-gray-600 dark:text-gray-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {cmd.title}
                                            </div>
                                            {cmd.description && (
                                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                    {cmd.description}
                                                </div>
                                            )}
                                        </div>
                                        {cmd.shortcut && (
                                            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                                                {cmd.shortcut}
                                            </kbd>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

/**
 * Global keyboard shortcuts hook
 */
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = [
                e.metaKey && 'Cmd',
                e.ctrlKey && 'Ctrl',
                e.shiftKey && 'Shift',
                e.altKey && 'Alt',
                e.key.toUpperCase(),
            ]
                .filter(Boolean)
                .join('+');

            const action = shortcuts[key];
            if (action) {
                e.preventDefault();
                action();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}

/**
 * Use Cmd+K to open palette
 */
export function useCommandPalette() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}
