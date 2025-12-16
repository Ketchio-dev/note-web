"use client";

import { useState } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';

type PropertyType = 'text' | 'number' | 'select' | 'multi-select' | 'date' | 'person' |
    'files' | 'checkbox' | 'url' | 'email' | 'phone' | 'formula' |
    'relation' | 'rollup' | 'created_time' | 'created_by' | 'last_edited_time' | 'last_edited_by';

interface PropertyOption {
    id: string;
    name: string;
    color: string;
}

interface PropertyConfig {
    id: string;
    name: string;
    type: PropertyType;
    options?: PropertyOption[];
    formula?: string;
    relationTo?: string;
    rollupRelation?: string;
    rollupProperty?: string;
    rollupFunction?: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'show_original';
}

interface PropertyEditorProps {
    isOpen: boolean;
    property: PropertyConfig | null;
    allProperties?: PropertyConfig[];
    onSave: (property: PropertyConfig) => void;
    onDelete?: () => void;
    onClose: () => void;
}

const COLORS = [
    { id: 'gray', name: 'Gray' },
    { id: 'brown', name: 'Brown' },
    { id: 'orange', name: 'Orange' },
    { id: 'yellow', name: 'Yellow' },
    { id: 'green', name: 'Green' },
    { id: 'blue', name: 'Blue' },
    { id: 'purple', name: 'Purple' },
    { id: 'pink', name: 'Pink' },
    { id: 'red', name: 'Red' },
];

const PROPERTY_TYPES: { value: PropertyType; label: string; description: string }[] = [
    { value: 'text', label: 'Text', description: 'Plain text input' },
    { value: 'number', label: 'Number', description: 'Numerical values' },
    { value: 'select', label: 'Select', description: 'Choose from options' },
    { value: 'multi-select', label: 'Multi-select', description: 'Choose multiple options' },
    { value: 'date', label: 'Date', description: 'Date picker' },
    { value: 'checkbox', label: 'Checkbox', description: 'True/false toggle' },
    { value: 'url', label: 'URL', description: 'Web link' },
    { value: 'email', label: 'Email', description: 'Email address' },
    { value: 'phone', label: 'Phone', description: 'Phone number' },
    { value: 'person', label: 'Person', description: 'Assign to person' },
    { value: 'files', label: 'Files', description: 'File attachments' },
    { value: 'formula', label: 'Formula', description: 'Calculate values' },
    { value: 'relation', label: 'Relation', description: 'Link to another database' },
    { value: 'rollup', label: 'Rollup', description: 'Aggregate from relations' },
];

export default function PropertyEditor({ isOpen, property, allProperties = [], onSave, onDelete, onClose }: PropertyEditorProps) {
    const [config, setConfig] = useState<PropertyConfig>(
        property || {
            id: crypto.randomUUID(),
            name: 'New Property',
            type: 'text',
        }
    );

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    const addOption = () => {
        const newOption: PropertyOption = {
            id: crypto.randomUUID(),
            name: `Option ${(config.options?.length || 0) + 1}`,
            color: 'blue',
        };
        setConfig({ ...config, options: [...(config.options || []), newOption] });
    };

    const updateOption = (id: string, updates: Partial<PropertyOption>) => {
        setConfig({
            ...config,
            options: config.options?.map(opt => opt.id === id ? { ...opt, ...updates } : opt),
        });
    };

    const removeOption = (id: string) => {
        setConfig({
            ...config,
            options: config.options?.filter(opt => opt.id !== id),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {property ? 'Edit Property' : 'New Property'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Property Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Property Name
                        </label>
                        <input
                            type="text"
                            value={config.name}
                            onChange={(e) => setConfig({ ...config, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter property name"
                        />
                    </div>

                    {/* Property Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Property Type
                        </label>
                        <select
                            value={config.type}
                            onChange={(e) => setConfig({ ...config, type: e.target.value as PropertyType })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {PROPERTY_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label} - {type.description}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Select/Multi-select Options */}
                    {(config.type === 'select' || config.type === 'multi-select') && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Options
                                </label>
                                <button
                                    onClick={addOption}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                                >
                                    <Plus size={14} /> Add Option
                                </button>
                            </div>
                            <div className="space-y-2">
                                {config.options?.map(option => (
                                    <div key={option.id} className="flex items-center gap-2">
                                        <GripVertical size={14} className="text-gray-400 cursor-grab" />
                                        <input
                                            type="text"
                                            value={option.name}
                                            onChange={(e) => updateOption(option.id, { name: e.target.value })}
                                            className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] rounded text-sm"
                                            placeholder="Option name"
                                        />
                                        <select
                                            value={option.color}
                                            onChange={(e) => updateOption(option.id, { color: e.target.value })}
                                            className="px-2 py-1.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] rounded text-sm"
                                        >
                                            {COLORS.map(color => (
                                                <option key={color.id} value={color.id}>{color.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => removeOption(option.id)}
                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Formula */}
                    {config.type === 'formula' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Formula
                            </label>
                            <textarea
                                value={config.formula || ''}
                                onChange={(e) => setConfig({ ...config, formula: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={4}
                                placeholder='prop("Price") * 1.1'
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                Use <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">prop("PropertyName")</code> to reference other properties
                            </p>
                        </div>
                    )}

                    {/* Relation */}
                    {config.type === 'relation' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Related Database
                            </label>
                            <input
                                type="text"
                                value={config.relationTo || ''}
                                onChange={(e) => setConfig({ ...config, relationTo: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] rounded-lg text-sm"
                                placeholder="Database ID or name"
                            />
                        </div>
                    )}

                    {/* Rollup */}
                    {config.type === 'rollup' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Relation Property
                                </label>
                                <select
                                    value={config.rollupRelation || ''}
                                    onChange={(e) => setConfig({ ...config, rollupRelation: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] rounded-lg text-sm"
                                >
                                    <option value="">Select relation...</option>
                                    {allProperties?.filter(p => p.type === 'relation').map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Property to Rollup
                                </label>
                                <input
                                    type="text"
                                    value={config.rollupProperty || ''}
                                    onChange={(e) => setConfig({ ...config, rollupProperty: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] rounded-lg text-sm"
                                    placeholder="Property name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Calculation
                                </label>
                                <select
                                    value={config.rollupFunction || 'count'}
                                    onChange={(e) => setConfig({ ...config, rollupFunction: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] rounded-lg text-sm"
                                >
                                    <option value="count">Count all</option>
                                    <option value="sum">Sum</option>
                                    <option value="avg">Average</option>
                                    <option value="min">Min</option>
                                    <option value="max">Max</option>
                                    <option value="show_original">Show original</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div>
                        {onDelete && property && (
                            <button
                                onClick={() => {
                                    onDelete();
                                    onClose();
                                }}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
                            >
                                Delete Property
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
