"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import debounce from "lodash.debounce";
import { Page, createPage, updatePage } from "@/lib/workspace";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Hash, Type, Calendar, ChevronDown, FileText, MoreHorizontal, CheckSquare, Link as LinkIcon, Mail, Phone, Folder, Calculator, GitBranch, Sigma, Table, BarChart3, Grid, Trello, List as ListIcon, CalendarDays, GanttChartSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PropertyRenderer from "./PropertyRenderer";

// Lazy load heavy view components to reduce initial bundle size
const ListView = dynamic(() => import("./ListView"), {
    loading: () => <div className="p-4 text-center text-gray-500">Loading list...</div>
});
const CalendarView = dynamic(() => import("./CalendarView"), {
    loading: () => <div className="p-4 text-center text-gray-500">Loading calendar...</div>
});
const TimelineView = dynamic(() => import("./TimelineView"), {
    loading: () => <div className="p-4 text-center text-gray-500">Loading timeline...</div>
});
import DatabaseControls from "./DatabaseControls";
import { FilterGroup, applyFilters } from "@/lib/filter-engine";
import { Sort, applySorts } from "@/lib/sort-engine";
import PropertyMenu from "./database/PropertyMenu";
import AddColumnModal from "./database/AddColumnModal";
import { PropertyValue } from "@/lib/formula-engine";

type Property = NonNullable<Page['properties']>[number];

interface SavedView {
    id: string;
    name: string;
    viewType: 'table' | 'list' | 'calendar' | 'timeline';
    filters?: FilterGroup;
    sorts?: Sort[];
    isDefault?: boolean;
}

interface DatabaseViewProps {
    workspaceId: string;
    parentPage: Page;
    childPages: Page[];
    onUpdateParent: (data: Partial<Page>) => void;
}

export default function DatabaseView({ workspaceId, parentPage, childPages, onUpdateParent }: DatabaseViewProps) {
    const router = useRouter();
    const [currentView, setCurrentView] = useState<'table' | 'list' | 'calendar' | 'timeline'>('table');

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

    // Ref to prevent infinite re-render when auto-creating Status property
    const hasCreatedStatusRef = useRef(false);

    // Removed Board view auto-create logic

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

    // Memoize addColumn to prevent recreation on every render
    const addColumn = useCallback((name: string, type: Property['type']) => {
        // Create new property with default values
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

        const updatedColumns = [...columns, newColumn];
        onUpdateParent({ properties: updatedColumns });
        setShowAddColumnModal(false);
    }, [columns, onUpdateParent]);

    // Memoize loadView to prevent recreation
    const loadView = useCallback((view: SavedView) => {
        setCurrentView(view.viewType);
        if (view.filters) setFilterGroup(view.filters);
        if (view.sorts) setSorts(view.sorts);
        setShowViewsDropdown(false);
    }, []);

    // Delete saved view
    const deleteView = async (viewId: string) => {
        await onUpdateParent({
            savedViews: savedViews.filter(v => v.id !== viewId)
        });
    };

    // Add Property type for better typing
    type Property = NonNullable<Page['properties']>[number];

    // Debounced update helper - uses Firestore dot notation    // Optimized debounced save with faster delay
    const debouncedSaveProperty = useMemo(
        () => debounce(async (pageId: string, propertyId: string, value: PropertyValue) => {
            await updatePage(pageId, { propertyValues: { [propertyId]: value } });
        }, 300), // Reduced from 500ms to 300ms for better UX
        []
    );

    // Memoize updateCellValue with proper typing
    const updateCellValue = useCallback((pageId: string, propertyId: string, value: PropertyValue) => {
        // Optimistic UI: Update local state immediately
        // The actual update will be debounced
        debouncedSaveProperty(pageId, propertyId, value);
    }, [debouncedSaveProperty]);

    // New Row Menu state
    const [showNewRowMenu, setShowNewRowMenu] = useState(false);
    const newRowMenuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (newRowMenuRef.current && !newRowMenuRef.current.contains(event.target as Node)) {
                setShowNewRowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNewRow = useCallback(async (type: 'page' | 'database' | 'calendar' = 'page') => {
        await createPage(workspaceId, parentPage.id, "Untitled", type, parentPage.section, parentPage.createdBy);
        setShowNewRowMenu(false);
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
                        onClick={() => setCurrentView('list')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${currentView === 'list'
                            ? 'bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        <ListIcon size={14} /> List
                    </button>
                    <button
                        onClick={() => setCurrentView('calendar')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${currentView === 'calendar'
                            ? 'bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        <Calendar size={14} /> Calendar
                    </button>
                    <button
                        onClick={() => setCurrentView('timeline')}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${currentView === 'timeline'
                            ? 'bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        <GanttChartSquare size={14} /> Timeline
                    </button>
                </div>

                <div className="text-gray-400 text-xs px-2">
                    {childPages.length} items
                </div>
                <div className="flex-1" />
                {currentView === 'table' && (
                    <div className="relative" ref={newRowMenuRef}>
                        <button
                            onClick={() => setShowNewRowMenu(!showNewRowMenu)}
                            className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700 transition"
                        >
                            New <ChevronDown size={12} />
                        </button>

                        {showNewRowMenu && (
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
                                <button
                                    onClick={() => handleNewRow('page')}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                >
                                    <FileText size={16} />
                                    <span>Page</span>
                                </button>
                                <button
                                    onClick={() => handleNewRow('database')}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                >
                                    <Table size={16} />
                                    <span>Database</span>
                                </button>
                                <button
                                    onClick={() => handleNewRow('calendar')}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                >
                                    <Calendar size={16} />
                                    <span>Calendar</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Render Current View */}
            {currentView === 'table' && (
                <table className="w-full border-collapse min-w-[600px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800">
                            {/* Name Column (Editable) */}
                            <th className="w-[300px] min-w-[200px] text-left py-2 px-3 font-normal text-xs text-gray-500 border-r border-gray-200 dark:border-gray-800/50 group relative">
                                <div
                                    onClick={() => setActivePropertyMenu(activePropertyMenu === 'name-column' ? null : 'name-column')}
                                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2C2C2C] p-1 rounded -ml-1"
                                >
                                    <FileText size={14} /> Name
                                </div>

                                {/* Property Menu for Name column */}
                                {activePropertyMenu === 'name-column' && (
                                    <div className="absolute left-0 top-full mt-1 z-50">
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 w-48">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-2">
                                                This is a fixed column that shows page names.
                                            </div>
                                            <button
                                                onClick={() => setActivePropertyMenu(null)}
                                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                )}
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
                                            {page.type === 'database' && <Table size={14} />}
                                            {page.type === 'calendar' && <Calendar size={14} />}
                                            {(!page.type || page.type === 'page') && <FileText size={14} />}
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
                            <td className="py-2 px-3 border-r border-gray-100 dark:border-gray-800/50 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm flex items-center gap-2 select-none" onClick={() => handleNewRow('page')}>
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
