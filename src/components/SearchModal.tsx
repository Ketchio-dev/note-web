"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, FileText, Database, ArrowRight } from "lucide-react";
import { Page } from "@/lib/workspace";
import { useRouter } from "next/navigation";

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    pages: Page[];
    workspaceId: string;
}

export default function SearchModal({ isOpen, onClose, pages, workspaceId }: SearchModalProps) {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery("");
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Filter pages
    const filteredPages = pages.filter(p =>
        !p.inTrash &&
        p.title.toLowerCase().includes(query.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="search-modal-title"
                className="w-full max-w-2xl bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl overflow-hidden border border-transparent dark:border-gray-800 flex flex-col max-h-[60vh] animate-in zoom-in-95 slide-in-from-top-2 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header / Input */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
                    <Search className="text-gray-400" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for a page..."
                        className="flex-1 bg-transparent text-lg placeholder:text-gray-400 focus:outline-none dark:text-gray-100"
                        id="search-modal-title"
                    />
                    <button
                        onClick={onClose}
                        aria-label="Close search"
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-2">
                    {filteredPages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm">
                            <p>No results found</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {/* Optional: Group suggestions? For now, flat list. */}
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Pages
                            </div>
                            {filteredPages.map(page => (
                                <button
                                    key={page.id}
                                    onClick={() => {
                                        router.push(`/workspace/${workspaceId}/${page.id}`);
                                        onClose();
                                    }}
                                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-lg transition group text-left"
                                >
                                    <div className="text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                                        {page.icon ? (
                                            <span className="text-lg">{page.icon}</span>
                                        ) : (
                                            page.type === 'database' ? <Database size={18} /> : <FileText size={18} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {page.title || "Untitled"}
                                        </div>
                                        {/* Breadcrumbs or parent showing could go here */}
                                    </div>
                                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all text-gray-400" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-[#252525] px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex justify-between">
                    <span>{filteredPages.length} pages found</span>
                    <div className="flex gap-2">
                        <span>↑↓ to navigate</span>
                        <span>↵ to open</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
