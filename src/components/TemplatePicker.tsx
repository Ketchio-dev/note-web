"use client";

import { useState, useMemo } from 'react';
import { X, Search, Sparkles } from 'lucide-react';
import { Template, TEMPLATES, getTemplatesByCategory, searchTemplates } from '@/lib/templates';

interface TemplatePickerProps {
    isOpen: boolean;
    onSelect: (template: Template) => void;
    onClose: () => void;
}

type Category = 'all' | 'work' | 'personal' | 'productivity' | 'engineering';

export default function TemplatePicker({ isOpen, onSelect, onClose }: TemplatePickerProps) {
    const [category, setCategory] = useState<Category>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const categories: Array<{ id: Category; label: string }> = [
        { id: 'all', label: 'All Templates' },
        { id: 'work', label: 'Work' },
        { id: 'personal', label: 'Personal' },
        { id: 'productivity', label: 'Productivity' },
        { id: 'engineering', label: 'Engineering' }
    ];

    // Filter templates
    const filteredTemplates = useMemo(() => {
        let templates = category === 'all' ? TEMPLATES : getTemplatesByCategory(category);

        if (searchQuery) {
            templates = searchTemplates(searchQuery);
        }

        return templates;
    }, [category, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-purple-600" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Choose a Template</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Search & Categories */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#252525] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                        />
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setCategory(cat.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${category === cat.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Templates Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {filteredTemplates.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTemplates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => onSelect(template)}
                                    className="group flex flex-col p-4 bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all text-left"
                                >
                                    {/* Icon */}
                                    <div className="text-4xl mb-3">{template.icon}</div>

                                    {/* Title */}
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {template.name}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                        {template.description}
                                    </p>

                                    {/* Tags */}
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {template.tags.slice(0, 3).map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <div className="text-4xl mb-4">🔍</div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                No templates found
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Try a different search term or category
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
