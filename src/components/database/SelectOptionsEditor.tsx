"use client";

import { useState } from 'react';
import { Plus, X, GripVertical, Check } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface SelectOption {
    id: string;
    name: string;
    color: string;
}

interface SelectOptionsEditorProps {
    options: SelectOption[];
    onUpdate: (options: SelectOption[]) => void;
    onClose: () => void;
}

const COLORS = [
    { name: 'Gray', value: 'gray', bg: 'bg-gray-200', text: 'text-gray-800', hover: 'hover:bg-gray-300' },
    { name: 'Blue', value: 'blue', bg: 'bg-blue-200', text: 'text-blue-800', hover: 'hover:bg-blue-300' },
    { name: 'Green', value: 'green', bg: 'bg-green-200', text: 'text-green-800', hover: 'hover:bg-green-300' },
    { name: 'Red', value: 'red', bg: 'bg-red-200', text: 'text-red-800', hover: 'hover:bg-red-300' },
    { name: 'Orange', value: 'orange', bg: 'bg-orange-200', text: 'text-orange-800', hover: 'hover:bg-orange-300' },
    { name: 'Yellow', value: 'yellow', bg: 'bg-yellow-200', text: 'text-yellow-800', hover: 'hover:bg-yellow-300' },
    { name: 'Purple', value: 'purple', bg: 'bg-purple-200', text: 'text-purple-800', hover: 'hover:bg-purple-300' },
    { name: 'Pink', value: 'pink', bg: 'bg-pink-200', text: 'text-pink-800', hover: 'hover:bg-pink-300' },
    { name: 'Brown', value: 'brown', bg: 'bg-amber-200', text: 'text-amber-800', hover: 'hover:bg-amber-300' },
];

export default function SelectOptionsEditor({ options, onUpdate, onClose }: SelectOptionsEditorProps) {
    const [localOptions, setLocalOptions] = useState<SelectOption[]>(options || []);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [colorPickerId, setColorPickerId] = useState<string | null>(null);

    const handleAddOption = () => {
        const newOption: SelectOption = {
            id: crypto.randomUUID(),
            name: 'New Option',
            color: 'gray'
        };
        setLocalOptions([...localOptions, newOption]);
        setEditingId(newOption.id);
        setEditingName(newOption.name);
    };

    const handleEditOption = (id: string, name: string) => {
        setEditingId(id);
        setEditingName(name);
    };

    const handleSaveEdit = () => {
        if (editingId && editingName.trim()) {
            setLocalOptions(localOptions.map(opt =>
                opt.id === editingId ? { ...opt, name: editingName.trim() } : opt
            ));
        }
        setEditingId(null);
        setEditingName('');
    };

    const handleDeleteOption = (id: string) => {
        setLocalOptions(localOptions.filter(opt => opt.id !== id));
    };

    const handleColorChange = (id: string, color: string) => {
        setLocalOptions(localOptions.map(opt =>
            opt.id === id ? { ...opt, color } : opt
        ));
        setColorPickerId(null);
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(localOptions);
        const [reordered] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reordered);

        setLocalOptions(items);
    };

    const handleSave = () => {
        onUpdate(localOptions);
        onClose();
    };

    const getColorClasses = (colorValue: string) => {
        const color = COLORS.find(c => c.value === colorValue) || COLORS[0];
        return color;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Edit Options</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                        <X size={18} />
                    </button>
                </div>

                {/* Options List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="options">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                    {localOptions.map((option, index) => {
                                        const colorClasses = getColorClasses(option.color);
                                        return (
                                            <Draggable key={option.id} draggableId={option.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`flex items-center gap-2 p-2 rounded-lg border ${snapshot.isDragging
                                                                ? 'border-blue-500 shadow-lg bg-white dark:bg-[#2C2C2C]'
                                                                : 'border-gray-200 dark:border-gray-800'
                                                            }`}
                                                    >
                                                        {/* Drag Handle */}
                                                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                                            <GripVertical size={16} className="text-gray-400" />
                                                        </div>

                                                        {/* Option Tag */}
                                                        <div className="relative flex-1">
                                                            {editingId === option.id ? (
                                                                <input
                                                                    value={editingName}
                                                                    onChange={(e) => setEditingName(e.target.value)}
                                                                    onBlur={handleSaveEdit}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleSaveEdit();
                                                                        if (e.key === 'Escape') {
                                                                            setEditingId(null);
                                                                            setEditingName('');
                                                                        }
                                                                    }}
                                                                    autoFocus
                                                                    className={`w-full px-3 py-1 rounded text-sm font-medium border-2 border-blue-500 ${colorClasses.bg} ${colorClasses.text}`}
                                                                />
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleEditOption(option.id, option.name)}
                                                                    className={`w-full text-left px-3 py-1 rounded text-sm font-medium ${colorClasses.bg} ${colorClasses.text} ${colorClasses.hover}`}
                                                                >
                                                                    {option.name}
                                                                </button>
                                                            )}

                                                            {/* Color Picker */}
                                                            {colorPickerId === option.id && (
                                                                <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-[#2C2C2C] rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 z-10">
                                                                    <div className="grid grid-cols-3 gap-1">
                                                                        {COLORS.map((color) => (
                                                                            <button
                                                                                key={color.value}
                                                                                onClick={() => handleColorChange(option.id, color.value)}
                                                                                className={`w-8 h-8 rounded ${color.bg} ${color.hover} flex items-center justify-center`}
                                                                                title={color.name}
                                                                            >
                                                                                {option.color === color.value && (
                                                                                    <Check size={14} className={color.text} />
                                                                                )}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Color Button */}
                                                        <button
                                                            onClick={() => setColorPickerId(colorPickerId === option.id ? null : option.id)}
                                                            className={`w-6 h-6 rounded ${colorClasses.bg} border border-gray-300 dark:border-gray-700`}
                                                            title="Change color"
                                                        />

                                                        {/* Delete Button */}
                                                        <button
                                                            onClick={() => handleDeleteOption(option.id)}
                                                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    {/* Add Option Button */}
                    <button
                        onClick={handleAddOption}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700"
                    >
                        <Plus size={16} />
                        Add option
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
