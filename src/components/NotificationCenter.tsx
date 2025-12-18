/**
 * Notification System
 * In-app notifications for mentions, comments, and activity
 */

"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { Bell, X, Check, MessageSquare, AtSign, FileText, UserPlus, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Notification {
    id: string;
    type: 'mention' | 'comment' | 'page_shared' | 'invite' | 'page_edited';
    userId: string;
    fromUserId: string;
    fromUserName: string;
    fromUserPhoto?: string;
    title: string;
    message: string;
    actionUrl?: string;
    read: boolean;
    createdAt: Timestamp;
    metadata?: {
        pageId?: string;
        pageTitle?: string;
        commentId?: string;
        workspaceId?: string;
    };
}

interface NotificationCenterProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationCenter({ userId, isOpen, onClose }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        if (!userId) return;

        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotifications: Notification[] = [];
            snapshot.forEach((doc) => {
                fetchedNotifications.push({ id: doc.id, ...doc.data() } as Notification);
            });

            setNotifications(fetchedNotifications);
            setUnreadCount(fetchedNotifications.filter(n => !n.read).length);
        }, (error) => {
            console.error("Error fetching notifications:", error);
        });

        return () => unsubscribe();
    }, [userId]);

    const markAsRead = async (notificationId: string) => {
        try {
            const notifRef = doc(db, 'notifications', notificationId);
            await updateDoc(notifRef, { read: true });
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        const unreadNotifications = notifications.filter(n => !n.read);
        const promises = unreadNotifications.map(n => markAsRead(n.id));
        await Promise.all(promises);
    };

    const filteredNotifications = filter === 'all'
        ? notifications
        : notifications.filter(n => !n.read);

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-0 h-screen w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <Bell size={20} />
                    <h2 className="font-semibold">Notifications</h2>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex gap-2">
                    <FilterButton
                        active={filter === 'all'}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </FilterButton>
                    <FilterButton
                        active={filter === 'unread'}
                        onClick={() => setFilter('unread')}
                    >
                        Unread ({unreadCount})
                    </FilterButton>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                        <CheckCircle size={14} />
                        Mark all read
                    </button>
                )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Bell size={48} className="mx-auto mb-4 opacity-30" />
                        <p>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
                    </div>
                ) : (
                    filteredNotifications.map(notification => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={markAsRead}
                            onClick={onClose}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

interface NotificationItemProps {
    notification: Notification;
    onMarkAsRead: (id: string) => void;
    onClick: () => void;
}

function NotificationItem({ notification, onMarkAsRead, onClick }: NotificationItemProps) {
    const Icon = getNotificationIcon(notification.type);

    const handleClick = () => {
        if (!notification.read) {
            onMarkAsRead(notification.id);
        }
        if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
            onClick();
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                }`}
        >
            <div className="flex items-start gap-3">
                {/* User Avatar */}
                {notification.fromUserPhoto ? (
                    <img
                        src={notification.fromUserPhoto}
                        alt={notification.fromUserName}
                        className="w-10 h-10 rounded-full"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        {notification.fromUserName[0].toUpperCase()}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    {/* Icon and Title */}
                    <div className="flex items-start gap-2 mb-1">
                        <Icon size={16} className="mt-0.5 flex-shrink-0 text-blue-600" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                {notification.message}
                            </p>
                        </div>
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {notification.createdAt?.toDate
                            ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })
                            : 'Just now'}
                    </p>
                </div>

                {/* Unread Indicator */}
                {!notification.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                )}
            </div>
        </div>
    );
}

function getNotificationIcon(type: Notification['type']) {
    switch (type) {
        case 'mention':
            return AtSign;
        case 'comment':
            return MessageSquare;
        case 'page_shared':
        case 'page_edited':
            return FileText;
        case 'invite':
            return UserPlus;
        default:
            return Bell;
    }
}

/**
 * Create notification
 */
export async function createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) {
    try {
        await addDoc(collection(db, 'notifications'), {
            ...notification,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
}

/**
 * Notification Badge Component (for navbar)
 */

interface NotificationBadgeProps {
    userId: string;
    onClick: () => void;
}

export function NotificationBadge({ userId, onClick }: NotificationBadgeProps) {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!userId) return;

        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            where('read', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [userId]);

    return (
        <button
            onClick={onClick}
            className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
        >
            <Bell size={20} />
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
}
