/**
 * Keyboard Shortcuts Settings Modal
 * UI for viewing and customizing keyboard shortcuts
 */

"use client";

import { useState } from 'react';
import { X, Search, Keyboard, RotateCcw } from 'lucide-react';
import {
    getDefaultShortcuts,
    formatShortcutKeys,
    getModifierKey
} from '@/hooks/useKeyboardShortcuts';

interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const shortcuts = getDefaultShortcuts();
    const categories = ['all', 'navigation', 'editing', 'formatting', 'ai', 'database', 'general'];

    const filteredShortcuts = shortcuts.filter(shortcut => {
        const matchesSearch = search === '' ||
            shortcut.name.toLowerCase().includes(search.toLowerCase()) ||
            shortcut.description.toLowerCase().includes(search.toLowerCase());

        const matchesCategory = selectedCategory === 'all' || shortcut.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {} as Record<string, typeof shortcuts>);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <Keyboard size={24} className="text-blue-600" />
                        <div>
                            <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Learn and customize shortcuts
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search shortcuts..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${selectedCategory === category
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Shortcuts List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {Object.keys(groupedShortcuts).length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                            <Keyboard size={48} className="mx-auto mb-4 opacity-30" />
                            <p>No shortcuts found</p>
                        </div>
                    ) : (
                        Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                            <div key={category} className="mb-8 last:mb-0">
                                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                                    {category}
                                </h3>
                                <div className="space-y-2">
                                    {categoryShortcuts.map(shortcut => (
                                        <div
                                            key={shortcut.id}
                                            className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition group"
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium">{shortcut.name}</div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                    {shortcut.description}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1">
                                                    {shortcut.keys.map((key, i) => (
                                                        <span key={i}>
                                                            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono">
                                                                {key === 'Cmd' ? (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl') :
                                                                    key === 'Shift' ? '⇧' :
                                                                        key === 'Alt' ? (navigator.platform.includes('Mac') ? '⌥' : 'Alt') :
                                                                            key}
                                                            </kbd>
                                                            {i < shortcut.keys.length - 1 && (
                                                                <span className="mx-1 text-gray-400">+</span>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                                {/* Future: Edit button */}
                                                {/* <button
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                                                    title="Customize"
                                                >
                                                    <RotateCcw size={14} />
                                                </button> */}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between text-sm">
                        <div className="text-gray-600 dark:text-gray-400">
                            Press <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded font-mono">
                                {getModifierKey()}
                            </kbd> + <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded font-mono">
                                /
                            </kbd> anytime to view shortcuts
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
