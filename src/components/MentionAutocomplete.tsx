/**
 * Mention Autocomplete Component
 * @mention autocomplete for comments
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface User {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
}

interface MentionAutocompleteProps {
    searchQuery: string;
    onSelect: (user: User) => void;
    position: { top: number; left: number };
}

export function MentionAutocomplete({ searchQuery, onSelect, position }: MentionAutocompleteProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    // Fetch workspace users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // In production, fetch from workspace members collection
                // For now, mock data
                const mockUsers: User[] = [
                    { uid: '1', displayName: 'John Doe', email: 'john@example.com' },
                    { uid: '2', displayName: 'Jane Smith', email: 'jane@example.com' },
                    { uid: '3', displayName: 'Bob Johnson', email: 'bob@example.com' },
                ];

                // Filter based on search query
                const filtered = mockUsers.filter(u =>
                    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchQuery.toLowerCase())
                );

                setUsers(filtered);
                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch users:', error);
                setLoading(false);
            }
        };

        fetchUsers();
    }, [searchQuery]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, users.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (users[selectedIndex]) {
                    onSelect(users[selectedIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, users, onSelect]);

    if (loading) {
        return (
            <div
                className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-500"
                style={{ top: position.top, left: position.left }}
            >
                Loading...
            </div>
        );
    }

    if (users.length === 0) {
        return null;
    }

    return (
        <div
            className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-64"
            style={{ top: position.top, left: position.left }}
        >
            {users.map((user, index) => (
                <button
                    key={user.uid}
                    onClick={() => onSelect(user)}
                    className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {user.displayName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}

/**
 * Parse comment text to highlight mentions
 */
export function parseMentions(text: string): React.ReactNode[] {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        // Add text before mention
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        // Add mention as styled component
        const displayName = match[1];
        const userId = match[2];
        parts.push(
            <span
                key={match.index}
                className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm font-medium"
            >
                @{displayName}
            </span>
        );

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
}

/**
 * Insert mention into text
 */
export function insertMention(
    currentText: string,
    cursorPosition: number,
    user: User,
    mentionStartIndex: number
): { newText: string; newCursorPosition: number } {
    const mentionText = `@[${user.displayName}](${user.uid})`;

    const before = currentText.slice(0, mentionStartIndex);
    const after = currentText.slice(cursorPosition);
    const newText = before + mentionText + after;
    const newCursorPosition = before.length + mentionText.length;

    return { newText, newCursorPosition };
}

/**
 * Extract mentioned user IDs from text
 */
export function extractMentions(text: string): string[] {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const userIds: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        userIds.push(match[2]); // User ID is in group 2
    }

    return userIds;
}
