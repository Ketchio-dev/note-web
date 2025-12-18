/**
 * Workspace Layout with Global Components
 * Integrates CommandPalette, NotificationCenter, and Keyboard Shortcuts
 */

"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import CommandPalette from '@/components/CommandPalette';
import NotificationCenter from '@/components/NotificationCenter';
import { NotificationBadge } from '@/components/NotificationCenter';
import ShortcutsModal from '@/components/ShortcutsModal';
import { useKeyboardShortcuts, Shortcut, getModifierKey } from '@/hooks/useKeyboardShortcuts';
import { Bell, Search, Keyboard } from 'lucide-react';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const workspaceId = params.workspaceId as string;
    const { user } = useAuth();

    // Global UI State
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

    // Global Keyboard Shortcuts
    const shortcuts: Shortcut[] = [
        {
            id: 'command-palette',
            name: 'Command Palette',
            description: 'Open quick search',
            keys: [getModifierKey(), 'K'],
            category: 'navigation',
            handler: () => setIsCommandPaletteOpen(true),
            enabled: true,
        },
        {
            id: 'notifications',
            name: 'Notifications',
            description: 'Toggle notifications',
            keys: [getModifierKey(), 'Shift', 'N'],
            category: 'navigation',
            handler: () => setIsNotificationsOpen(prev => !prev),
            enabled: true,
        },
        {
            id: 'shortcuts-help',
            name: 'Keyboard Shortcuts',
            description: 'Show keyboard shortcuts',
            keys: [getModifierKey(), '/'],
            category: 'general',
            handler: () => setIsShortcutsOpen(true),
            enabled: true,
        },
    ];

    // Register global shortcuts
    useKeyboardShortcuts(shortcuts);

    return (
        <div className="h-screen flex flex-col">
            {/* Global Header */}
            <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-4">
                    <h1 className="font-semibold">Workspace</h1>
                </div>

                <div className="flex items-center gap-2">
                    {/* Search Button */}
                    <button
                        onClick={() => setIsCommandPaletteOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm"
                        title="Search (Cmd+K)"
                    >
                        <Search size={16} />
                        <span className="hidden md:inline">Search</span>
                        <kbd className="hidden md:inline px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-xs">
                            {getModifierKey()}K
                        </kbd>
                    </button>

                    {/* Shortcuts Button */}
                    <button
                        onClick={() => setIsShortcutsOpen(true)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                        title="Keyboard Shortcuts (Cmd+/)"
                    >
                        <Keyboard size={20} />
                    </button>

                    {/* Notification Badge */}
                    {user && (
                        <NotificationBadge
                            userId={user.uid}
                            onClick={() => setIsNotificationsOpen(prev => !prev)}
                        />
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {children}
            </div>

            {/* Global Modals/Sidebars */}
            {user && (
                <>
                    <CommandPalette
                        isOpen={isCommandPaletteOpen}
                        onClose={() => setIsCommandPaletteOpen(false)}
                        workspaceId={workspaceId}
                    />

                    <NotificationCenter
                        userId={user.uid}
                        isOpen={isNotificationsOpen}
                        onClose={() => setIsNotificationsOpen(false)}
                    />

                    <ShortcutsModal
                        isOpen={isShortcutsOpen}
                        onClose={() => setIsShortcutsOpen(false)}
                    />
                </>
            )}
        </div>
    );
}
