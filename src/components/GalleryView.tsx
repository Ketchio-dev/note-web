"use client";

import { Page, updatePage } from '@/lib/workspace';
import { FileText, MoreVertical, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PropertyRenderer from './PropertyRenderer';

interface GalleryViewProps {
    workspaceId: string;
    parentPage: Page;
    childPages: Page[];
}

export default function GalleryView({ workspaceId, parentPage, childPages }: GalleryViewProps) {
    const router = useRouter();
    const columns = parentPage.properties || [];

    // Find cover/image property (if exists)
    const coverProperty = columns.find(c => c.type === 'url' && c.name.toLowerCase().includes('cover'));

    // Find key properties to display
    const displayProperties = columns.slice(0, 3);

    return (
        <div className="w-full p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {childPages.map(page => {
                    const coverUrl = coverProperty ? page.propertyValues?.[coverProperty.id] : null;

                    return (
                        <div
                            key={page.id}
                            className="group bg-white dark:bg-[#1C1C1C] rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer"
                            onClick={() => router.push(`/workspace/${workspaceId}/${page.id}`)}
                        >
                            {/* Cover Image */}
                            {coverUrl ? (
                                <div className="relative w-full h-40 bg-gradient-to-br from-blue-500 to-purple-600">
                                    <img
                                        src={coverUrl}
                                        alt={page.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <FileText size={48} className="text-white/30" />
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-4">
                                {/* Title */}
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {page.title || 'Untitled'}
                                </h3>

                                {/* Properties */}
                                <div className="space-y-1">
                                    {columns.slice(0, 3).map(col => {
                                        const value = page.propertyValues?.[col.id];

                                        // Special handling for progress bars in gallery
                                        if (col.type === 'progress') {
                                            const numValue = Number(value) || 0;
                                            const max = col.max || 100;
                                            const percentage = Math.min(100, Math.max(0, (numValue / max) * 100));

                                            return (
                                                <div key={col.id} className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 min-w-[60px]">{col.name}</span>
                                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                        <div
                                                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-500 min-w-[3rem] text-right">{Math.round(percentage)}%</span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={col.id} className="flex items-center gap-2 text-sm">
                                                <span className="text-gray-500 text-xs">{col.name}:</span>
                                                <PropertyRenderer
                                                    property={col}
                                                    value={value}
                                                    onChange={() => { }}
                                                    readOnly
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Open Button (on hover) */}
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                                        <ExternalLink size={12} />
                                        Open
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {childPages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                    <FileText size={48} className="mb-4 opacity-50" />
                    <p>No items to display</p>
                </div>
            )}
        </div>
    );
}
