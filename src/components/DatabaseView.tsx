"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Page, createPage, updatePage } from "@/lib/workspace";
import { Plus, Hash, Type, Calendar, ChevronDown, FileText, MoreHorizontal, CheckSquare, Link as LinkIcon, Mail, Phone, Folder, Calculator, GitBranch, Sigma, Table, BarChart3, Grid, Trello, List as ListIcon, CalendarDays, GanttChartSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PropertyRenderer from "./PropertyRenderer";
import ChartView from "./ChartView";
import GalleryView from "./GalleryView";
import BoardView from "./BoardView";
import ListView from "./ListView";
import CalendarView from "./CalendarView";
import TimelineView from "./TimelineView";
import DatabaseControls from "./DatabaseControls";
import { FilterGroup, applyFilters } from "@/lib/filter-engine";
import { Sort, applySorts } from "@/lib/sort-engine";
import PropertyMenu from "./database/PropertyMenu";
import AddColumnModal from "./database/AddColumnModal";

interface DatabaseViewProps {
    workspaceId: string;
    parentPage: Page;
    childPages: Page[];
    onUpdateParent: (data: Partial<Page>) => void;
}

export default function DatabaseView({ workspaceId, parentPage, childPages, onUpdateParent }: DatabaseViewProps) {
    const router = useRouter();
    const [currentView, setCurrentView] = useState<'table' | 'list' | 'board' | 'gallery' | 'calendar' | 'timeline' | 'chart'>('table');

    // Filter & Sort state
    const [filterGroup, setFilterGroup] = useState<FilterGroup>({ condition: 'AND', filters: [] });
    const [sorts, setSorts] = useState<Sort[]>([]);

    // Saved views
    const savedViews = parentPage.savedViews || [];
    const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
    const [viewName, setViewName] = useState('');
    const [showViewsDropdown, setShowViewsDropdown] = useState(false);

    // Ensure properties is defined
    const columns = parentPage.properties || [];

    // Property Menu state
    const [activePropertyMenu, setActivePropertyMenu] = useState<string | null>(null);
    const [showAddColumnModal, setShowAddColumnModal] = useState(false);

    // Auto-create Select property for Board view if none exists
    useEffect(() => {
        if (currentView === 'board') {
            const hasSelectProperty = columns.some(col => col.type === 'select');

            if (!hasSelectProperty && columns.length >= 0) {
                // Auto-create Status property for Board view
                const statusProperty = {
                    id: crypto.randomUUID(),
                    name: 'Status',
                    type: 'select' as const,
                    options: [
                        { id: crypto.randomUUID(), name: 'Todo', color: 'gray' },
                        { id: crypto.randomUUID(), name: 'In Progress', color: 'blue' },
                        { id: crypto.randomUUID(), name: 'Done', color: 'green' },
                    ]
                };

                onUpdateParent({
                    properties: [...columns, statusProperty]
                });
            }
        }
    }, [currentView, columns]); // Fix: use columns instead of columns.length

    // Memoize expensive calculations
    const filteredAndSortedPages = useMemo(
        () => applySorts(applyFilters(childPages, filterGroup), sorts),
        [childPages, filterGroup, sorts]
    );

    // Save current view
    const saveCurrentView = async () => {
        if (!viewName.trim()) return;

        const newView = {
            id: crypto.randomUUID(),
            name: viewName,
            viewType: currentView,
            filters: filterGroup,
            sorts: sorts
        };

        await onUpdateParent({
            savedViews: [...savedViews, newView]
        });

        setViewName('');
        setShowSaveViewDialog(false);
    };

    // Load saved view
    const loadView = (view: any) => {
        setCurrentView(view.viewType);
        setFilterGroup(view.filters || { condition: 'AND', filters: [] });
        setSorts(view.sorts || []);
        setShowViewsDropdown(false);
    };

    // Delete saved view
    const deleteView = async (viewId: string) => {
        await onUpdateParent({
            savedViews: savedViews.filter(v => v.id !== viewId)
        });
    };

    // Add Property type for better typing
    type Property = NonNullable<Page['properties']>[number];

    const addColumn = useCallback((name: string, type: Property['type']) => {
        // Validation
        if (!name || !name.trim()) {
            console.error('Cannot create column with empty name');
            return;
        }

        const newColumn: Property = {
            id: crypto.randomUUID(),
            name: name.trim(),
            type,
            ...(type === 'select' || type === 'multi-select' ? {
                options: [
                    { id: crypto.randomUUID(), name: 'Option 1', color: 'gray' },
                ]
            } : {})
        };

        onUpdateParent({ properties: [...columns, newColumn] });
        setShowAddColumnModal(false);
    }, [columns, onUpdateParent]);

    const updateCellValue = useCallback(async (pageId: string, propertyId: string, value: any) => {
        const page = childPages.find(p => p.id === pageId);
        if (!page) return;

        const newValues = { ...(page.propertyValues || {}), [propertyId]: value };
        await updatePage(pageId, { propertyValues: newValues });
    }, [childPages]);

    const handleNewRow = useCallback(async () => {
        await createPage(workspaceId, parentPage.id, "Untitled", 'page', parentPage.section, parentPage.createdBy);
    }, [workspaceId, parentPage.id, parentPage.section, parentPage.createdBy]);

    // Property Management Functions
    const updateProperty = useCallback(async (propId: string, updates: Partial<any>) => {
        const updatedColumns = columns.map(col =>
            col.id === propId ? { ...col, ...updates } : col
        );
        await onUpdateParent({ properties: updatedColumns });
        setActivePropertyMenu(null);
    }, [columns, onUpdateParent]);

    const deleteProperty = useCallback(async (propId: string) => {
        if (confirm('Delete this property? All data in this column will be lost.')) {
            const updatedColumns = columns.filter(col => col.id !== propId);
            await onUpdateParent({ properties: updatedColumns });
            setActivePropertyMenu(null);
        }
    }, [columns, onUpdateParent]);

    const duplicateProperty = useCallback(async (propId: string) => {
        const prop = columns.find(c => c.id === propId);
        if (prop) {
            const newProp = {
                ...prop,
                id: crypto.randomUUID(),
                name: `${prop.name} (copy)`
            };
            await onUpdateParent({ properties: [...columns, newProp] });
            setActivePropertyMenu(null);
        }
    }, [columns, onUpdateParent]);

    const moveProperty = useCallback(async (propId: string, direction: 'left' | 'right') => {
        const index = columns.findIndex(c => c.id === propId);
        if (index === -1) return;

        const newIndex = direction === 'left' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= columns.length) return;

        const reordered = [...columns];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(newIndex, 0, moved);

        await onUpdateParent({ properties: reordered });
        setActivePropertyMenu(null);
    }, [columns, onUpdateParent]);

    return (
        <div className="w-full overflow-x-auto pb-20 pl-4 md:pl-0">
            {/* Header / Controls */}
            <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-800 pb-2">
                {/* View Switcher */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#2C2C2C] rounded p-1">
                    <button
                        onClick={() => setCurrentView('table')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${currentView === 'table'
                            ? 'bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        <Table size={14} /> Table
                    </button>
                    <button
                        onClick={() => setCurrentView('board')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${currentView === 'board'
                            ? 'bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        <Trello size={14} /> Board
                    </button>
                    <button
                        onClick={() => setCurrentView('gallery')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${currentView === 'gallery'
                            ? 'bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        <Grid size={14} /> Gallery
                    </button>
                    <button
                        onClick={() => setCurrentView('chart')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${currentView === 'chart'
                            ? 'bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        <BarChart3 size={14} /> Chart
                    </button>
                </div>

                <div className="text-gray-400 text-xs px-2">
                    {childPages.length} items
                </div>
                <div className="flex-1" />
                {currentView === 'table' && (
                    <button onClick={handleNewRow} className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700 transition">
                        New <ChevronDown size={12} />
                    </button>
                )}
            </div>

            {/* Render Current View */}
            {currentView === 'table' && (
                <table className="w-full border-collapse min-w-[600px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800">
                            {/* Name Column (Fixed) */}
                            <th className="w-[300px] min-w-[200px] text-left py-2 px-3 font-normal text-xs text-gray-500 border-r border-gray-200 dark:border-gray-800/50">
                                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2C2C2C] p-1 rounded -ml-1">
                                    <FileText size={14} /> Name
                                </div>
                            </th>

                            {/* Dynamic Columns */}
                            {columns.map(col => {
                                let Icon = Type;
                                if (col.type === 'number') Icon = Hash;
                                else if (col.type === 'select' || col.type === 'multi-select') Icon = Type;
                                else if (col.type === 'date') Icon = Calendar;
                                else if (col.type === 'checkbox') Icon = CheckSquare;
                                else if (col.type === 'url') Icon = LinkIcon;
                                else if (col.type === 'email') Icon = Mail;
                                else if (col.type === 'phone') Icon = Phone;
                                else if (col.type === 'files') Icon = Folder;
                                else if (col.type === 'formula') Icon = Calculator;
                                else if (col.type === 'relation') Icon = GitBranch;
                                else if (col.type === 'rollup') Icon = Sigma;

                                return (
                                    <th key={col.id} className="w-[180px] min-w-[100px] text-left py-2 px-3 font-normal text-xs text-gray-500 border-r border-gray-200 dark:border-gray-800/50 group relative">
                                        <div
                                            onClick={() => setActivePropertyMenu(activePropertyMenu === col.id ? null : col.id)}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2C2C2C] p-1 rounded -ml-1"
                                        >
                                            <Icon size={14} />
                                            {col.name}
                                        </div>

                                        {/* Property Menu */}
                                        {activePropertyMenu === col.id && (
                                            <PropertyMenu
                                                property={col}
                                                onUpdate={(updates) => updateProperty(col.id, updates)}
                                                onDelete={() => deleteProperty(col.id)}
                                                onDuplicate={() => duplicateProperty(col.id)}
                                                onMove={(direction) => moveProperty(col.id, direction)}
                                                onClose={() => setActivePropertyMenu(null)}
                                            />
                                        )}
                                    </th>
                                );
                            })}

                            {/* Add Column Button */}
                            <th className="w-[50px] text-left py-2 px-1 border-r border-transparent">
                                <button onClick={() => setShowAddColumnModal(true)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded transition">
                                    <Plus size={16} className="text-gray-400" />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {childPages.map(page => (
                            <tr key={page.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#202020] group h-[34px]">
                                {/* Name Cell */}
                                <td className="p-0 border-r border-gray-100 dark:border-gray-800/50 relative">
                                    <div className="flex items-center gap-2 px-3 h-full">
                                        <button
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-[#333] rounded text-gray-400 transition"
                                            onClick={() => router.push(`/workspace/${workspaceId}/${page.id}`)}
                                            title="Open Page"
                                        >
                                            <FileText size={14} />
                                        </button>
                                        <input
                                            className="flex-1 bg-transparent outline-none font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                            value={page.title}
                                            onChange={(e) => updatePage(page.id, { title: e.target.value })}
                                            placeholder="Untitled"
                                        />
                                        <span
                                            className="text-[10px] text-gray-400 uppercase font-bold opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-[#333] px-1 rounded cursor-pointer transition"
                                            onClick={() => router.push(`/workspace/${workspaceId}/${page.id}`)}
                                        >
                                            Open
                                        </span>
                                    </div>
                                </td>

                                {/* Property Cells */}
                                {columns.map(col => (
                                    <td key={col.id} className="p-0 border-r border-gray-100 dark:border-gray-800/50">
                                        <PropertyRenderer
                                            property={col}
                                            value={page.propertyValues?.[col.id]}
                                            onChange={(newValue) => updateCellValue(page.id, col.id, newValue)}
                                        />
                                    </td>
                                ))}

                                <td className="p-0 border-gray-100 dark:border-gray-800/50" />
                            </tr>
                        ))}

                        {/* Make New Row */}
                        <tr className="border-b border-transparent">
                            <td className="py-2 px-3 border-r border-gray-100 dark:border-gray-800/50 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm flex items-center gap-2 select-none" onClick={handleNewRow}>
                                <Plus size={14} /> New
                            </td>
                            <td colSpan={columns.length + 1} />
                        </tr>
                    </tbody>
                </table>
            )}

            {currentView === 'list' && (
                <ListView workspaceId={workspaceId} parentPage={parentPage} childPages={filteredAndSortedPages} />
            )}

            {currentView === 'calendar' && (
                <CalendarView workspaceId={workspaceId} parentPage={parentPage} childPages={filteredAndSortedPages} />
            )}

            {currentView === 'timeline' && (
                <TimelineView workspaceId={workspaceId} parentPage={parentPage} childPages={filteredAndSortedPages} />
            )}

            {currentView === 'chart' && (
                <ChartView parentPage={parentPage} childPages={childPages} />
            )}

            {currentView === 'gallery' && (
                <GalleryView workspaceId={workspaceId} parentPage={parentPage} childPages={childPages} />
            )}

            {currentView === 'board' && (
                <BoardView
                    workspaceId={workspaceId}
                    parentPage={parentPage}
                    childPages={childPages}
                    onUpdateParent={onUpdateParent}
                />
            )}

            {/* Add Column Modal */}
            {showAddColumnModal && (
                <AddColumnModal
                    onAdd={addColumn}
                    onClose={() => setShowAddColumnModal(false)}
                />
            )}
        </div>
    );
}
