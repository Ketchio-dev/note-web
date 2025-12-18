"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Type, Hash, Calendar, CheckSquare, Link as LinkIcon, Mail, Phone, Folder, Calculator, GitBranch, Sigma, Users, FileText, MoreHorizontal, Trash2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Page } from '@/lib/workspace';
import SelectOptionsEditor from './SelectOptionsEditor';

type Property = NonNullable<Page['properties']>[number];
type SelectOption = NonNullable<Property['options']>[number];

interface PropertyMenuProps {
    property: Property;
    onUpdate: (updates: Partial<Property>) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onMove?: (direction: 'left' | 'right') => void;
    onClose: () => void;
}

const PROPERTY_TYPES = [
    { type: 'text', value: 'text', label: 'Text', icon: Type },
    { type: 'number', value: 'number', label: 'Number', icon: Hash },
    { type: 'select', value: 'select', label: 'Select', icon: Type },
    { type: 'multi-select', value: 'multi-select', label: 'Multi-select', icon: Type },
    { type: 'date', value: 'date', label: 'Date', icon: Calendar },
    { type: 'checkbox', value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
    { type: 'url', value: 'url', label: 'URL', icon: LinkIcon },
    { type: 'email', value: 'email', label: 'Email', icon: Mail },
    { type: 'phone', value: 'phone', label: 'Phone', icon: Phone },
    { type: 'files', value: 'files', label: 'Files', icon: Folder },
    { type: 'formula', value: 'formula', label: 'Formula', icon: Calculator },
    { type: 'relation', value: 'relation', label: 'Relation', icon: GitBranch },
    { type: 'rollup', value: 'rollup', label: 'Rollup', icon: Sigma },
    { type: 'person', value: 'person', label: 'Person', icon: Users },
];

export default function PropertyMenu({ property, onUpdate, onDelete, onDuplicate, onMove, onClose }: PropertyMenuProps) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [propertyName, setPropertyName] = useState(property.name);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [showOptionsEditor, setShowOptionsEditor] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Close menu when clicking outside
    const handleClickOutside = useCallback((event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);

    // Focus input when editing
    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    const handleNameSave = () => {
        if (propertyName.trim() && propertyName !== property.name) {
            onUpdate({ name: propertyName.trim() });
        }
        setIsEditingName(false);
    };

    const handleTypeChange = (newType: string) => {
        onUpdate({ type: newType as Property['type'] });
        setShowTypeDropdown(false);
    };

    const handleUpdateOptions = (newOptions: SelectOption[]) => {
        onUpdate({ options: newOptions });
        setShowOptionsEditor(false);
    };

    const currentType = PROPERTY_TYPES.find(t => t.type === property.type);
    const TypeIcon = currentType?.icon || Type;

    return (
        <div
            ref={menuRef}
            className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800 z-50 py-2 animate-in fade-in zoom-in-95 duration-100"
        >
            {/* Property Name Editor */}
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                {isEditingName ? (
                    <input
                        ref={nameInputRef}
                        type="text"
                        value={propertyName}
                        onChange={(e) => setPropertyName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleNameSave();
                            if (e.key === 'Escape') {
                                setPropertyName(property.name);
                                setIsEditingName(false);
                            }
                        }}
                        className="w-full px-2 py-1 text-sm font-medium bg-gray-50 dark:bg-[#2C2C2C] border border-blue-500 rounded focus:outline-none"
                    />
                ) : (
                    <button
                        onClick={() => setIsEditingName(true)}
                        className="w-full text-left px-2 py-1 text-sm font-medium hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded"
                    >
                        {property.name}
                    </button>
                )}
            </div>

            {/* Property Type Selector */}
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded"
                >
                    <div className="flex items-center gap-2">
                        <TypeIcon size={14} className="text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">
                            {currentType?.label || property.type}
                        </span>
                    </div>
                    <ChevronDown size={14} className="text-gray-400" />
                </button>

                {showTypeDropdown && (
                    <div className="mt-1 max-h-[300px] overflow-y-auto bg-white dark:bg-[#2C2C2C] rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                        {PROPERTY_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => handleTypeChange(type.value)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#333] ${type.value === property.type ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <Icon size={14} />
                                    {type.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="py-1">
                {(property.type === 'select' || property.type === 'multi-select') && (
                    <button
                        onClick={() => setShowOptionsEditor(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2C2C2C]"
                    >
                        <MoreHorizontal size={14} />
                        Edit options
                    </button>
                )}

                <button
                    onClick={onDuplicate}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2C2C2C]"
                >
                    <Copy size={14} />
                    Duplicate
                </button>

                {onMove && (
                    <>
                        <button
                            onClick={() => onMove('left')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2C2C2C]"
                        >
                            <ChevronLeft size={14} />
                            Move left
                        </button>
                        <button
                            onClick={() => onMove('right')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2C2C2C]"
                        >
                            <ChevronRight size={14} />
                            Move right
                        </button>
                    </>
                )}

                <button
                    onClick={onDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                    <Trash2 size={14} />
                    Delete property
                </button>
            </div>

            {/* Select Options Editor Modal */}
            {showOptionsEditor && (
                <SelectOptionsEditor
                    options={property.options || []}
                    onUpdate={handleUpdateOptions}
                    onClose={() => setShowOptionsEditor(false)}
                />
            )}
        </div>
    );
}
