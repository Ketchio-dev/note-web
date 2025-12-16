"use client";

import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { DATABASE_TEMPLATES, DatabaseTemplate } from '@/lib/database-templates';
import TemplateCard from '@/components/database/TemplateCard';

interface TemplateGalleryProps {
    isOpen: boolean;
    onSelect: (template: DatabaseTemplate) => void;
    onClose: () => void;
}

export default function TemplateGallery({ isOpen, onSelect, onClose }: TemplateGalleryProps) {
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const filteredTemplates = DATABASE_TEMPLATES.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                            Choose a template
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search templates..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Template Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {filteredTemplates.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No templates found
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredTemplates.map((template) => (
                                <TemplateCard
                                    key={template.id}
                                    template={template}
                                    onClick={() => onSelect(template)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
