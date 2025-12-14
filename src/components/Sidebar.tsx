"use client";

import { useState, useEffect } from "react";
import { Page, createPage, subscribeToWorkspacePages, updatePage, deletePage } from "@/lib/workspace";
import { ChevronRight, ChevronDown, FileText, Plus, Settings, Trash, MoreHorizontal, Star, Copy, Edit, ExternalLink, AppWindow, FolderInput, Home, Sun, Moon, Sparkles, Search, Layout, X, Calendar } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SettingsModal from "./SettingsModal";
import SearchModal from "./SearchModal";

export default function Sidebar({ workspaceId }: { workspaceId: string }) {
    const [pages, setPages] = useState<Page[]>([]);
    const params = useParams();
    const router = useRouter();
    const activePageId = params.pageId as string | null;
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();

    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, pageId: string } | null>(null);
    const [renameId, setRenameId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Trash Selection State
    const [selectedTrash, setSelectedTrash] = useState<Set<string>>(new Set());

    useEffect(() => {
        const unsubscribe = subscribeToWorkspacePages(workspaceId, (fetchedPages) => {
            setPages(fetchedPages);
        });
        return () => unsubscribe();
    }, [workspaceId]);

    const toggleCollapse = (pageId: string) => {
        setCollapsed(prev => ({ ...prev, [pageId]: !prev[pageId] }));
    };

    const handleCreatePage = async (parentId: string | null = null, section: 'private' | 'workspace' = 'workspace') => {
        const newPage = await createPage(workspaceId, parentId, "Untitled", 'page', section, user?.uid);
        router.push(`/workspace/${workspaceId}/${newPage.id}`);
        // Auto expand parent
        if (parentId) {
            setCollapsed(prev => ({ ...prev, [parentId]: false }));
        }
    };

    const handleRestore = async (pageId: string) => {
        await updatePage(pageId, { inTrash: false, trashDate: null });
        if (selectedTrash.has(pageId)) {
            const next = new Set(selectedTrash);
            next.delete(pageId);
            setSelectedTrash(next);
        }
    };

    const handlePermanentDelete = async (pageId: string) => {
        if (window.confirm("Permanently delete this page?")) {
            await deletePage(pageId);
            if (selectedTrash.has(pageId)) {
                const next = new Set(selectedTrash);
                next.delete(pageId);
                setSelectedTrash(next);
            }
        }
    };

    // Bulk Actions
    const handleSelectTrash = (pageId: string) => {
        const next = new Set(selectedTrash);
        if (next.has(pageId)) next.delete(pageId);
        else next.add(pageId);
        setSelectedTrash(next);
    };

    const handleSelectAllTrash = () => {
        if (selectedTrash.size === trashPages.length) {
            setSelectedTrash(new Set());
        } else {
            setSelectedTrash(new Set(trashPages.map(p => p.id)));
        }
    };

    const handleBulkRestore = async () => {
        for (const id of Array.from(selectedTrash)) {
            await updatePage(id, { inTrash: false, trashDate: null });
        }
        setSelectedTrash(new Set());
    };

    const handleBulkDelete = async () => {
        if (confirm(`Permanently delete ${selectedTrash.size} pages?`)) {
            for (const id of Array.from(selectedTrash)) {
                await deletePage(id);
            }
            setSelectedTrash(new Set());
        }
    };


    // Grouping
    const visiblePages = pages.filter(p => !p.inTrash);
    const trashPages = pages.filter(p => p.inTrash);

    // Favorites
    const favoritePages = visiblePages.filter(p => p.isFavorite);

    // Roots
    const rootPages = visiblePages.filter(p => !p.parentId);
    const privateRootPages = rootPages.filter(p => p.section === 'private');
    const workspaceRootPages = rootPages.filter(p => p.section !== 'private');

    // Context Menu Actions
    const handleContextMenu = (e: React.MouseEvent, pageId: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, pageId });
    };

    const handleAction = async (action: string, pageId: string) => {
        setContextMenu(null);
        const page = pages.find(p => p.id === pageId);
        if (!page) return;

        switch (action) {
            case 'favorite':
                await updatePage(pageId, { isFavorite: !page.isFavorite });
                break;
            case 'duplicate':
                const newPage = await createPage(workspaceId, page.parentId, `${page.title} (Copy)`, page.type, page.section || 'workspace', user?.uid);
                // Copy content/icon/cover if existing
                if (page.content || page.icon || page.cover) {
                    await updatePage(newPage.id, {
                        content: page.content,
                        icon: page.icon,
                        cover: page.cover
                    });
                }
                break;
            case 'rename':
                const newTitle = prompt("Enter new name", page.title);
                if (newTitle) await updatePage(pageId, { title: newTitle });
                break;
            case 'trash':
                await updatePage(pageId, { inTrash: true, trashDate: new Date() });
                break;
            case 'open_new_tab':
                window.open(`/workspace/${workspaceId}/${pageId}`, '_blank');
                break;
            case 'copy_link':
                navigator.clipboard.writeText(`${window.location.origin}/workspace/${workspaceId}/${pageId}`);
                // Toast notification would be nice here
                break;
        }
    };

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const PageItem = ({ page, level = 0 }: { page: Page, level?: number }) => {
        const hasChildren = visiblePages.some(p => p.parentId === page.id);
        const isCollapsed = collapsed[page.id];
        const isActive = activePageId === page.id;

        return (
            <div>
                <div
                    className={`group flex items-center gap-1 min-h-[28px] py-1 px-3 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] text-sm text-gray-600 dark:text-gray-400 select-none cursor-pointer transition-colors relative
                    ${isActive ? "bg-gray-100 dark:bg-[#2C2C2C] font-medium text-gray-900 dark:text-gray-100" : ""}
                    `}
                    style={{ paddingLeft: `${childrenPadding(level)}px` }}
                    onClick={() => router.push(`/workspace/${workspaceId}/${page.id}`)}
                    onContextMenu={(e) => handleContextMenu(e, page.id)}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleCollapse(page.id); }}
                        className={`p-0.5 rounded-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition ${!hasChildren ? "opacity-0" : "opacity-100"}`}
                    >
                        <ChevronRight size={12} className={`transition-transform duration-200 ${!isCollapsed ? "rotate-90" : ""}`} />
                    </button>

                    <div className="flex items-center justify-center text-lg w-5 h-5 mr-1">
                        {page.icon ? page.icon : (page.type === 'database' ? <Layout size={14} /> : <FileText size={14} />)}
                    </div>

                    <span className="truncate flex-1">{page.title || "Untitled"}</span>

                    {/* Actions */}
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition absolute right-2 bg-gray-100 dark:bg-[#2C2C2C] pl-2 shadow-sm rounded-sm">
                        {/* Quick Plus */}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleCreatePage(page.id, page.section); }}
                            className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-500"
                        >
                            <Plus size={14} />
                        </button>
                        {/* Menu Trigger (Optional visual cue) */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, pageId: page.id }); }}
                            className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-500"
                        >
                            <MoreHorizontal size={14} />
                        </button>
                    </div>
                </div>

                {!isCollapsed && hasChildren && (
                    <div>
                        {visiblePages.filter(p => p.parentId === page.id).map(child => (
                            <PageItem key={child.id} page={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const childrenPadding = (level: number) => 12 + (level * 12);

    return (
        <div className="w-[240px] h-screen bg-[#F7F7F5] dark:bg-[#202020] border-r border-gray-200 dark:border-gray-800 flex flex-col font-sans transition-colors shrink-0">
            {/* Workspace Switcher / User */}
            <div className="p-3 hover:bg-gray-200 dark:hover:bg-[#2C2C2C] m-2 rounded-md cursor-pointer transition flex items-center gap-2 mb-4">
                {user?.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoURL} alt="Profile" className="w-5 h-5 rounded-md object-cover" />
                ) : (
                    <div className="w-5 h-5 bg-orange-500 rounded text-[10px] text-white flex items-center justify-center font-bold">
                        {user?.displayName ? user.displayName[0].toUpperCase() : "U"}
                    </div>
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex-1">
                    {user?.displayName ? `${user.displayName}'s Note` : "My Workspace"}
                </span>
                <ChevronDown size={14} className="text-gray-400" />
            </div>

            {/* Top Navigation */}
            <div className="flex flex-col gap-0.5 px-2 mb-4">
                <button
                    onClick={() => setIsSearchOpen(true)}
                    className="flex items-center gap-3 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-md transition"
                >
                    <Search size={16} /> <span className="font-medium">Search</span>
                </button>
                <Link
                    href={`/workspace/${workspaceId}/home`}
                    className="flex items-center gap-3 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-md transition"
                >
                    <Home size={16} /> <span className="font-medium">Home</span>
                </Link>
                <button
                    className="flex items-center gap-3 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-md transition"
                >
                </button>

                <Link
                    href={`/workspace/${workspaceId}/ai`}
                    className="flex items-center gap-3 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-md transition"
                >
                    <Sparkles size={16} className="text-purple-500" /> <span className="font-medium text-gray-900 dark:text-gray-200">Ask AI</span>
                </Link>
                <Link
                    href={`/workspace/${workspaceId}/calendar`}
                    className="flex items-center gap-3 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-md transition"
                >
                    <Calendar size={16} className="text-pink-500" /> <span className="font-medium text-gray-900 dark:text-gray-200">Calendar</span>
                </Link>
            </div>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">

                {/* Favorites */}
                {favoritePages.length > 0 && (
                    <div className="mb-6">
                        <div className="px-4 py-1 text-xs font-semibold text-gray-500 dark:text-gray-500 mb-1 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] cursor-pointer flex items-center justify-between group">
                            <span>Favorites</span>
                        </div>
                        {favoritePages.map(page => (
                            <PageItem key={page.id} page={page} />
                        ))}
                    </div>
                )}

                {/* Teamspaces (Workspace) */}
                <div className="mb-6">
                    <div className="px-4 py-1 text-xs font-semibold text-gray-500 dark:text-gray-500 mb-1 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] cursor-pointer flex items-center justify-between group">
                        <span>Teamspaces</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCreatePage(null, 'workspace'); }} className="opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-600 rounded p-0.5">
                            <Plus size={12} />
                        </button>
                    </div>
                    {workspaceRootPages.map(page => (
                        <PageItem key={page.id} page={page} />
                    ))}
                    {workspaceRootPages.length === 0 && <div className="px-7 text-xs text-gray-400 italic">No workspace pages</div>}
                </div>

                {/* Private */}
                <div>
                    <div className="px-4 py-1 text-xs font-semibold text-gray-500 dark:text-gray-500 mb-1 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] cursor-pointer flex items-center justify-between group">
                        <span>Private</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCreatePage(null, 'private'); }} className="opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-600 rounded p-0.5">
                            <Plus size={12} />
                        </button>
                    </div>
                    {privateRootPages.map(page => (
                        <PageItem key={page.id} page={page} />
                    ))}
                    {privateRootPages.length === 0 && <div className="px-7 text-xs text-gray-400 italic">No private pages</div>}
                </div>

            </div>

            {/* Bottom: Trash & Settings */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-1">
                <button
                    onClick={() => setIsTrashOpen(true)}
                    className="flex items-center gap-3 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-md transition"
                >
                    <Trash size={16} /> <span className="font-medium">Trash</span>
                </button>
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center gap-3 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-md transition"
                >
                    <Settings size={16} /> <span className="font-medium">Settings</span>
                </button>
            </div>

            {/* Trash Modal */}
            {isTrashOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setIsTrashOpen(false)}>
                    <div className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h2 className="font-bold text-lg dark:text-white">Trash</h2>
                            <div className="flex gap-2">
                                {selectedTrash.size > 0 && (
                                    <>
                                        <button onClick={handleBulkRestore} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">Restore {selectedTrash.size}</button>
                                        <button onClick={handleBulkDelete} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded">Delete {selectedTrash.size}</button>
                                    </>
                                )}
                                <button onClick={() => setIsTrashOpen(false)}><X className="text-gray-400" size={20} /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            <div className="flex items-center px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-2">
                                <input
                                    type="checkbox"
                                    checked={selectedTrash.size === trashPages.length && trashPages.length > 0}
                                    onChange={handleSelectAllTrash}
                                    className="mr-3"
                                />
                                <span className="text-xs font-bold text-gray-500">Select All</span>
                            </div>

                            {trashPages.map(page => (
                                <div key={page.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#252525] rounded group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <input
                                            type="checkbox"
                                            checked={selectedTrash.has(page.id)}
                                            onChange={() => handleSelectTrash(page.id)}
                                        />
                                        <div className="flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                                            {page.icon || "📄"}
                                        </div>
                                        <div className="flex flex-col truncate">
                                            <span className="text-sm font-medium dark:text-gray-200 truncate">{page.title}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => handleRestore(page.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500" title="Restore"><Copy size={14} className="rotate-180" /></button>
                                        <button onClick={() => handlePermanentDelete(page.id)} className="p-1 hover:bg-red-100 hover:text-red-500 rounded text-gray-400" title="Delete Forever"><Trash size={14} /></button>
                                    </div>
                                </div>
                            ))}
                            {trashPages.length === 0 && <div className="p-8 text-center text-gray-400">Trash is empty</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-[100] bg-[#222] text-gray-300 rounded-lg shadow-xl border border-gray-700 w-56 py-1 text-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: Math.min(contextMenu.y, window.innerHeight - 300), left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-1.5 text-xs text-gray-500 font-semibold border-b border-gray-700 mb-1">Page</div>

                    <button onClick={() => handleAction('favorite', contextMenu.pageId)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-600 hover:text-white transition text-left">
                        <Star size={14} /> {pages.find(p => p.id === contextMenu.pageId)?.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    </button>
                    <button onClick={() => handleAction('copy_link', contextMenu.pageId)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-600 hover:text-white transition text-left">
                        <Copy size={14} /> Copy link
                    </button>
                    <button onClick={() => handleAction('duplicate', contextMenu.pageId)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-600 hover:text-white transition text-left">
                        <Copy size={14} /> Duplicate
                    </button>
                    <button onClick={() => handleAction('rename', contextMenu.pageId)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-600 hover:text-white transition text-left">
                        <Edit size={14} /> Rename
                    </button>
                    <button onClick={() => handleAction('open_new_tab', contextMenu.pageId)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-600 hover:text-white transition text-left">
                        <ExternalLink size={14} /> Open in new tab
                    </button>

                    <div className="h-px bg-gray-700 my-1" />

                    <button onClick={() => handleAction('trash', contextMenu.pageId)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-600 hover:text-white text-red-400 transition text-left">
                        <Trash size={14} /> Move to Trash
                    </button>
                </div>
            )}

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} initialTab="general" />
            <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                pages={visiblePages}
                workspaceId={workspaceId}
            />
        </div>
    );
}
