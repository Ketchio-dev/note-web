"use client";

import { useState } from 'react';
import { X, Type, Hash, Calendar, CheckSquare, Link as LinkIcon, Mail, Phone, Folder, Calculator, GitBranch, Sigma, Users } from 'lucide-react';

interface AddColumnModalProps {
    onAdd: (name: string, type: string) => void;
    onClose: () => void;
}

const PROPERTY_TYPES = [
    { type: 'text', label: 'Text', icon: Type, description: 'Plain text' },
    { type: 'number', label: 'Number', icon: Hash, description: 'Number, currency, percentage' },
    { type: 'select', label: 'Select', icon: Type, description: 'Single tag' },
    { type: 'multi-select', label: 'Multi-select', icon: Type, description: 'Multiple tags' },
    { type: 'date', label: 'Date', icon: Calendar, description: 'Date or date range' },
    { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Yes or no' },
    { type: 'url', label: 'URL', icon: LinkIcon, description: 'Web address' },
    { type: 'email', label: 'Email', icon: Mail, description: 'Email address' },
    { type: 'phone', label: 'Phone', icon: Phone, description: 'Phone number' },
    { type: 'files', label: 'Files', icon: Folder, description: 'File upload' },
    { type: 'formula', label: 'Formula', icon: Calculator, description: 'Calculated value' },
    { type: 'relation', label: 'Relation', icon: GitBranch, description: 'Link to another database' },
    { type: 'rollup', label: 'Rollup', icon: Sigma, description: 'Aggregate from relation' },
    { type: 'person', label: 'Person', icon: Users, description: 'Assign people' },
];

export default function AddColumnModal({ onAdd, onClose }: AddColumnModalProps) {
    const [name, setName] = useState('');
    const [selectedType, setSelectedType] = useState('text');

    const handleCreate = () => {
        if (name.trim()) {
            onAdd(name.trim(), selectedType);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Add Property</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Property Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreate();
                                if (e.key === 'Escape') onClose();
                            }}
                            placeholder="Enter property name..."
                            autoFocus
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#2C2C2C] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Property Type
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                            {PROPERTY_TYPES.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.type}
                                        onClick={() => setSelectedType(type.type)}
                                        className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition ${selectedType === type.type
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                            }`}
                                    >
                                        <Icon size={18} className={selectedType === type.type ? 'text-blue-600' : 'text-gray-400'} />
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-medium ${selectedType === type.type ? 'text-blue-600' : 'text-gray-900 dark:text-gray-100'}`}>
                                                {type.label}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {type.description}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
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
                        onClick={handleCreate}
                        disabled={!name.trim()}
                        className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}
