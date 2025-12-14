"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { getPage, updatePage, Page, subscribeToPage, getChildPages } from "@/lib/workspace";
import Editor, { EditorHandle } from "@/components/Editor";
import AIAssistant from "@/components/AIAssistant";
import { useAuth } from "@/context/AuthContext";
import DatabaseView from "@/components/DatabaseView";
import SettingsModal from "@/components/SettingsModal";
import PageMenu from "@/components/PageMenu";
import { Share, MoreHorizontal, FileText, Table as TableIcon, Layout } from "lucide-react";
import { serverTimestamp } from "firebase/firestore";



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

    // Editor Ref
    const editorRef = useRef<EditorHandle>(null);

    // Data Fetching
    useEffect(() => {
        if (pageId) {
            const unsubscribe = subscribeToPage(pageId, (fetchedPage) => {
                if (fetchedPage) {
                    setPage(fetchedPage);
                    // Only sync if we are not currently saving (to avoid overwriting user typing)
                    // In a real app, use more robust conflict resolution or CRDTs
                    if (!saving) {
                        setTitle(fetchedPage.title);
                        setContent(fetchedPage.content || "");
                        setCover(fetchedPage.cover || "");
                        setIcon(fetchedPage.icon || "");
                    }
                }
                setLoading(false);
            });

            return () => unsubscribe();
        }
    }, [pageId]);

    // Fetch children if database
    useEffect(() => {
        if (page?.type === 'database') {
            getChildPages(pageId).then(setChildPages);
        } else {
            setChildPages([]);
        }
    }, [page?.type, pageId]);

    // Auto-save Logic
    useEffect(() => {
        if (!loading && page) {
            const isDatabase = page.type === 'database';

            // Check for changes
            const hasTitleChanged = title !== page.title;
            const hasContentChanged = !isDatabase && content !== page.content; // Content ignored in DB mode
            const hasCoverChanged = cover !== page.cover;
            const hasIconChanged = icon !== page.icon;

            if (!hasTitleChanged && !hasContentChanged && !hasCoverChanged && !hasIconChanged) return;

            const timer = setTimeout(async () => {
                setSaving(true);
                const updates: any = { title, cover, icon };
                if (!isDatabase) updates.content = content;

                await updatePage(pageId, updates);
                setSaving(false);
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [title, content, cover, icon, pageId, loading, page]);


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
                            <button onClick={() => setIcon("😀")} className="flex items-center gap-1 text-xs text-gray-500 hover:text-black px-2 py-1 hover:bg-gray-200 rounded transition">
                                <span className="opacity-50">☺</span> Add Icon
                            </button>
                            <button onClick={() => setCover("https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200")} className="flex items-center gap-1 text-xs text-gray-500 hover:text-black px-2 py-1 hover:bg-gray-200 rounded transition">
                                <span className="opacity-50">🖼</span> Add Cover
                            </button>
                        </>
                    )}
                    {cover && (
                        <>
                            <button onClick={() => setCover(`https://source.unsplash.com/random/1200x400?sig=${Math.random()}`)} className="bg-white/80 hover:bg-white text-xs px-2 py-1 rounded shadow-sm text-gray-700">Change Cover</button>
                            <button onClick={() => setCover("")} className="bg-white/80 hover:bg-white text-xs px-2 py-1 rounded shadow-sm text-red-500">Remove</button>
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
                        <span className="text-xs">{saving ? "Saving..." : "Saved"}</span>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <Share size={18} />
                        </button>
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
                        {/* Use EditorComponent alias to avoid name conflict if any */}
                        <Editor
                            ref={editorRef}
                            content={content}
                            onChange={setContent}
                        />
                        <AIAssistant
                            workspaceId={workspaceId}
                            editorContent={content}
                            onInsertContent={(text) => {
                                if (editorRef.current) editorRef.current.insertContent(text);
                                else setContent(prev => prev + text);
                            }}
                            onReplaceContent={(text) => setContent(text)}
                        />
                    </div>
                )}
            </div>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} initialTab="members" />
        </div>
    );
}
