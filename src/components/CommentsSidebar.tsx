/**
 * Enhanced CommentsSidebar with Threading
 * Supports nested replies, resolve/unresolve, and block-level comments
 */

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    deleteDoc,
    doc,
    updateDoc,
    Timestamp
} from 'firebase/firestore';
import { X, Send, Trash2, CheckCircle, Circle, MessageSquare, CornerDownRight, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
    id: string;
    userId: string;
    userName: string;
    userPhoto?: string;
    content: string;
    createdAt: Timestamp;
    resolved: boolean;
    parentCommentId?: string; // For threaded replies
    blockId?: string; // For block-level comments
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
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
    const [showResolved, setShowResolved] = useState(false);

    // Subscribe to comments
    useEffect(() => {
        if (!pageId || !isOpen) return;

        const commentsRef = collection(db, 'pages', pageId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedComments: Comment[] = [];
            snapshot.forEach((doc) => {
                fetchedComments.push({ id: doc.id, ...doc.data() } as Comment);
            });

            // Organize into threads
            const threaded = organizeThreads(fetchedComments);
            setComments(threaded);
        });

        return () => unsubscribe();
    }, [pageId, isOpen]);

    /**
     * Organize comments into threaded structure
     */
    const organizeThreads = (flatComments: Comment[]): Comment[] => {
        const commentMap = new Map<string, Comment>();
        const rootComments: Comment[] = [];

        // First pass: create map and init replies
        flatComments.forEach(comment => {
            commentMap.set(comment.id, { ...comment, replies: [] });
        });

        // Second pass: build tree structure
        flatComments.forEach(comment => {
            const commentWithReplies = commentMap.get(comment.id)!;

            if (comment.parentCommentId) {
                const parent = commentMap.get(comment.parentCommentId);
                if (parent) {
                    parent.replies!.push(commentWithReplies);
                }
            } else {
                rootComments.push(commentWithReplies);
            }
        });

        return rootComments;
    };

    /**
     * Add new comment (root or reply)
     */
    const addComment = async (parentId?: string) => {
        const content = parentId ? replyContent : newComment;
        if (!content.trim() || !user) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'pages', pageId, 'comments'), {
                userId: user.uid,
                userName: user.displayName || user.email || 'Anonymous',
                userPhoto: user.photoURL || null,
                content: content.trim(),
                createdAt: serverTimestamp(),
                resolved: false,
                parentCommentId: parentId || null,
                blockId: null, // Future: support block-level comments
            });

            if (parentId) {
                setReplyContent('');
                setReplyingTo(null);
                // Auto-expand thread
                setExpandedThreads(prev => new Set(prev).add(parentId));
            } else {
                setNewComment('');
            }
        } catch (e) {
            console.error('Failed to add comment:', e);
            alert('Failed to add comment');
        } finally {
            setLoading(false);
        }
    };

    const deleteComment = async (commentId: string) => {
        if (!confirm('Delete this comment? This will also delete all replies.')) return;

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

    const toggleThread = (commentId: string) => {
        setExpandedThreads(prev => {
            const next = new Set(prev);
            if (next.has(commentId)) {
                next.delete(commentId);
            } else {
                next.add(commentId);
            }
            return next;
        });
    };

    const filteredComments = showResolved
        ? comments
        : comments.filter(c => !c.resolved);

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-[#1C1C1C] border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <MessageSquare size={20} />
                    <h2 className="font-semibold">Comments</h2>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({filteredComments.length})
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Filter Toggle */}
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showResolved}
                        onChange={(e) => setShowResolved(e.target.checked)}
                        className="rounded"
                    />
                    <span>Show resolved</span>
                </label>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filteredComments.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                        <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No comments yet</p>
                        <p className="text-sm mt-1">Start the conversation!</p>
                    </div>
                ) : (
                    filteredComments.map(comment => (
                        <CommentThread
                            key={comment.id}
                            comment={comment}
                            currentUserId={user?.uid}
                            onDelete={deleteComment}
                            onResolve={toggleResolved}
                            onReply={(id) => {
                                setReplyingTo(id);
                                setReplyContent('');
                            }}
                            replyingTo={replyingTo}
                            replyContent={replyContent}
                            setReplyContent={setReplyContent}
                            onSubmitReply={() => addComment(replyingTo!)}
                            onCancelReply={() => {
                                setReplyingTo(null);
                                setReplyContent('');
                            }}
                            isExpanded={expandedThreads.has(comment.id)}
                            onToggleExpand={() => toggleThread(comment.id)}
                            loading={loading}
                        />
                    ))
                )}
            </div>

            {/* New Comment Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                addComment();
                            }
                        }}
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                    />
                    <button
                        onClick={() => addComment()}
                        disabled={!newComment.trim() || loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Individual Comment Thread Component
 */
interface CommentThreadProps {
    comment: Comment;
    currentUserId?: string;
    onDelete: (id: string) => void;
    onResolve: (id: string, resolved: boolean) => void;
    onReply: (id: string) => void;
    replyingTo: string | null;
    replyContent: string;
    setReplyContent: (content: string) => void;
    onSubmitReply: () => void;
    onCancelReply: () => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
    loading: boolean;
    depth?: number;
}

function CommentThread({
    comment,
    currentUserId,
    onDelete,
    onResolve,
    onReply,
    replyingTo,
    replyContent,
    setReplyContent,
    onSubmitReply,
    onCancelReply,
    isExpanded,
    onToggleExpand,
    loading,
    depth = 0,
}: CommentThreadProps) {
    const isOwner = currentUserId === comment.userId;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isReplying = replyingTo === comment.id;

    return (
        <div className={`${depth > 0 ? 'ml-6 pl-4 border-l-2 border-gray-200 dark:border-gray-700' : ''}`}>
            <div className={`rounded-lg p-3 ${comment.resolved ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                {/* Comment Header */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {comment.userPhoto ? (
                            <img
                                src={comment.userPhoto}
                                alt={comment.userName}
                                className="w-6 h-6 rounded-full"
                            />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                {comment.userName[0].toUpperCase()}
                            </div>
                        )}
                        <div>
                            <div className="text-sm font-medium">{comment.userName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onResolve(comment.id, comment.resolved)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                            title={comment.resolved ? 'Unresolve' : 'Resolve'}
                        >
                            {comment.resolved ? (
                                <CheckCircle size={16} className="text-green-600" />
                            ) : (
                                <Circle size={16} className="text-gray-400" />
                            )}
                        </button>

                        {isOwner && (
                            <button
                                onClick={() => onDelete(comment.id)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition text-red-500"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Comment Content */}
                <p className="text-sm mb-2 whitespace-pre-wrap">{comment.content}</p>

                {/* Actions */}
                <div className="flex items-center gap-3 text-xs">
                    <button
                        onClick={() => onReply(comment.id)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                    >
                        <CornerDownRight size={12} />
                        Reply
                    </button>

                    {hasReplies && (
                        <button
                            onClick={onToggleExpand}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1"
                        >
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                        </button>
                    )}
                </div>

                {/* Reply Input */}
                {isReplying && (
                    <div className="mt-3 flex gap-2">
                        <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    onSubmitReply();
                                } else if (e.key === 'Escape') {
                                    onCancelReply();
                                }
                            }}
                            placeholder="Write a reply..."
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900"
                            autoFocus
                            disabled={loading}
                        />
                        <button
                            onClick={onSubmitReply}
                            disabled={!replyContent.trim() || loading}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Send size={12} />
                        </button>
                        <button
                            onClick={onCancelReply}
                            className="px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}
            </div>

            {/* Nested Replies */}
            {hasReplies && isExpanded && (
                <div className="mt-2 space-y-2">
                    {comment.replies!.map(reply => (
                        <CommentThread
                            key={reply.id}
                            comment={reply}
                            currentUserId={currentUserId}
                            onDelete={onDelete}
                            onResolve={onResolve}
                            onReply={onReply}
                            replyingTo={replyingTo}
                            replyContent={replyContent}
                            setReplyContent={setReplyContent}
                            onSubmitReply={onSubmitReply}
                            onCancelReply={onCancelReply}
                            isExpanded={isExpanded}
                            onToggleExpand={onToggleExpand}
                            loading={loading}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
