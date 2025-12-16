"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    setDoc,
    onSnapshot,
    deleteDoc,
    serverTimestamp,
    query,
    where
} from 'firebase/firestore';

export interface PresenceUser {
    userId: string;
    userName: string;
    userAvatar?: string;
    color: string; // For cursor color
    lastSeen: Date;
}

/**
 * Real-time presence hook for collaborative editing
 * Shows who's currently viewing/editing the page
 */
export function usePresence(
    pageId: string | null,
    userId: string | null,
    userName?: string,
    userAvatar?: string
) {
    const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);

    useEffect(() => {
        if (!pageId || !userId) return;

        const presenceRef = doc(db, 'pages', pageId, 'presence', userId);

        // Generate a consistent color per user
        const userColor = `hsl(${Math.abs(hashCode(userId)) % 360}, 70%, 60%)`;

        // Set own presence
        const setPresence = async () => {
            try {
                await setDoc(presenceRef, {
                    userId,
                    userName: userName || 'Anonymous',
                    userAvatar: userAvatar,
                    color: userColor,
                    lastSeen: serverTimestamp()
                }, { merge: true });
            } catch (error) {
                console.error('Failed to set presence:', error);
            }
        };

        setPresence();

        // Update presence every 30 seconds (heartbeat)
        const heartbeat = setInterval(setPresence, 30000);

        // Listen to all presence
        const presenceCollectionRef = collection(db, 'pages', pageId, 'presence');
        const unsubscribe = onSnapshot(presenceCollectionRef, (snapshot) => {
            const users: PresenceUser[] = [];
            const now = new Date();

            snapshot.docs.forEach((doc) => {
                const data = doc.data();

                // Only show users active in last 2 minutes
                const lastSeen = data.lastSeen?.toDate() || now;
                const secondsAgo = (now.getTime() - lastSeen.getTime()) / 1000;

                if (secondsAgo < 120 && doc.id !== userId) {
                    users.push({
                        userId: doc.id,
                        userName: data.userName || 'Anonymous',
                        userAvatar: data.userAvatar,
                        color: data.color || '#888',
                        lastSeen
                    });
                }
            });

            setActiveUsers(users);
        });

        // Cleanup on unmount
        return () => {
            clearInterval(heartbeat);
            unsubscribe();
            deleteDoc(presenceRef).catch(console.error);
        };
    }, [pageId, userId, userName, userAvatar]);

    return { activeUsers };
}

// Simple hash function for consistent colors
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}
