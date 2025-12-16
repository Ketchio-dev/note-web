"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { X, Send, Trash2, CheckCircle, Circle, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
    id: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: any;
    resolved: boolean;
    replies?: Comment[];
}

interface CommentsSidebarProps {
    pageId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function CommentsSidebar({ pageId, isOpen, onClose }: CommentsSidebarProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);

    // Subscribe to comments
    useEffect(() => {
        if (!pageId || !isOpen) return;

        const q = query(
            collection(db, 'pages', pageId, 'comments'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cms: Comment[] = [];
            snapshot.forEach(doc => {
                cms.push({ id: doc.id, ...doc.data() } as Comment);
            });
            setComments(cms);
        });

        return () => unsubscribe();
    }, [pageId, isOpen]);

    const addComment = async () => {
        if (!newComment.trim() || !user) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'pages', pageId, 'comments'), {
                userId: user.uid,
                userName: user.displayName || user.email || 'Anonymous',
                content: newComment,
                createdAt: serverTimestamp(),
                resolved: false,
                replies: []
            });
            setNewComment('');
        } catch (e) {
            console.error('Failed to add comment:', e);
        } finally {
            setLoading(false);
        }
    };

    const deleteComment = async (commentId: string) => {
        if (!confirm('Delete this comment?')) return;

        try {
            await deleteDoc(doc(db, 'pages', pageId, 'comments', commentId));
        } catch (e) {
            console.error('Failed to delete comment:', e);
        }
    };

    const toggleResolved = async (commentId: string, currentResolved: boolean) => {
        try {
            await updateDoc(doc(db, 'pages', pageId, 'comments', commentId), {
                resolved: !currentResolved
            });
        } catch (e) {
            console.error('Failed to update comment:', e);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-[#1C1C1C] border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <MessageSquare size={20} className="text-gray-600 dark:text-gray-400" />
                    <h3 className="font-semibold text-lg">Comments</h3>
                    <span className="text-sm text-gray-500">({comments.length})</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
                        <p>No comments yet</p>
                        <p className="text-sm mt-1">Start a discussion!</p>
                    </div>
                ) : (
                    comments.map(comment => (
                        <div
                            key={comment.id}
                            className={`p-3 rounded-lg border transition ${comment.resolved
                                    ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-60'
                                    : 'bg-white dark:bg-[#252525] border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                        {comment.userName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">{comment.userName}</div>
                                        <div className="text-xs text-gray-500">
                                            {comment.createdAt && formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => toggleResolved(comment.id, comment.resolved)}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                                        title={comment.resolved ? 'Reopen' : 'Resolve'}
                                    >
                                        {comment.resolved ? (
                                            <CheckCircle size={16} className="text-green-600" />
                                        ) : (
                                            <Circle size={16} className="text-gray-400" />
                                        )}
                                    </button>
                                    {user?.uid === comment.userId && (
                                        <button
                                            onClick={() => deleteComment(comment.id)}
                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} className="text-red-600" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <p className={`text-sm whitespace-pre-wrap ${comment.resolved ? 'line-through' : ''}`}>
                                {comment.content}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* New Comment Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            addComment();
                        }
                    }}
                />
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                        Cmd/Ctrl + Enter to send
                    </span>
                    <button
                        onClick={addComment}
                        disabled={!newComment.trim() || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        <Send size={14} />
                        {loading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
}
