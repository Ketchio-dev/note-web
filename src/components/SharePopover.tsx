"use client";

import { useState, useEffect, useRef } from "react";
import { X, Copy, Globe, ChevronDown, Check, User } from "lucide-react";
import { addMemberToWorkspace, getWorkspaceMembers } from "@/lib/workspace";
import { useAuth } from "@/context/AuthContext";

interface SharePopoverProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    pageUrl: string;
    align?: 'left' | 'right';
}

export default function SharePopover({ isOpen, onClose, workspaceId, pageUrl, align = 'right' }: SharePopoverProps) {
    const { user } = useAuth();
    const [email, setEmail] = useState("");
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [inviteStatus, setInviteStatus] = useState("");
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            loadMembers();
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    const loadMembers = async () => {
        setLoading(true);
        try {
            const list = await getWorkspaceMembers(workspaceId);
            setMembers(list);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleInvite = async () => {
        if (!email) return;
        setInviteStatus("Inviting...");
        try {
            await addMemberToWorkspace(workspaceId, email);
            setInviteStatus("Invited!");
            setEmail("");
            loadMembers();
            setTimeout(() => setInviteStatus(""), 2000);
        } catch (e: any) {
            setInviteStatus("Error: " + e.message);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(pageUrl);
        // Could add toast here
    };

    if (!isOpen) return null;

    return (
        <div
            ref={popoverRef}
            className={`absolute top-10 ${align === 'right' ? 'right-0' : 'left-0'} z-50 w-[420px] bg-white dark:bg-[#1C1C1C] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}
        >
            {/* Header Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-800">
                <button className="px-4 py-3 text-sm font-medium border-b-2 border-black dark:border-white text-black dark:text-white">Share</button>
                <button className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Publish</button>
            </div>

            <div className="p-4">
                {/* Invite Input */}
                <div className="flex gap-2 mb-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email or group, separated by commas"
                        className="flex-1 px-3 py-1.5 bg-transparent border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                    />
                    <button
                        onClick={handleInvite}
                        disabled={!email}
                        className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
                    >
                        Invite
                    </button>
                </div>
                {inviteStatus && <div className="text-xs text-blue-500 mb-4 px-1">{inviteStatus}</div>}

                {/* Member List */}
                <div className="mb-4 max-h-[200px] overflow-y-auto space-y-3">
                    {/* Current User (You) */}
                    {user && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {user.photoURL ? (
                                    <img src={user.photoURL} className="w-8 h-8 rounded-full" alt="You" />
                                ) : (
                                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                        {user.displayName?.[0] || "U"}
                                    </div>
                                )}
                                <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {user.displayName || "You"} <span className="text-gray-500">(You)</span>
                                    </div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1 cursor-not-allowed">
                                Full access <ChevronDown size={12} />
                            </div>
                        </div>
                    )}

                    {/* Other Members */}
                    {members.filter(m => m.uid !== user?.uid).map(m => (
                        <div key={m.uid} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {m.photoURL ? (
                                    <img src={m.photoURL} className="w-8 h-8 rounded-full" alt="" />
                                ) : (
                                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                        {m.nickname?.[0] || m.email?.[0] || "U"}
                                    </div>
                                )}
                                <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {m.nickname || m.email?.split('@')[0]}
                                    </div>
                                    <div className="text-xs text-gray-500">{m.email}</div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200">
                                Full access <ChevronDown size={12} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* General Access */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 pb-2">
                    <div className="text-xs font-semibold text-gray-500 mb-2">General access</div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 dark:bg-[#2C2C2C] rounded-md flex items-center justify-center text-gray-500">
                                <Key size={14} className="fill-current" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1 cursor-pointer">
                                    Only people invited <ChevronDown size={12} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex items-center justify-between">
                    <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                        <Globe size={12} /> Learn about sharing
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2C2C2C] text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
                    >
                        <Copy size={14} /> Copy link
                    </button>
                </div>
            </div>

            {/* Key Icon from lucide-react doesn't look exactly like lock, using Lock if preferred, but Key was in import */}
        </div>
    );
}

function Key({ size, className }: { size: number, className?: string }) {
    // Custom Lock Icon similar to the screenshot (padlock)
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
    )
}
