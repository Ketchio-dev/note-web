"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, getDoc } from "firebase/firestore";
import { Check, X, Mail, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface InvitationBase {
    id: string;
    pageId: string;
    email: string;
    role: "editor" | "viewer";
    invitedBy: string;
    invitedAt: Timestamp;
    accepted: boolean;
    workspaceId: string;
    // Denormalized fields for performance
    pageTitle?: string;
    inviterName?: string;
}

interface EnrichedInvitation extends InvitationBase {
    pageTitle: string;
    inviterName: string;
}

export default function InvitationsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { user } = useAuth();
    const router = useRouter();
    const [workspaceId, setWorkspaceId] = useState<string>("");
    const [invitations, setInvitations] = useState<InvitationBase[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        params.then(p => setWorkspaceId(p.workspaceId));
    }, [params]);

    useEffect(() => {
        if (!user?.email) return;

        const q = query(
            collection(db, "invitations"),
            where("email", "==", user.email.toLowerCase()),
            where("accepted", "==", false),
            orderBy("invitedAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const invs: InvitationBase[] = [];
            snapshot.docs.forEach((doc) => {
                invs.push({ id: doc.id, ...doc.data() } as InvitationBase);
            });
            setInvitations(invs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.email]);

    const handleAccept = async (invitationId: string, pageId: string) => {
        setProcessingIds(prev => new Set(prev).add(invitationId));

        try {
            // Get Firebase Auth user ID
            if (!user?.uid) {
                toast.error("Please log in to accept invitations");
                return;
            }

            const res = await fetch(`/api/invitations/${invitationId}/accept`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: user.uid }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Invitation accepted! 🎉");

                // Small delay for success animation
                setTimeout(() => {
                    router.push(`/workspace/${workspaceId}/${pageId}`);
                }, 300);
            } else {
                // Specific error messages based on status code
                if (res.status === 410) {
                    toast.error("⏰ This invitation has expired");
                } else if (res.status === 404) {
                    toast.error("❌ Invitation or page not found");
                } else if (res.status === 403) {
                    toast.error("🔒 This invitation is not for your email");
                } else if (res.status === 409) {
                    toast.error("✓ Already accepted");
                } else {
                    toast.error(data.error || "Failed to accept invitation");
                }
            }
        } catch (error) {
            console.error("Accept error:", error);
            toast.error("Network error. Please check your connection.");
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(invitationId);
                return next;
            });
        }
    };

    const handleReject = async (invitationId: string) => {
        setProcessingIds(prev => new Set(prev).add(invitationId));

        try {
            // Get Firebase Auth user ID
            if (!user?.uid) {
                toast.error("Please log in to reject invitations");
                return;
            }

            const res = await fetch(`/api/invitations/${invitationId}/reject`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: user.uid }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Invitation rejected");
            } else {
                // Specific error messages
                if (res.status === 404) {
                    toast.error("Invitation not found");
                } else if (res.status === 403) {
                    toast.error("🔒 This invitation is not for your email");
                } else {
                    toast.error(data.error || "Failed to reject invitation");
                }
            }
        } catch (error) {
            console.error("Reject error:", error);
            toast.error("Network error. Please check your connection.");
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(invitationId);
                return next;
            });
        }
    };

    const getTimeAgo = (timestamp: Timestamp) => {
        const now = Date.now();
        const then = timestamp.toMillis();
        const diff = now - then;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#191919] p-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header Skeleton */}
                    <div className="mb-8">
                        <div className="h-9 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2"></div>
                        <div className="h-5 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                    </div>
                    {/* Cards Skeleton */}
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-[#1C1C1C] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
                                            <div className="space-y-2">
                                                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                                            </div>
                                        </div>
                                        <div className="ml-13 space-y-2">
                                            <div className="h-4 w-56 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"></div>
                                        <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#191919] p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Invitations
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {invitations.length === 0
                            ? "You have no pending invitations"
                            : `You have ${invitations.length} pending invitation${invitations.length > 1 ? 's' : ''}`
                        }
                    </p>
                </div>

                {/* Invitations List */}
                {invitations.length > 0 ? (
                    <div className="space-y-4">
                        {invitations.map((invitation) => {
                            const isProcessing = processingIds.has(invitation.id);

                            return (
                                <div
                                    key={invitation.id}
                                    className="bg-white dark:bg-[#1C1C1C] rounded-lg border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {invitation.inviterName || "Someone"} invited you
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                        <Clock className="w-3 h-3" />
                                                        {getTimeAgo(invitation.invitedAt)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="ml-13 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-gray-400" />
                                                    <span className="text-gray-700 dark:text-gray-300">
                                                        {invitation.pageTitle || "Untitled Page"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500">Role:</span>
                                                    <span className={`text-sm font-medium ${invitation.role === 'editor'
                                                        ? 'text-blue-600 dark:text-blue-400'
                                                        : 'text-gray-600 dark:text-gray-400'
                                                        }`}>
                                                        {invitation.role === 'editor' ? 'Can Edit' : 'Can View'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => handleAccept(invitation.id, invitation.pageId)}
                                                disabled={isProcessing}
                                                aria-label={`Accept invitation from ${invitation.inviterName}`}
                                                className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium ${isProcessing ? 'cursor-wait' : 'cursor-pointer'
                                                    }`}
                                            >
                                                <Check size={16} aria-hidden="true" />
                                                {isProcessing ? 'Accepting...' : 'Accept'}
                                            </button>
                                            <button
                                                onClick={() => handleReject(invitation.id)}
                                                disabled={isProcessing}
                                                aria-label={`Reject invitation from ${invitation.inviterName}`}
                                                className={`flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition font-medium ${isProcessing ? 'cursor-wait' : 'cursor-pointer'
                                                    }`}
                                            >
                                                <X size={16} aria-hidden="true" />
                                                {isProcessing ? 'Rejecting...' : 'Reject'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="bg-white dark:bg-[#1C1C1C] rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            No pending invitations
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            When someone invites you to collaborate, you'll see it here.
                        </p>
                        <button
                            onClick={() => router.push(`/workspace/${workspaceId}/home`)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Go to Home
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
