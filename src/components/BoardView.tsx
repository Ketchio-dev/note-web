"use client";

import { useState, useEffect } from 'react';
import { Page, updatePage } from '@/lib/workspace';
import { Plus, MoreVertical, FileText } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useRouter } from 'next/navigation';

interface BoardViewProps {
    workspaceId: string;
    parentPage: Page;
    childPages: Page[];
    onUpdateParent: (data: Partial<Page>) => void;
}

export default function BoardView({ workspaceId, parentPage, childPages, onUpdateParent }: BoardViewProps) {
    const router = useRouter();
    const columns = parentPage.properties || [];

    // Find the first select property for grouping
    const groupByProperty = columns.find(c => c.type === 'select' || c.type === 'multi-select');
    const groupOptions = groupByProperty?.options || [];

    // Group pages by status
    const [boardData, setBoardData] = useState<Record<string, Page[]>>({});

    useEffect(() => {
        if (!groupByProperty) return;

        const grouped: Record<string, Page[]> = {};

        // Initialize all columns
        groupOptions.forEach(opt => {
            grouped[opt.id] = [];
        });

        // Add "No status" column
        grouped['__none__'] = [];

        // Group pages
        childPages.forEach(page => {
            const value = page.propertyValues?.[groupByProperty.id];
            if (value && grouped[value]) {
                grouped[value].push(page);
            } else {
                grouped['__none__'].push(page);
            }
        });

        setBoardData(grouped);
    }, [childPages, groupByProperty, groupOptions]);

    const handleDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination || !groupByProperty) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Find the dragged page
        const page = childPages.find(p => p.id === draggableId);
        if (!page) return;

        // Update the page's status
        const newStatus = destination.droppableId === '__none__' ? null : destination.droppableId;
        await updatePage(page.id, {
            propertyValues: {
                ...page.propertyValues,
                [groupByProperty.id]: newStatus,
            }
        });
    };

    if (!groupByProperty) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
                <p className="text-lg font-medium mb-2">No Select Property Found</p>
                <p className="text-sm">Add a Select property to enable Board view</p>
            </div>
        );
    }

    const COLORS: Record<string, string> = {
        gray: 'bg-gray-100 dark:bg-gray-800',
        brown: 'bg-amber-100 dark:bg-amber-900',
        orange: 'bg-orange-100 dark:bg-orange-900',
        yellow: 'bg-yellow-100 dark:bg-yellow-900',
        green: 'bg-green-100 dark:bg-green-900',
        blue: 'bg-blue-100 dark:bg-blue-900',
        purple: 'bg-purple-100 dark:bg-purple-900',
        pink: 'bg-pink-100 dark:bg-pink-900',
        red: 'bg-red-100 dark:bg-red-900',
    };

    return (
        <div className="w-full p-4 md:p-6 overflow-x-auto">
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-4 min-w-max pb-8">
                    {/* Render columns */}
                    {groupOptions.map(option => (
                        <div key={option.id} className="w-80 flex-shrink-0">
                            {/* Column Header */}
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${COLORS[option.color] || COLORS.gray} text-gray-800 dark:text-gray-200`}>
                                        {option.name}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {boardData[option.id]?.length || 0}
                                    </span>
                                </div>
                                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                    <MoreVertical size={16} className="text-gray-400" />
                                </button>
                            </div>

                            {/* Droppable Column */}
                            <Droppable droppableId={option.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`min-h-[200px] p-2 rounded-lg transition-colors ${snapshot.isDraggingOver
                                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                                : 'bg-gray-50 dark:bg-[#1C1C1C]'
                                            }`}
                                    >
                                        {/* Cards */}
                                        {(boardData[option.id] || []).map((page, index) => (
                                            <Draggable key={page.id} draggableId={page.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`mb-2 p-3 bg-white dark:bg-[#252525] rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all cursor-pointer ${snapshot.isDragging ? 'rotate-2 shadow-lg ring-2 ring-blue-500' : ''
                                                            }`}
                                                        onClick={() => router.push(`/workspace/${workspaceId}/${page.id}`)}
                                                    >
                                                        {/* Card Icon */}
                                                        <div className="flex items-start gap-2 mb-2">
                                                            <FileText size={16} className="text-gray-400 mt-0.5" />
                                                            <h4 className="flex-1 font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-2">
                                                                {page.title || 'Untitled'}
                                                            </h4>
                                                        </div>

                                                        {/* Card Properties */}
                                                        <div className="space-y-1">
                                                            {columns.filter(c => c.id !== groupByProperty.id).slice(0, 2).map(col => {
                                                                const value = page.propertyValues?.[col.id];
                                                                if (!value) return null;

                                                                return (
                                                                    <div key={col.id} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                                        <span className="font-medium">{col.name}:</span> {String(value)}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}

                                        {/* Add Card Button */}
                                        <button className="w-full mt-2 p-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-[#252525] rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex items-center justify-center gap-1">
                                            <Plus size={14} />
                                            New
                                        </button>
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}

                    {/* "No Status" Column */}
                    <div className="w-80 flex-shrink-0">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                                    No Status
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {boardData['__none__']?.length || 0}
                                </span>
                            </div>
                        </div>

                        <Droppable droppableId="__none__">
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`min-h-[200px] p-2 rounded-lg transition-colors ${snapshot.isDraggingOver
                                            ? 'bg-blue-50 dark:bg-blue-900/20'
                                            : 'bg-gray-50 dark:bg-[#1C1C1C]'
                                        }`}
                                >
                                    {(boardData['__none__'] || []).map((page, index) => (
                                        <Draggable key={page.id} draggableId={page.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`mb-2 p-3 bg-white dark:bg-[#252525] rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all cursor-pointer ${snapshot.isDragging ? 'rotate-2 shadow-lg ring-2 ring-blue-500' : ''
                                                        }`}
                                                    onClick={() => router.push(`/workspace/${workspaceId}/${page.id}`)}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <FileText size={16} className="text-gray-400 mt-0.5" />
                                                        <h4 className="flex-1 font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-2">
                                                            {page.title || 'Untitled'}
                                                        </h4>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </div>
            </DragDropContext>
        </div>
    );
}
