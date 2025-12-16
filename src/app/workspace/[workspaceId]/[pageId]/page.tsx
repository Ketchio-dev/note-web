"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { getPage, updatePage, Page, subscribeToPage, subscribeToChildPages, trackPageView, trackPageUpdate } from "@/lib/workspace";
import { localStore } from "@/lib/local-store";
import Editor, { EditorHandle } from "@/components/Editor";
import AIAssistant from "@/components/AIAssistant";
import { useAuth } from "@/context/AuthContext";
import DatabaseView from "@/components/DatabaseView";
import SettingsModal from "@/components/SettingsModal";
import PageMenu from "@/components/PageMenu";
import CollaborationDrawer from "@/components/CollaborationDrawer";
import SharePopover from "@/components/SharePopover";
import PresenceAvatars from "@/components/PresenceAvatars";
import CommentsSidebar from "@/components/CommentsSidebar";
import AITaskMenu, { AITask } from "@/components/ai/AITaskMenu";
import { Sparkles, Share, MoreHorizontal, FileText, Table as TableIcon, Layout, MessageSquare } from "lucide-react";
import { serverTimestamp } from "firebase/firestore";
import { debounce } from "lodash";
import { usePresence } from "@/hooks/usePresence";

export default function PageEditor() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;
    const pageId = params.pageId as string;
    const { user } = useAuth();

    const [page, setPage] = useState<Page | null>(null);
    const [childPages, setChildPages] = useState<Page[]>([]);

    // Controlled inputs for optimistic UI
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [cover, setCover] = useState("");
    const [icon, setIcon] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isUpdatesOpen, setIsUpdatesOpen] = useState(false); // Drawer State
    const [isShareOpen, setIsShareOpen] = useState(false); // Share Popover State
    const [isCommentsOpen, setIsCommentsOpen] = useState(false); // Comments Sidebar State

    // AI Task Menu state
    const [selectedText, setSelectedText] = useState<string>("");
    const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);
    const [showAIButton, setShowAIButton] = useState(false);
    const [showAITaskMenu, setShowAITaskMenu] = useState(false);
    const [aiPrompt, setAiPrompt] = useState<string>("");

    // Editor Ref
    const editorRef = useRef<EditorHandle>(null);

    // Presence tracking for adaptive debounce
    const { activeUsers } = usePresence(pageId, user?.uid || null, user?.displayName || user?.email || 'Anonymous');
    const hasCollaborators = activeUsers.length > 0;

    // Adaptive debounced save functions
    const debouncedSaveContent = useCallback(
        debounce(async (newContent: string) => {
            await updatePage(pageId, { content: newContent });
            setSaving(false);
        }, hasCollaborators ? 300 : 500), // Faster when collaborating
        [pageId, hasCollaborators]
    );

    const debouncedSaveTitle = useCallback(
        debounce(async (newTitle: string) => {
            await updatePage(pageId, { title: newTitle });
            await trackPageUpdate(pageId, user!.uid, 'title');
            setSaving(false);
        }, hasCollaborators ? 500 : 800),
        [pageId, user, hasCollaborators]
    );

    const debouncedSaveCover = useCallback(
        debounce(async (newCover: string) => {
            await updatePage(pageId, { cover: newCover });
            setSaving(false);
        }, 800),
        [pageId]
    );

    const debouncedSaveIcon = useCallback(
        debounce(async (newIcon: string) => {
            await updatePage(pageId, { icon: newIcon });
            setSaving(false);
        }, 800),
        [pageId]
    );

    // Handlers with local-first updates
    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle); // Immediate UI update
        setSaving(true);

        // Save to local cache immediately
        if (page) {
            localStore.savePage({ ...page, title: newTitle });
        }

        debouncedSaveTitle(newTitle); // Debounced Firestore save
    };

    const handleContentChange = (newContent: string) => {
        setContent(newContent); // Immediate UI update
        setSaving(true);

        // Save to local cache immediately
        if (page) {
            localStore.savePage({ ...page, content: newContent });
        }

        debouncedSaveContent(newContent); // Debounced Firestore save
    };

    const handleCoverChange = (newCover: string) => {
        setCover(newCover); // Immediate UI update
        setSaving(true);

        if (page) {
            localStore.savePage({ ...page, cover: newCover });
        }

        debouncedSaveCover(newCover); // Debounced Firestore save
    };

    const handleIconChange = (newIcon: string) => {
        setIcon(newIcon); // Immediate UI update
        setSaving(true);

        if (page) {
            localStore.savePage({ ...page, icon: newIcon });
        }

        debouncedSaveIcon(newIcon); // Debounced Firestore save
    };

    // Local-first data loading
    useEffect(() => {
        if (pageId && user) {
            // 1. Load from local cache first (instant)
            localStore.getPage(pageId).then(cachedPage => {
                if (cachedPage) {
                    setPage(cachedPage);
                    setTitle(cachedPage.title);
                    setContent(cachedPage.content || "");
                    setCover(cachedPage.cover || "");
                    setIcon(cachedPage.icon || "");
                    setLoading(false);
                }
            });

            // 2. Track View
            trackPageView(pageId, user.uid);

            // 3. Subscribe to real-time updates
            const unsubscribe = subscribeToPage(pageId, (fetchedPage) => {
                if (fetchedPage) {
                    setPage(fetchedPage);
                    if (!saving) {
                        setTitle(fetchedPage.title);
                        setContent(fetchedPage.content || "");
                        setCover(fetchedPage.cover || "");
                        setIcon(fetchedPage.icon || "");
                    }
                    // Update local cache
                    localStore.savePage(fetchedPage);
                }
                setLoading(false);
            });

            return () => unsubscribe();
        }
    }, [pageId, user?.uid]);

    // Subscribe to child pages if database
    useEffect(() => {
        if (page?.type === 'database') {
            const unsubscribe = subscribeToChildPages(pageId, (pages) => {
                setChildPages(pages);
            });
            return () => unsubscribe();
        } else {
            setChildPages([]);
        }
    }, [page?.type, pageId]);


    if (loading) return <div className="flex justify-center items-center h-screen text-gray-400">Loading...</div>;
    if (!page) return <div className="p-8 text-gray-400">Page not found</div>;

    const toggleDatabaseMode = async () => {
        const newType = page.type === 'database' ? 'page' : 'database';
        setSaving(true);
        // Update local state immediately for UI response
        setPage(prev => prev ? { ...prev, type: newType } : null);
        await updatePage(pageId, { type: newType });
        setSaving(false);
    };

    return (
        <div className="w-full relative min-h-screen bg-white dark:bg-[#191919] text-gray-900 dark:text-gray-100 transition-colors group/page">
            {/* Cover Image */}
            <div className={`group relative w-full ${cover ? "h-60" : "h-12 hover:bg-gray-50 dark:hover:bg-[#202020]"} transition-all duration-300`}>
                {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="Cover" className="w-full h-full object-cover" />
                )}

                {/* Cover Controls */}
                <div className={`absolute bottom-2 right-12 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${!cover && "top-2 right-auto left-12"}`}>
                    {!cover && (
                        <>
                            <button onClick={() => handleIconChange("😀")} className="flex items-center gap-1 text-xs text-gray-500 hover:text-black px-2 py-1 hover:bg-gray-200 rounded transition">
                                <span className="opacity-50">☺</span> Add Icon
                            </button>
                            <button onClick={() => handleCoverChange("https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200")} className="flex items-center gap-1 text-xs text-gray-500 hover:text-black px-2 py-1 hover:bg-gray-200 rounded transition">
                                <span className="opacity-50">🖼</span> Add Cover
                            </button>
                        </>
                    )}
                    {cover && (
                        <>
                            <button onClick={() => handleCoverChange(`https://source.unsplash.com/random/1200x400?sig=${Math.random()}`)} className="bg-white/80 hover:bg-white text-xs px-2 py-1 rounded shadow-sm text-gray-700">Change Cover</button>
                            <button onClick={() => handleCoverChange("")} className="bg-white/80 hover:bg-white text-xs px-2 py-1 rounded shadow-sm text-red-500">Remove</button>
                        </>
                    )}
                </div>
            </div>

            <div className={`mx-auto w-full px-12 relative -mt-8 pb-32 transition-all duration-300 ${page.fullWidth ? 'max-w-full' : 'max-w-4xl'}`}>

                {/* Icon */}
                {icon && (
                    <div className="relative group w-20 h-20 -mt-10 mb-4 bg-white dark:bg-[#191919] rounded-full text-6xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center cursor-pointer select-none"
                        onClick={() => {
                            if (page.locked) return;
                            const newIcon = window.prompt("Enter an emoji:", icon);
                            if (newIcon) setIcon(newIcon);
                        }}
                    >
                        {icon}
                        {!page.locked && <button onClick={(e) => { e.stopPropagation(); setIcon(""); }} className="absolute -top-1 -right-1 bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"><Share size={12} className="rotate-45" /></button>}
                    </div>
                )}

                {/* Top Actions Bar (Title Row) */}
                <div className="flex items-center justify-between mt-8 mb-2 group-hover/page:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        {/* View Switcher */}
                        <button
                            onClick={toggleDatabaseMode}
                            className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition ${page.type === 'database' ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            title={page.type === 'database' ? "Switch to Page View" : "Convert to Database"}
                        >
                            {page.type === 'database' ? <TableIcon size={14} /> : <FileText size={14} />}
                            <span className="font-medium">{page.type === 'database' ? "Table" : "Page"}</span>
                        </button>
                        <span className="text-xs text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                            {saving ? (
                                <>
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                    <span className="text-xs text-yellow-600 dark:text-yellow-500">Saving...</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                    <span className="text-xs text-green-600 dark:text-green-500">Saved</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Center: Presence Avatars */}
                    <div className="flex-1 flex justify-center">
                        {user && (
                            <PresenceAvatars
                                pageId={pageId}
                                userId={user.uid}
                                userName={user.displayName || user.email || undefined}
                                userAvatar={user.photoURL || undefined}
                            />
                        )}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 relative">
                        <button
                            onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1"
                        >
                            <MessageSquare size={16} />
                            <span className="text-sm font-medium">Comments</span>
                        </button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => setIsShareOpen(!isShareOpen)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <span className="text-sm font-medium mr-1">Share</span>
                        </button>
                        {/* Share Popover */}
                        <SharePopover
                            isOpen={isShareOpen}
                            onClose={() => setIsShareOpen(false)}
                            workspaceId={workspaceId}
                            pageUrl={typeof window !== 'undefined' ? window.location.href : ""}
                        />

                        <PageMenu
                            page={page}
                            onUpdate={async (updates) => {
                                setPage((prev: any) => ({ ...prev, ...updates }));
                                await updatePage(pageId, updates);
                            }}
                            onDelete={async () => {
                                if (confirm("Move to Trash?")) {
                                    await updatePage(pageId, { inTrash: true, trashDate: serverTimestamp() });
                                    window.location.href = `/workspace/${workspaceId}`;
                                }
                            }}
                            onDuplicate={() => alert("Duplicate coming soon")}
                            onOpenUpdates={() => setIsUpdatesOpen(true)}
                        />
                    </div>
                </div>

                {/* Title Input */}
                <input
                    type="text"
                    value={title}
                    readOnly={page.locked}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Untitled"
                    className={`w-full text-4xl font-bold bg-transparent outline-none placeholder:text-gray-300 dark:placeholder:text-gray-700 mb-6 ${page.locked ? 'cursor-default' : ''}`}
                />

                {/* Content: Database OR Editor */}
                {page.type === 'database' ? (
                    <DatabaseView
                        workspaceId={workspaceId}
                        parentPage={page}
                        childPages={childPages}
                        onUpdateParent={(data) => updatePage(pageId, data)}
                    />
                ) : (
                    <div className={page.locked ? "pointer-events-none opacity-80" : ""}>
                        <Editor
                            ref={editorRef}
                            content={content}
                            onChange={setContent}
                            onSelection={(selection) => {
                                if (selection && selection.text.length > 3) {
                                    setSelectedText(selection.text);
                                    // Get position from current selection
                                    const rect = window.getSelection()?.getRangeAt(0).getBoundingClientRect();
                                    if (rect) {
                                        setSelectionPos({
                                            x: rect.left + (rect.width / 2),
                                            y: rect.bottom + 8
                                        });
                                        setShowAIButton(true);
                                    }
                                } else {
                                    setShowAIButton(false);
                                    setShowAITaskMenu(false);
                                }
                            }}
                        />
                        <AIAssistant
                            workspaceId={workspaceId}
                            editorContent={content}
                            initialPrompt={aiPrompt}
                            onPromptUsed={() => setAiPrompt("")}
                            onInsertContent={(text) => {
                                if (editorRef.current) editorRef.current.insertContent(text);
                                else setContent(prev => prev + text);
                            }}
                            onReplaceContent={(text) => setContent(text)}
                        />

                        {/* Floating AI Button */}
                        {showAIButton && selectionPos && !showAITaskMenu && (
                            <button
                                className="fixed z-50 flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-all animate-in fade-in zoom-in duration-200"
                                style={{
                                    left: `${selectionPos.x}px`,
                                    top: `${selectionPos.y}px`,
                                    transform: 'translateX(-50%)'
                                }}
                                onClick={() => setShowAITaskMenu(true)}
                            >
                                <Sparkles size={14} />
                                <span className="text-sm font-medium">Ask AI</span>
                            </button>
                        )}

                        {/* AI Task Menu */}
                        {showAITaskMenu && selectionPos && (
                            <AITaskMenu
                                selectedText={selectedText}
                                position={selectionPos}
                                onTaskSelect={(task, prompt) => {
                                    // Enhance prompt with page context
                                    const enhancedPrompt = `${prompt}

---
CONTEXT:
Page: "${page.title || 'Untitled'}"
Selected text length: ${selectedText.length} characters

SELECTED TEXT:
${selectedText}`;

                                    // Set enhanced prompt to trigger AI Assistant
                                    setAiPrompt(enhancedPrompt);
                                    setShowAITaskMenu(false);
                                    setShowAIButton(false);
                                }}
                                onClose={() => {
                                    setShowAITaskMenu(false);
                                }}
                            />
                        )}
                    </div>
                )}
            </div>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} initialTab="members" />

            {/* Collaboration Drawer */}
            <CollaborationDrawer
                isOpen={isUpdatesOpen}
                onClose={() => setIsUpdatesOpen(false)}
                pageId={pageId}
                pageTitle={page.title}
            />

            {/* Comments Sidebar */}
            <CommentsSidebar
                pageId={pageId}
                isOpen={isCommentsOpen}
                onClose={() => setIsCommentsOpen(false)}
            />
        </div>
    );
}
