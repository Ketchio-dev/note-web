import React, { useState, useEffect, useRef } from 'react';
import { Page } from '@/lib/workspace';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { X, Plus, Search } from 'lucide-react';

interface RelationRendererProps {
    property: any; // Property with relationTo field
    value: string[] | null; // Array of page IDs
    onChange: (value: string[]) => void;
}

export function RelationRenderer({ property, value, onChange }: RelationRendererProps) {
    const [relatedPages, setRelatedPages] = useState<Page[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedIds = value || [];
    const selectedPages = relatedPages.filter(p => selectedIds.includes(p.id));

    // Subscribe to related database pages
    useEffect(() => {
        if (!property.relationTo) return;

        const q = query(
            collection(db, 'pages'),
            where('parentId', '==', property.relationTo)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pages: Page[] = [];
            snapshot.forEach(doc => {
                pages.push({ id: doc.id, ...doc.data() } as Page);
            });
            setRelatedPages(pages);
        });

        return () => unsubscribe();
    }, [property.relationTo]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const addRelation = (pageId: string) => {
        if (!selectedIds.includes(pageId)) {
            onChange([...selectedIds, pageId]);
        }
    };

    const removeRelation = (pageId: string) => {
        onChange(selectedIds.filter(id => id !== pageId));
    };

    const filteredPages = relatedPages.filter(page =>
        page.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!property.relationTo) {
        return <div className="text-xs text-gray-500">No relation configured</div>;
    }

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* Selected pages display */}
            <div className="flex flex-wrap gap-1 min-h-[32px] items-center">
                {selectedPages.map(page => (
                    <div
                        key={page.id}
                        className="bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 px-2 py-1 rounded text-xs flex items-center gap-1"
                    >
                        <span className="truncate max-w-[120px]">{page.title || 'Untitled'}</span>
                        <button
                            onClick={() => removeRelation(page.id)}
                            className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded p-0.5"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded text-xs flex items-center gap-1"
                >
                    <Plus size={12} />
                    Add
                </button>
            </div>

            {/* Dropdown picker */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                    {/* Search */}
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search pages..."
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Pages list */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredPages.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                                {relatedPages.length === 0 ? 'No pages in database' : 'No matching pages'}
                            </div>
                        ) : (
                            filteredPages.map(page => (
                                <button
                                    key={page.id}
                                    onClick={() => {
                                        addRelation(page.id);
                                        setSearchQuery('');
                                    }}
                                    disabled={selectedIds.includes(page.id)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition ${selectedIds.includes(page.id)
                                            ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800'
                                            : ''
                                        }`}
                                >
                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                        {page.title || 'Untitled'}
                                    </div>
                                    {selectedIds.includes(page.id) && (
                                        <div className="text-xs text-gray-500">Already selected</div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
