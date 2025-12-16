/**
 * Collaborative Cursors Component
 * Shows real-time cursors of other users editing the same page
 */

"use client";

import { useEffect, useState } from 'react';
import { Awareness } from 'y-protocols/awareness';

interface CursorData {
    userId: string;
    userName?: string;
    color: string;
    cursor?: { line: number; ch: number };
    selection?: { from: { line: number; ch: number }; to: { line: number; ch: number } };
}

interface CollaborativeCursorsProps {
    awareness: Awareness;
}

export function CollaborativeCursors({ awareness }: CollaborativeCursorsProps) {
    const [cursors, setCursors] = useState<Map<number, CursorData>>(new Map());

    useEffect(() => {
        const updateCursors = () => {
            const states = awareness.getStates();
            const cursorMap = new Map<number, CursorData>();

            states.forEach((state, clientId) => {
                // Skip own cursor
                if (clientId === awareness.clientID) return;

                const user = state.user;
                if (user && user.cursor) {
                    cursorMap.set(clientId, {
                        userId: user.userId || `user-${clientId}`,
                        userName: user.userName || 'Anonymous',
                        color: user.color || '#888',
                        cursor: user.cursor,
                        selection: user.selection,
                    });
                }
            });

            setCursors(cursorMap);
        };

        awareness.on('change', updateCursors);
        updateCursors(); // Initial update

        return () => {
            awareness.off('change', updateCursors);
        };
    }, [awareness]);

    return (
        <div className="collaborative-cursors">
            {Array.from(cursors.entries()).map(([clientId, cursorData]) => (
                <div
                    key={clientId}
                    className="absolute pointer-events-none z-50"
                    style={{
                        // Position would be calculated based on cursor.line and cursor.ch
                        // This is a simplified version
                        top: `${(cursorData.cursor?.line || 0) * 24}px`,
                        left: `${(cursorData.cursor?.ch || 0) * 8}px`,
                    }}
                >
                    {/* Cursor indicator */}
                    <div
                        className="w-0.5 h-5 animate-pulse"
                        style={{ backgroundColor: cursorData.color }}
                    />

                    {/* User label */}
                    <div
                        className="absolute top-0 left-2 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
                        style={{ backgroundColor: cursorData.color }}
                    >
                        {cursorData.userName}
                    </div>

                    {/* Selection highlight (if any) */}
                    {cursorData.selection && (
                        <div
                            className="absolute opacity-20"
                            style={{
                                backgroundColor: cursorData.color,
                                // Would calculate actual dimensions based on selection
                                height: '20px',
                                width: '100px',
                            }}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

/**
 * Active Users List
 * Shows who's currently viewing/editing the page
 */
interface ActiveUser {
    userId: string;
    userName: string;
    color: string;
}

interface ActiveUsersListProps {
    awareness: Awareness;
}

export function ActiveUsersList({ awareness }: ActiveUsersListProps) {
    const [users, setUsers] = useState<ActiveUser[]>([]);

    useEffect(() => {
        const updateUsers = () => {
            const states = awareness.getStates();
            const userList: ActiveUser[] = [];

            states.forEach((state, clientId) => {
                // Skip self
                if (clientId === awareness.clientID) return;

                const user = state.user;
                if (user) {
                    userList.push({
                        userId: user.userId || `client-${clientId}`,
                        userName: user.userName || 'Anonymous',
                        color: user.color || '#888',
                    });
                }
            });

            setUsers(userList);
        };

        awareness.on('change', updateUsers);
        updateUsers();

        return () => {
            awareness.off('change', updateUsers);
        };
    }, [awareness]);

    if (users.length === 0) return null;

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm">
            <div className="flex items-center -space-x-2">
                {users.slice(0, 3).map((user, index) => (
                    <div
                        key={user.userId}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-medium border-2 border-white dark:border-gray-900"
                        style={{ backgroundColor: user.color }}
                        title={user.userName}
                    >
                        {user.userName.charAt(0).toUpperCase()}
                    </div>
                ))}
                {users.length > 3 && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-gray-400 text-white border-2 border-white dark:border-gray-900">
                        +{users.length - 3}
                    </div>
                )}
            </div>
            <span>
                {users.length} {users.length === 1 ? 'person' : 'people'} editing
            </span>
        </div>
    );
}
