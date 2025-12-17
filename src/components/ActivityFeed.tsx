/**
 * Activity Feed System
 * Track and display user activities and page changes
 */

"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    serverTimestamp,
    where
} from 'firebase/firestore';
import {
    FileText,
    Trash2,
    Edit3,
    MessageSquare,
    Users,
    Clock,
    Eye,
    Copy,
    Share2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Activity {
    id: string;
    type: 'page_created' | 'page_edited' | 'page_deleted' | 'comment_added' | 'page_shared' | 'page_viewed' | 'page_duplicated';
    userId: string;
    userName: string;
    userPhoto?: string;
    pageId: string;
    pageTitle: string;
    workspaceId: string;
    metadata?: {
        oldTitle?: string;
        newTitle?: string;
        commentText?: string;
        sharedWith?: string;
    };
    timestamp: any;
}

interface ActivityFeedProps {
    workspaceId: string;
    pageId?: string; // If provided, show page-specific activities
    maxItems?: number;
}

export default function ActivityFeed({ workspaceId, pageId, maxItems = 50 }: ActivityFeedProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'edits' | 'comments' | 'shares'>('all');

    useEffect(() => {
        const activitiesRef = collection(db, 'activities');
        let q = query(
            activitiesRef,
            where('workspaceId', '==', workspaceId),
            orderBy('timestamp', 'desc'),
            limit(maxItems)
        );

        // Add page filter if provided
        if (pageId) {
            q = query(
                activitiesRef,
                where('workspaceId', '==', workspaceId),
                where('pageId', '==', pageId),
                orderBy('timestamp', 'desc'),
                limit(maxItems)
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedActivities: Activity[] = [];
            snapshot.forEach((doc) => {
                fetchedActivities.push({ id: doc.id, ...doc.data() } as Activity);
            });
            setActivities(fetchedActivities);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [workspaceId, pageId, maxItems]);

    const filteredActivities = activities.filter(activity => {
        if (filter === 'all') return true;
        if (filter === 'edits') return activity.type.includes('edit') || activity.type.includes('created');
        if (filter === 'comments') return activity.type === 'comment_added';
        if (filter === 'shares') return activity.type.includes('shared');
        return true;
    });

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading activities...</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold mb-3">Activity Feed</h3>

                {/* Filters */}
                <div className="flex gap-2">
                    <FilterButton
                        active={filter === 'all'}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </FilterButton>
                    <FilterButton
                        active={filter === 'edits'}
                        onClick={() => setFilter('edits')}
                    >
                        Edits
                    </FilterButton>
                    <FilterButton
                        active={filter === 'comments'}
                        onClick={() => setFilter('comments')}
                    >
                        Comments
                    </FilterButton>
                    <FilterButton
                        active={filter === 'shares'}
                        onClick={() => setFilter('shares')}
                    >
                        Shares
                    </FilterButton>
                </div>
            </div>

            {/* Activity List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
                {filteredActivities.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Clock size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No activity yet</p>
                    </div>
                ) : (
                    filteredActivities.map(activity => (
                        <ActivityItem key={activity.id} activity={activity} />
                    ))
                )}
            </div>
        </div>
    );
}

/**
 * Filter Button Component
 */
interface FilterButtonProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

function FilterButton({ active, onClick, children }: FilterButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${active
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
        >
            {children}
        </button>
    );
}

/**
 * Activity Item Component
 */
interface ActivityItemProps {
    activity: Activity;
}

function ActivityItem({ activity }: ActivityItemProps) {
    const { icon: Icon, color, text } = getActivityDetails(activity);

    return (
        <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
            <div className="flex items-start gap-3">
                {/* User Avatar */}
                {activity.userPhoto ? (
                    <img
                        src={activity.userPhoto}
                        alt={activity.userName}
                        className="w-8 h-8 rounded-full"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                        {activity.userName[0].toUpperCase()}
                    </div>
                )}

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                        <Icon size={16} className={`mt-0.5 flex-shrink-0 ${color}`} />
                        <div className="flex-1">
                            <p className="text-sm">
                                <span className="font-medium">{activity.userName}</span>{' '}
                                <span className="text-gray-600 dark:text-gray-400">{text}</span>{' '}
                                <span className="font-medium">{activity.pageTitle}</span>
                            </p>

                            {/* Metadata */}
                            {activity.metadata && (
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {activity.metadata.commentText && (
                                        <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                                            "{activity.metadata.commentText}"
                                        </div>
                                    )}
                                    {activity.metadata.oldTitle && activity.metadata.newTitle && (
                                        <div>
                                            Renamed from "{activity.metadata.oldTitle}" to "{activity.metadata.newTitle}"
                                        </div>
                                    )}
                                    {activity.metadata.sharedWith && (
                                        <div>Shared with {activity.metadata.sharedWith}</div>
                                    )}
                                </div>
                            )}

                            {/* Timestamp */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {activity.timestamp?.toDate
                                    ? formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true })
                                    : 'Just now'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Get activity icon, color, and text
 */
function getActivityDetails(activity: Activity): {
    icon: any;
    color: string;
    text: string;
} {
    switch (activity.type) {
        case 'page_created':
            return {
                icon: FileText,
                color: 'text-green-600',
                text: 'created',
            };
        case 'page_edited':
            return {
                icon: Edit3,
                color: 'text-blue-600',
                text: 'edited',
            };
        case 'page_deleted':
            return {
                icon: Trash2,
                color: 'text-red-600',
                text: 'deleted',
            };
        case 'comment_added':
            return {
                icon: MessageSquare,
                color: 'text-purple-600',
                text: 'commented on',
            };
        case 'page_shared':
            return {
                icon: Share2,
                color: 'text-orange-600',
                text: 'shared',
            };
        case 'page_viewed':
            return {
                icon: Eye,
                color: 'text-gray-600',
                text: 'viewed',
            };
        case 'page_duplicated':
            return {
                icon: Copy,
                color: 'text-teal-600',
                text: 'duplicated',
            };
        default:
            return {
                icon: FileText,
                color: 'text-gray-600',
                text: 'interacted with',
            };
    }
}

/**
 * Helper function to log activity
 */
export async function logActivity(activity: Omit<Activity, 'id' | 'timestamp'>) {
    try {
        await addDoc(collection(db, 'activities'), {
            ...activity,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}
