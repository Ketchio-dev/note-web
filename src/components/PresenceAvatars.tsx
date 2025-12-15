"use client";

import { Users } from 'lucide-react';
import { usePresence, PresenceUser } from '@/hooks/usePresence';

interface PresenceAvatarsProps {
    pageId: string;
    userId: string;
}

export default function PresenceAvatars({ pageId, userId }: PresenceAvatarsProps) {
    const { activeUsers } = usePresence(pageId, userId);

    if (activeUsers.length === 0) return null;

    return (
        <div className="flex items-center gap-2">
            {/* User avatars */}
            <div className="flex -space-x-2">
                {activeUsers.slice(0, 3).map((user) => (
                    <div
                        key={user.userId}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white ring-2 ring-white dark:ring-[#191919] transition-transform hover:scale-110 hover:z-10"
                        style={{ backgroundColor: user.color }}
                        title={user.userName}
                    >
                        {user.userName.charAt(0).toUpperCase()}
                    </div>
                ))}

                {activeUsers.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-[#191919]">
                        +{activeUsers.length - 3}
                    </div>
                )}
            </div>

            {/* Active indicator */}
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>{activeUsers.length} viewing</span>
            </div>
        </div>
    );
}
