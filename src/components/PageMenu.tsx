"use client";

import { useState, useRef } from 'react';
import {
    MoreHorizontal,
    Type,
    Trash,
    Copy,
    ArrowUpRight,
    Download,
    Upload,
    Lock,
    Unlock,
    LayoutTemplate,
    Search,
    Undo,
    History,
    FileText,
    Check,
    Clock
} from 'lucide-react';
import { Page } from '@/lib/workspace';
import ExportImportModal from '@/components/ExportImportModal';

interface PageMenuProps {
    page: Page;
    onUpdate: (data: Partial<Page>) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onOpenUpdates: () => void;
}

export default function PageMenu({ page, onUpdate, onDelete, onDuplicate, onOpenUpdates }: PageMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExportImportOpen, setIsExportImportOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Close menu when clicking outside (simple implementation using backdrop)
    const toggleMenu = () => setIsOpen(!isOpen);

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (text) {
                onUpdate({ content: text });
                setIsOpen(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="relative z-50">
            <button
                onClick={toggleMenu}
                className="text-gray-400 hover:text-black dark:hover:text-white transition p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#2C2C2C]"
            >
                <MoreHorizontal size={20} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Menu Content */}
                    <div className="absolute right-0 top-10 w-[260px] bg-white rounded-xl shadow-2xl border border-gray-200/50 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150 dark:bg-[#1E1E1E] dark:border-[#333] tracking-normal overflow-hidden">

                        {/* Style Section */}
                        <div className="px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2 pl-1">Style</div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onUpdate({ font: 'default' })}
                                    className={`flex-1 h-16 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all relative ${page.font === 'default' ? 'border-[#2383E2] bg-blue-50/10 dark:bg-blue-900/10' : 'border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#2C2C2C]'}`}
                                >
                                    <span className="text-2xl font-sans text-gray-800 dark:text-gray-100">Ag</span>
                                    <span className="text-[10px] text-gray-500 font-medium">Default</span>
                                    {page.font === 'default' && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#2383E2] rounded-full" />}
                                </button>
                                <button
                                    onClick={() => onUpdate({ font: 'serif' })}
                                    className={`flex-1 h-16 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all relative ${page.font === 'serif' ? 'border-[#2383E2] bg-blue-50/10 dark:bg-blue-900/10' : 'border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#2C2C2C]'}`}
                                >
                                    <span className="text-2xl font-serif text-gray-800 dark:text-gray-100">Ag</span>
                                    <span className="text-[10px] text-gray-500 font-medium">Serif</span>
                                    {page.font === 'serif' && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#2383E2] rounded-full" />}
                                </button>
                                <button
                                    onClick={() => onUpdate({ font: 'mono' })}
                                    className={`flex-1 h-16 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all relative ${page.font === 'mono' ? 'border-[#2383E2] bg-blue-50/10 dark:bg-blue-900/10' : 'border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#2C2C2C]'}`}
                                >
                                    <span className="text-2xl font-mono text-gray-800 dark:text-gray-100">Ag</span>
                                    <span className="text-[10px] text-gray-500 font-medium">Mono</span>
                                    {page.font === 'mono' && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#2383E2] rounded-full" />}
                                </button>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100 my-1 mx-2 dark:bg-[#2C2C2C]" />

                        {/* Toggles */}
                        <div className="py-1 px-1">
                            <button
                                onClick={() => onUpdate({ smallText: !page.smallText })}
                                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <Type size={15} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Small text</span>
                                </div>
                                <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${page.smallText ? 'bg-[#2383E2]' : 'bg-gray-200 dark:bg-[#404040]'}`}>
                                    <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${page.smallText ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                </div>
                            </button>

                            <button
                                onClick={() => onUpdate({ fullWidth: !page.fullWidth })}
                                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <LayoutTemplate size={15} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Full width</span>
                                </div>
                                <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${page.fullWidth ? 'bg-[#2383E2]' : 'bg-gray-200 dark:bg-[#404040]'}`}>
                                    <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${page.fullWidth ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                </div>
                            </button>
                        </div>

                        <div className="h-px bg-gray-100 my-1 mx-2 dark:bg-[#2C2C2C]" />

                        {/* Actions Group 1 */}
                        <div className="py-1 px-1">
                            <button className="w-full flex items-center px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors text-sm text-gray-700 dark:text-gray-300 group">
                                <ArrowUpRight size={15} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mr-3" />
                                <span>Copy link</span>
                                <span className="ml-auto text-[10px] text-gray-400 font-medium">⌘L</span>
                            </button>
                            <button
                                onClick={onDuplicate}
                                className="w-full flex items-center px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors text-sm text-gray-700 dark:text-gray-300 group"
                            >
                                <Copy size={15} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mr-3" />
                                <span>Duplicate</span>
                                <span className="ml-auto text-[10px] text-gray-400 font-medium">⌘D</span>
                            </button>
                        </div>

                        <div className="h-px bg-gray-100 my-1 mx-2 dark:bg-[#2C2C2C]" />

                        {/* Lock */}
                        <div className="py-1 px-1">
                            <button
                                onClick={() => onUpdate({ locked: !page.locked })}
                                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    {page.locked ? <Lock size={15} className="text-[#2383E2]" /> : <Unlock size={15} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />}
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Lock page</span>
                                </div>
                                <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out ${page.locked ? 'bg-[#2383E2]' : 'bg-gray-200 dark:bg-[#404040]'}`}>
                                    <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${page.locked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                </div>
                            </button>
                        </div>

                        <div className="h-px bg-gray-100 my-1 mx-2 dark:bg-[#2C2C2C]" />

                        {/* Updates & Analytics */}
                        <div className="py-1 px-1">
                            <button
                                onClick={() => { setIsOpen(false); onOpenUpdates(); }}
                                className="w-full flex items-center px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors text-sm text-gray-700 dark:text-gray-300 group"
                            >
                                <Clock size={15} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mr-3" />
                                <span>Updates & analytics</span>
                            </button>
                        </div>

                        <div className="h-px bg-gray-100 my-1 mx-2 dark:bg-[#2C2C2C]" />

                        {/* Export / Delete */}
                        <div className="py-1 px-1">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex items-center px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors text-sm text-gray-700 dark:text-gray-300 group"
                            >
                                <Upload size={15} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mr-3" />
                                <span>Import</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImport}
                                className="hidden"
                                accept=".md,.txt,.json,.html"
                            />
                            <button
                                onClick={() => { setIsOpen(false); setIsExportImportOpen(true); }}
                                className="w-full flex items-center px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors text-sm text-gray-700 dark:text-gray-300 group"
                            >
                                <Download size={15} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mr-3" />
                                <span>Export</span>
                            </button>
                            <button onClick={onDelete} className="w-full flex items-center px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm text-red-600 group">
                                <Trash size={15} className="mr-3 opacity-70 group-hover:opacity-100" />
                                <span>Delete Page</span>
                            </button>
                        </div>

                        {/* Footer Info */}
                        <div className="px-3 py-2 border-t border-gray-100 dark:border-[#2C2C2C] bg-gray-50/50 dark:bg-[#252525]">
                            <div className="text-[10px] text-gray-400 text-center">
                                Last edited today at 3:45 PM
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Export/Import Modal */}
            <ExportImportModal
                isOpen={isExportImportOpen}
                onClose={() => setIsExportImportOpen(false)}
                pageId={page.id}
                pageTitle={page.title}
            />
        </div>
    );
}
