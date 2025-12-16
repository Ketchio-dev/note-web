import React, { useState, useEffect } from 'react';
import { X, Globe, Lock, Copy, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface ShareDialogProps {
    pageId: string;
    isOpen: boolean;
    onClose: () => void;
}

interface SharedUser {
    userId: string;
    userName: string;
    userEmail?: string;
    role: 'editor' | 'viewer';
}

export function ShareDialog({ pageId, isOpen, onClose }: ShareDialogProps) {
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'editor' | 'viewer'>('editor');
    const [loading, setLoading] = useState(false);
    const [permissions, setPermissions] = useState<any>(null);
    const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);

    useEffect(() => {
        if (isOpen && pageId) {
            loadPermissions();
        }
    }, [isOpen, pageId]);

    const loadPermissions = async () => {
        try {
            const res = await fetch(`/api/pages/${pageId}/permissions`);
            const data = await res.json();

            if (res.ok) {
                setPermissions(data.permissions);

                // Fetch actual user data for shared users
                const userEntries = Object.entries(data.permissions.shared || {});
                const usersWithData = await Promise.all(
                    userEntries.map(async ([userId, role]) => {
                        try {
                            const userDoc = await getDoc(doc(db, 'users', userId));
                            const userData = userDoc.data();
                            return {
                                userId,
                                userName: userData?.displayName || userData?.email || 'Unknown User',
                                userEmail: userData?.email,
                                role: role as 'editor' | 'viewer'
                            };
                        } catch (e) {
                            // Fallback if user data not found
                            return {
                                userId,
                                userName: userId.slice(0, 8),
                                role: role as 'editor' | 'viewer'
                            };
                        }
                    })
                );
                setSharedUsers(usersWithData);
            }
        } catch (e) {
            console.error('Failed to load permissions:', e);
        }
    };

    const handleInvite = async () => {
        if (!email) {
            toast.error('Please enter an email');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/pages/${pageId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || 'Invitation sent!');
                setEmail('');
                setRole('viewer');
                loadPermissions(); // Refresh
            } else {
                toast.error(data.error || 'Failed to send invitation');
            }
        } catch (e: any) {
            console.error('Invite error:', e);
            toast.error('Failed to send invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveUser = async (userId: string) => {
        try {
            const res = await fetch(`/api/pages/${pageId}/permissions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: null }) // null = remove
            });

            if (res.ok) {
                toast.success('User removed');
                loadPermissions();
            } else {
                toast.error('Failed to remove user');
            }
        } catch (e) {
            toast.error('Failed to remove user');
        }
    };

    const handleCopyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        toast.success('Link copied!');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Share</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Invite Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Invite people</label>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder="Email address..."
                                className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                            />
                            <select
                                className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] rounded px-2 text-sm text-gray-900 dark:text-gray-100"
                                value={role}
                                onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                            >
                                <option value="editor">Can edit</option>
                                <option value="viewer">Can view</option>
                            </select>
                            <button
                                onClick={handleInvite}
                                disabled={loading || !email}
                                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Sending...' : 'Invite'}
                            </button>
                        </div>
                    </div>

                    {/* Shared Users List */}
                    {sharedUsers.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">People with access</label>
                            <div className="space-y-1">
                                {sharedUsers.map((sharedUser) => (
                                    <div key={sharedUser.userId} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                                {sharedUser.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{sharedUser.userName}</div>
                                                {sharedUser.userEmail && (
                                                    <div className="text-xs text-gray-500">{sharedUser.userEmail}</div>
                                                )}
                                                <div className="text-xs text-gray-500 mt-0.5">{sharedUser.role === 'editor' ? 'Can edit' : 'Can view'}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveUser(sharedUser.userId)}
                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                            title="Remove access"
                                        >
                                            <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* General Access */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">General access</h3>
                        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-[#252525] rounded-lg">
                            <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full">
                                <Lock size={16} className="text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Restricted</div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Only people with access can view
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex justify-between items-center">
                        <button
                            onClick={handleCopyLink}
                            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        >
                            <Copy size={16} />
                            Copy link
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
