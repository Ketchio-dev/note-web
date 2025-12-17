/**
 * Keyboard Shortcuts System
 * Global keyboard shortcut manager with customizable shortcuts
 */

import { useEffect, useCallback, useState } from 'react';

export interface Shortcut {
    id: string;
    name: string;
    description: string;
    keys: string[]; // e.g., ['Cmd', 'K'] or ['Ctrl', 'Shift', 'P']
    category: 'navigation' | 'editing' | 'formatting' | 'ai' | 'database' | 'general';
    handler: () => void;
    enabled?: boolean;
}

export interface ShortcutConfig {
    id: string;
    keys: string[];
    enabled: boolean;
}

const STORAGE_KEY = 'keyboard-shortcuts-config';

/**
 * Get OS-specific modifier key name
 */
export function getModifierKey(): 'Cmd' | 'Ctrl' {
    return typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl';
}

/**
 * Normalize key for comparison
 */
function normalizeKey(key: string): string {
    const keyMap: Record<string, string> = {
        'Control': 'Ctrl',
        'Command': 'Cmd',
        'Meta': 'Cmd',
        'Alt': 'Alt',
        'Option': 'Alt',
        'Shift': 'Shift',
    };

    return keyMap[key] || key.toUpperCase();
}

/**
 * Check if keys match
 */
function keysMatch(pressed: string[], shortcut: string[]): boolean {
    if (pressed.length !== shortcut.length) return false;

    const normalizedPressed = pressed.map(normalizeKey).sort();
    const normalizedShortcut = shortcut.map(normalizeKey).sort();

    return normalizedPressed.every((key, i) => key === normalizedShortcut[i]);
}

/**
 * Load saved shortcut config from localStorage
 */
function loadShortcutConfig(): ShortcutConfig[] {
    if (typeof window === 'undefined') return [];

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * Save shortcut config to localStorage
 */
function saveShortcutConfig(config: ShortcutConfig[]) {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.error('Failed to save shortcut config:', e);
    }
}

/**
 * Hook for using keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
    const [config, setConfig] = useState<ShortcutConfig[]>([]);

    // Load config on mount
    useEffect(() => {
        const saved = loadShortcutConfig();
        setConfig(saved);
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const pressedKeys: string[] = [];

        if (e.ctrlKey || e.metaKey) pressedKeys.push(getModifierKey());
        if (e.shiftKey) pressedKeys.push('Shift');
        if (e.altKey) pressedKeys.push('Alt');

        const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        if (!['Control', 'Meta', 'Shift', 'Alt', 'Option', 'Command'].includes(e.key)) {
            pressedKeys.push(key);
        }

        // Check if any shortcut matches
        for (const shortcut of shortcuts) {
            // Get custom config or use default
            const customConfig = config.find(c => c.id === shortcut.id);
            const keys = customConfig?.keys || shortcut.keys;
            const enabled = customConfig?.enabled !== false && shortcut.enabled !== false;

            if (!enabled) continue;

            if (keysMatch(pressedKeys, keys)) {
                e.preventDefault();
                e.stopPropagation();
                shortcut.handler();
                return;
            }
        }
    }, [shortcuts, config]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const updateShortcut = useCallback((id: string, newKeys: string[]) => {
        const newConfig = config.filter(c => c.id !== id);
        newConfig.push({ id, keys: newKeys, enabled: true });
        setConfig(newConfig);
        saveShortcutConfig(newConfig);
    }, [config]);

    const toggleShortcut = useCallback((id: string) => {
        const existing = config.find(c => c.id === id);
        const newConfig = config.filter(c => c.id !== id);

        newConfig.push({
            id,
            keys: existing?.keys || shortcuts.find(s => s.id === id)?.keys || [],
            enabled: !existing?.enabled,
        });

        setConfig(newConfig);
        saveShortcutConfig(newConfig);
    }, [config, shortcuts]);

    const resetShortcut = useCallback((id: string) => {
        const newConfig = config.filter(c => c.id !== id);
        setConfig(newConfig);
        saveShortcutConfig(newConfig);
    }, [config]);

    return {
        updateShortcut,
        toggleShortcut,
        resetShortcut,
        config,
    };
}

/**
 * Format shortcut keys for display
 */
export function formatShortcutKeys(keys: string[]): string {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

    return keys.map(key => {
        if (key === 'Cmd' && isMac) return '⌘';
        if (key === 'Ctrl' && !isMac) return 'Ctrl';
        if (key === 'Shift') return '⇧';
        if (key === 'Alt') return isMac ? '⌥' : 'Alt';
        return key;
    }).join(isMac ? '' : '+');
}

/**
 * Get all default shortcuts
 */
export function getDefaultShortcuts(): Omit<Shortcut, 'handler'>[] {
    const mod = getModifierKey();

    return [
        // Navigation
        {
            id: 'quick-search',
            name: 'Quick Search',
            description: 'Open quick search',
            keys: [mod, 'K'],
            category: 'navigation',
        },
        {
            id: 'command-palette',
            name: 'Command Palette',
            description: 'Open command palette',
            keys: [mod, 'Shift', 'P'],
            category: 'navigation',
        },
        {
            id: 'goto-home',
            name: 'Go to Home',
            description: 'Navigate to home',
            keys: [mod, 'H'],
            category: 'navigation',
        },

        // Editing
        {
            id: 'new-page',
            name: 'New Page',
            description: 'Create new page',
            keys: [mod, 'N'],
            category: 'editing',
        },
        {
            id: 'duplicate-block',
            name: 'Duplicate Block',
            description: 'Duplicate current block',
            keys: [mod, 'D'],
            category: 'editing',
        },
        {
            id: 'delete-block',
            name: 'Delete Block',
            description: 'Delete selected block',
            keys: ['Backspace'],
            category: 'editing',
        },

        // Formatting
        {
            id: 'bold',
            name: 'Bold',
            description: 'Toggle bold',
            keys: [mod, 'B'],
            category: 'formatting',
        },
        {
            id: 'italic',
            name: 'Italic',
            description: 'Toggle italic',
            keys: [mod, 'I'],
            category: 'formatting',
        },
        {
            id: 'underline',
            name: 'Underline',
            description: 'Toggle underline',
            keys: [mod, 'U'],
            category: 'formatting',
        },
        {
            id: 'code',
            name: 'Code',
            description: 'Toggle code',
            keys: [mod, 'E'],
            category: 'formatting',
        },

        // AI
        {
            id: 'ai-assistant',
            name: 'AI Assistant',
            description: 'Open AI assistant',
            keys: [mod, 'J'],
            category: 'ai',
        },
        {
            id: 'ai-improve',
            name: 'AI Improve Writing',
            description: 'Improve selected text',
            keys: [mod, 'Shift', 'I'],
            category: 'ai',
        },

        // Database
        {
            id: 'filter',
            name: 'Filter',
            description: 'Open filter menu',
            keys: [mod, 'Shift', 'F'],
            category: 'database',
        },
        {
            id: 'sort',
            name: 'Sort',
            description: 'Open sort menu',
            keys: [mod, 'Shift', 'S'],
            category: 'database',
        },

        // General
        {
            id: 'save',
            name: 'Save',
            description: 'Save current page',
            keys: [mod, 'S'],
            category: 'general',
        },
        {
            id: 'undo',
            name: 'Undo',
            description: 'Undo last action',
            keys: [mod, 'Z'],
            category: 'general',
        },
        {
            id: 'redo',
            name: 'Redo',
            description: 'Redo last action',
            keys: [mod, 'Shift', 'Z'],
            category: 'general',
        },
        {
            id: 'help',
            name: 'Help',
            description: 'Show keyboard shortcuts',
            keys: [mod, '/'],
            category: 'general',
        },
    ];
}
