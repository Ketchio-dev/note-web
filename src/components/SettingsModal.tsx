"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, Users, Key, LogOut } from "lucide-react";
import { addMemberToWorkspace, getWorkspaceMembers } from "@/lib/workspace";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function SettingsModal({ isOpen, onClose, initialTab = 'general' }: { isOpen: boolean; onClose: () => void; initialTab?: 'general' | 'members' }) {
    const params = useParams();
    const router = useRouter();
    const { user, signOut } = useAuth();
    const workspaceId = params.workspaceId as string;

    const [activeTab, setActiveTab] = useState<'general' | 'members'>(initialTab);
    const [apiKey, setApiKey] = useState("");
    const [hasApiKey, setHasApiKey] = useState(false);
    const [model, setModel] = useState("anthropic/claude-4.5-sonnet");

    // Members State
    const [email, setEmail] = useState("");
    const [members, setMembers] = useState<any[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [inviteStatus, setInviteStatus] = useState("");

    useEffect(() => {
        if (isOpen && user) {
            setActiveTab(initialTab);
            const storedModel = localStorage.getItem("openrouter_model") || "anthropic/claude-4.5-sonnet";
            setModel(storedModel);
            loadMembers();
            checkApiKeyExists();
        }
    }, [isOpen, workspaceId, initialTab, user]);

    const checkApiKeyExists = async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/user/api-key?userId=${user.uid}`);
            const data = await res.json();
            setHasApiKey(data.hasApiKey || false);
        } catch (e) {
            console.error("Failed to check API key", e);
        }
    };

    const loadMembers = async () => {
        if (!workspaceId) return;
        setLoadingMembers(true);
        try {
            const list = await getWorkspaceMembers(workspaceId);
            setMembers(list);
        } catch (e) {
            console.error(e);
        }
        setLoadingMembers(false);
    };

    const handleSaveKey = async () => {
        if (!user) {
            toast.error("Please log in to save API key");
            return;
        }

        if (!apiKey.trim()) {
            toast.error("Please enter a valid API key");
            return;
        }

        try {
            const res = await fetch('/api/user/api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: apiKey.trim(),
                    userId: user.uid
                })
            });

            if (!res.ok) {
                throw new Error('Failed to save API key');
            }

            // Save model preference to localStorage (not sensitive)
            localStorage.setItem("openrouter_model", model);

            // Clear API key input for security
            setApiKey("");
            setHasApiKey(true);

            toast.success("API key saved securely!");
            onClose();
        } catch (e: any) {
            console.error("Failed to save API key", e);
            toast.error("Failed to save API key: " + e.message);
        }
    };

    const handleInvite = async () => {
        if (!email) return;
        setInviteStatus("Inviting...");
        try {
            await addMemberToWorkspace(workspaceId, email);
            setInviteStatus("Invited!");
            setEmail("");
            loadMembers();
        } catch (e: any) {
            setInviteStatus("Error: " + e.message);
        }
    };

    const handleLogout = async () => {
        await signOut();
        onClose();
        router.push('/');
    };

    if (!isOpen) return null;

    // Esc key handler
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-title"
                className="bg-white dark:bg-[#1C1C1C] rounded-xl shadow-xl w-full max-w-2xl h-[500px] flex overflow-hidden border border-gray-200 dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
                tabIndex={-1}
            >
                {/* Sidebar */}
                <div className="w-48 bg-gray-50 dark:bg-[#202020] border-r border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-2">
                    <h2 id="settings-title" className="text-sm font-bold text-gray-400 mb-2 uppercase px-2">Settings</h2>
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${activeTab === 'general' ? 'bg-gray-200 dark:bg-gray-700 font-medium text-black dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                    >
                        <Key size={16} /> General
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${activeTab === 'members' ? 'bg-gray-200 dark:bg-gray-700 font-medium text-black dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                    >
                        <Users size={16} /> Members
                    </button>

                    <div className="flex-1"></div> {/* Spacer */}

                    <button
                        onClick={handleLogout}
                        className="text-left px-3 py-2 rounded text-sm flex items-center gap-2 hover:bg-red-50 text-red-600 mt-auto"
                    >
                        <LogOut size={16} /> Log out
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 relative flex flex-col text-gray-900 dark:text-gray-100">
                    <button
                        onClick={onClose}
                        aria-label="Close settings"
                        className="absolute right-4 top-4 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 hover:text-black dark:hover:text-white"
                    >
                        <X size={20} />
                    </button>

                    {activeTab === 'general' && (
                        <div>
                            <h2 className="text-xl font-bold mb-6">General Settings</h2>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    OpenRouter API Key
                                    {hasApiKey && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Configured</span>}
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Securely encrypted and stored in Firestore. Never exposed to client.
                                </p>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={hasApiKey ? "sk-or-... (already saved)" : "sk-or-..."}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111] rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none"
                                />
                                {hasApiKey && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        Leave empty to keep existing key. Enter new key to update.
                                    </p>
                                )}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    AI Model
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Select the model to use for AI features.
                                </p>
                                <select
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111] rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none"
                                >
                                    <optgroup label="Advanced Models (2025)">
                                        <option value="anthropic/claude-4.5-sonnet">Claude 4.5 Sonnet</option>
                                        <option value="anthropic/claude-4.5-opus">Claude 4.5 Opus</option>
                                        <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
                                        <option value="google/gemini-3.0-pro">Gemini 3.0 Pro</option>
                                        <option value="openai/gpt-5.2">GPT-5.2</option>
                                        <option value="openai/gpt-5.2-thinking">GPT-5.2 (Thinking)</option>
                                    </optgroup>
                                    <optgroup label="Open Source">
                                        <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B</option>
                                        <option value="mistralai/mistral-large">Mistral Large</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveKey}
                                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div className="flex flex-col h-full">
                            <h2 className="text-xl font-bold mb-6">Workspace Members</h2>

                            {/* Invite */}
                            <div className="flex gap-2 mb-6">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="friend@example.com"
                                    className="flex-1 p-2 border border-blue-200 dark:border-blue-900 bg-white dark:bg-[#111] rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                />
                                <button
                                    onClick={handleInvite}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
                                >
                                    Invite
                                </button>
                            </div>
                            {inviteStatus && <p className="text-xs mb-4 text-blue-600">{inviteStatus}</p>}

                            {/* List */}
                            <div className="flex-1 overflow-y-auto border-t border-gray-100 pt-4">
                                <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase">People in this workspace</h3>
                                {loadingMembers ? (
                                    <div className="text-sm text-gray-400">Loading...</div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {members.map(m => (
                                            <div key={m.uid} className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden text-gray-600">
                                                    {m.photoURL ? <img src={m.photoURL} alt="" /> : (m.email?.[0]?.toUpperCase() || "U")}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-800">{m.nickname || m.email?.split('@')[0]}</div>
                                                    <div className="text-xs text-gray-500">{m.email}</div>
                                                </div>
                                                <div className="text-xs text-gray-400">Member</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
