"use client";

import { useState, useEffect } from "react";
import { Page, createPage, subscribeToWorkspacePages, updatePage, deletePage, movePage } from "@/lib/workspace";
import { ChevronRight, ChevronDown, FileText, Plus, Settings, Trash, MoreHorizontal, Star, Copy, Edit, ExternalLink, AppWindow, FolderInput, Home, Sun, Moon, Sparkles, Search, Layout, X, Calendar } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SettingsModal from "./SettingsModal";
import SearchModal from "./SearchModal";
import TemplatePicker from "./TemplatePicker";
import { Template, renderTemplate } from "@/lib/templates";
import { toast } from "sonner";

// DnD Kit
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, MeasuringStrategy, DragOverlay, defaultDropAnimationSideEffects, DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortablePageItem({
    page,
    level = 0,
    hasChildren,
    isCollapsed,
    isActive,
    onToggleCollapse,
    onCreatePage,
    onContextMenu,
    onClick
}: {
    page: Page,
    level: number,
    hasChildren: boolean,
    isCollapsed: boolean,
    isActive: boolean,
    onToggleCollapse: (id: string) => void,
    onCreatePage: (parentId: string | null, section: any) => void,
    onContextMenu: (e: React.MouseEvent, id: string) => void,
    onClick: (id: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: page.id,
        data: {
            type: 'page',
            page
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        paddingLeft: 12 + (level * 12),
        opacity: isDragging ? 0.3 : 1
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`group flex items-center gap-1 min-h-[28px] py-1 px-3 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] text-sm text-gray-600 dark:text-gray-400 select-none cursor-pointer transition-colors relative
                ${isActive ? "bg-gray-100 dark:bg-[#2C2C2C] font-medium text-gray-900 dark:text-gray-100" : ""}
            `}
            onClick={() => onClick(page.id)}
            onContextMenu={(e) => onContextMenu(e, page.id)}
        >
            <button
                onClick={(e) => { e.stopPropagation(); onToggleCollapse(page.id); }}
                className={`p-0.5 rounded-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition ${!hasChildren ? "opacity-0" : "opacity-100"}`}
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
            >
                <ChevronRight size={12} className={`transition-transform duration-200 ${!isCollapsed ? "rotate-90" : ""}`} />
            </button>

            <div className="flex items-center justify-center text-lg w-5 h-5 mr-1">
                {page.icon ? page.icon : (page.type === 'database' ? <Layout size={14} /> : <FileText size={14} />)}
            </div>

            <span className="truncate flex-1">{page.title || "Untitled"}</span>

            {/* Actions */}
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition absolute right-2 bg-gray-100 dark:bg-[#2C2C2C] pl-2 shadow-sm rounded-sm">
                <button
                    onClick={(e) => { e.stopPropagation(); onCreatePage(page.id, page.section); }}
                    className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-500"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Plus size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onContextMenu(e, page.id); }}
                    className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-500"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <MoreHorizontal size={14} />
                </button>
            </div>
        </div>
    );
}

export default function Sidebar({ workspaceId }: { workspaceId: string }) {
    const [pages, setPages] = useState<Page[]>([]);
    const params = useParams();
    const router = useRouter();
    const activePageId = params.pageId as string | null;
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();

    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, pageId: string } | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [selectedTrash, setSelectedTrash] = useState<Set<string>>(new Set());
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // Initial Sort helper: client-side sort
    const sortPages = (rawPages: Page[]) => {
        return [...rawPages].sort((a, b) => {
            const orderA = a.order ?? (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
            const orderB = b.order ?? (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
            return orderA - orderB;
        });
    };

    useEffect(() => {
        const unsubscribe = subscribeToWorkspacePages(workspaceId, (fetchedPages) => {
            setPages(sortPages(fetchedPages));
        });
        return () => unsubscribe();
    }, [workspaceId]);

    const toggleCollapse = (pageId: string) => {
        setCollapsed(prev => ({ ...prev, [pageId]: !prev[pageId] }));
    };

    // --- DnD Logic ---
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5 // drag only after moving 5px
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeId === overId) return;

        // Find current relationship
        const activePage = pages.find(p => p.id === activeId);
        const overPage = pages.find(p => p.id === overId);

        if (!activePage || !overPage) return;

        // We are moving 'active' relative to 'over'
        // Strategy: We will treat this as a reorder within the same parent IF they share a parent.
        // OR if dropping onto a different parent, we reparent.

        // But standard Sortable behavior is "insert after/before".
        // To handle "drop INTO folder", we usually need a separate drop zone or precise logic.
        // For simplicity, we will stick to REORDERING within the visible list.
        // If sorting across levels is needed, we normally flatten the tree or use a Tree specific lib.
        // Here, we can achieve moving items by logic:
        // "If I drop A over B, I want A to take B's place in B's parent list."

        // Wait, if we want to support nesting via DnD, it's complex with just flat List Sortable.
        // Let's implement: Reorder SIBLINGS. Reparenting is harder without a specific "Drop on top" intent.
        // Let's stick to simple reordering for now as requested, maybe Reparenting if simple.

        // Reorder Logic:
        // Update local state first to be snappy
        const oldIndex = pages.findIndex(p => p.id === activeId);
        const newIndex = pages.findIndex(p => p.id === overId);

        // Check if we are checking different parents or same parent
        // If same parent, simple reorder.
        if (activePage.parentId === overPage.parentId) {
            const newPages = arrayMove(pages, oldIndex, newIndex);
            // Re-sort only the siblings to assign new order keys
            const siblings = newPages.filter(p => p.parentId === activePage.parentId);
            // Assign order based on index
            // We can just update the Order of the active item to be between neighbors?
            // Or update ALL siblings order? Updating all is safer for consistency but more writes.
            // Let's update all siblings for robustness in this small app.
            setPages(newPages); // Optimistic

            const parentId = activePage.parentId;
            const siblingItems = newPages.filter(p => p.parentId === parentId);

            // Update all affected siblings order in DB
            // Batch ideally, but loop for now
            await Promise.all(siblingItems.map((page, index) => {
                return updatePage(page.id, { order: index });
            }));
        } else {
            // Different parent? 
            // If we drop a specialized item list, it might be tricky.
            // Allow moving between root and folder?
            // If we visualize flat list, it works. But our UI is recursive.
        }
    };

    // Recursive render helper to collect items for SortableContext
    // Actually, each level should probably be its own SortableContext?
    // Using multiple SortableContexts is fine.

    const PageList = ({
        parentId,
        items,
        level = 0
    }: {
        parentId: string | null,
        items: Page[],
        level?: number
    }) => {
        // Filter items for this level
        // We need to sort them by order
        const siblingItems = items.filter(p => p.parentId === parentId && !p.inTrash);
        // They are already sorted by the main state 'pages' if we keep 'pages' sorted.
        // But 'pages' is flat.

        // Let's rely on the order in the filtered list.
        const sortedSiblings = siblingItems; // already sorted by effect?

        return (
            <SortableContext
                items={sortedSiblings.map(p => p.id)}
                strategy={verticalListSortingStrategy}
            >
                <div>
                    {sortedSiblings.map(page => {
                        const hasChildren = items.some(p => p.parentId === page.id && !p.inTrash);
                        const isCollapsed = collapsed[page.id];

                        return (
                            <div key={page.id}>
                                <SortablePageItem
                                    page={page}
                                    level={level}
                                    hasChildren={hasChildren}
                                    isCollapsed={!!isCollapsed}
                                    isActive={activePageId === page.id}
                                    onToggleCollapse={toggleCollapse}
                                    onCreatePage={handleCreatePage}
                                    onContextMenu={handleContextMenu}
                                    onClick={(id) => router.push(`/workspace/${workspaceId}/${id}`)}
                                />
                                {!isCollapsed && hasChildren && (
                                    <PageList parentId={page.id} items={items} level={level + 1} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </SortableContext>
        );
    };

    const handleCreatePage = async (parentId: string | null = null, section: 'private' | 'workspace' = 'workspace') => {
        const newPage = await createPage(workspaceId, parentId, "Untitled", 'page', section, user?.uid);
        router.push(`/workspace/${workspaceId}/${newPage.id}`);
        if (parentId) {
            setCollapsed(prev => ({ ...prev, [parentId]: false }));
        }
    };

    const handleTemplateSelect = async (template: Template) => {
        const content = renderTemplate(template);
        const newPage = await createPage(
            workspaceId,
            null,
            template.name,
            'page',
            'workspace',
            user?.uid
        );
        // Update with template content
        await updatePage(newPage.id, { content, icon: template.icon });

        // Show success toast
        toast.success(`${template.icon} ${template.name} created!`, {
            description: 'Your page is ready to use',
            duration: 2000
        });

        router.push(`/workspace/${workspaceId}/${newPage.id}`);
        setIsTemplatePickerOpen(false);
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

    const handleSelectTrash = (pageId: string) => {
        const next = new Set(selectedTrash);
        if (next.has(pageId)) next.delete(pageId);
        else next.add(pageId);
        setSelectedTrash(next);
    };

    const handleSelectAllTrash = () => {
        const trashPages = pages.filter(p => p.inTrash);
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
                break;
        }
    };

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
                <div className="h-2"></div>
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
                <button
                    onClick={() => setIsTemplatePickerOpen(true)}
                    className="flex items-center gap-3 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-md transition"
                >
                    <FileText size={16} className="text-blue-500" /> <span className="font-medium text-gray-900 dark:text-gray-200">New from Template</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">

                {/* Favorites */}
                {pages.some(p => p.isFavorite && !p.inTrash) && (
                    <div className="mb-6">
                        <div className="px-4 py-1 text-xs font-semibold text-gray-500 dark:text-gray-500 mb-1">
                            Favorites
                        </div>
                        {pages.filter(p => p.isFavorite && !p.inTrash).map(page => (
                            <div
                                key={page.id}
                                className="group flex items-center gap-1 min-h-[28px] py-1 px-3 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] text-sm text-gray-600 dark:text-gray-400 select-none cursor-pointer"
                                onClick={() => router.push(`/workspace/${workspaceId}/${page.id}`)}
                                onContextMenu={(e) => handleContextMenu(e, page.id)}
                            >
                                <div className="ml-5 flex items-center justify-center text-lg w-5 h-5 mr-1">
                                    {page.icon || <FileText size={14} />}
                                </div>
                                <span className="truncate flex-1">{page.title}</span>
                            </div>
                        ))}
                    </div>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {/* Teamspaces */}
                    <div className="mb-6">
                        <div className="px-4 py-1 text-xs font-semibold text-gray-500 dark:text-gray-500 mb-1 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] cursor-pointer flex items-center justify-between group">
                            <span>Teamspaces</span>
                            <button onClick={(e) => { e.stopPropagation(); handleCreatePage(null, 'workspace'); }} className="opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-600 rounded p-0.5">
                                <Plus size={12} />
                            </button>
                        </div>
                        {/* We filter pages for root workspace here */}
                        <div className="flex flex-col">
                            <PageList parentId={null} items={pages.filter(p => p.section === 'workspace')} />
                            {pages.filter(p => p.section === 'workspace' && !p.parentId && !p.inTrash).length === 0 && (
                                <div className="px-7 text-xs text-gray-400 italic">No workspace pages</div>
                            )}
                        </div>
                    </div>

                    {/* Private */}
                    <div className="mb-6">
                        <div className="px-4 py-1 text-xs font-semibold text-gray-500 dark:text-gray-500 mb-1 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] cursor-pointer flex items-center justify-between group">
                            <span>Private</span>
                            <button onClick={(e) => { e.stopPropagation(); handleCreatePage(null, 'private'); }} className="opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-600 rounded p-0.5">
                                <Plus size={12} />
                            </button>
                        </div>
                        <div className="flex flex-col">
                            <PageList parentId={null} items={pages.filter(p => p.section === 'private')} />
                            {pages.filter(p => p.section === 'private' && !p.parentId && !p.inTrash).length === 0 && (
                                <div className="px-7 text-xs text-gray-400 italic">No private pages</div>
                            )}
                        </div>
                    </div>

                    <DragOverlay>
                        {activeDragId ? (
                            <div className="opacity-80 bg-white dark:bg-[#333] shadow-lg p-2 rounded flex items-center gap-2 border border-gray-200 dark:border-gray-700">
                                <FileText size={14} />
                                <span className="text-sm">{pages.find(p => p.id === activeDragId)?.title || "Untitled"}</span>
                            </div>
                        ) : null}
                    </DragOverlay>

                </DndContext>
            </div>

            {/* Trash Button */}
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

            {/* Modals and Context Menu (Existing code) */}
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
                                    checked={selectedTrash.size === pages.filter(p => p.inTrash).length && pages.filter(p => p.inTrash).length > 0}
                                    onChange={handleSelectAllTrash}
                                    className="mr-3"
                                />
                                <span className="text-xs font-bold text-gray-500">Select All</span>
                            </div>

                            {pages.filter(p => p.inTrash).map(page => (
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
                            {pages.filter(p => p.inTrash).length === 0 && <div className="p-8 text-center text-gray-400">Trash is empty</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* Keeping the Context Menu and Modals as is */}
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

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                pages={pages}
                workspaceId={workspaceId}
            />
            <TemplatePicker
                isOpen={isTemplatePickerOpen}
                onSelect={handleTemplateSelect}
                onClose={() => setIsTemplatePickerOpen(false)}
            />
        </div>
    );
}
