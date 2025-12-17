/**
 * Universal Search System
 * Cmd+K command palette with fuzzy search
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query as firestoreQuery, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { Search, FileText, Database, Calendar, User, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SearchResult {
    id: string;
    title: string;
    type: 'page' | 'database' | 'user' | 'recent';
    icon?: string;
    path: string;
    workspaceId: string;
    lastModified?: Date;
    preview?: string;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
}

export default function CommandPalette({ isOpen, onClose, workspaceId }: CommandPaletteProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);

    // Load recent searches from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const recent = localStorage.getItem('recent-searches');
            if (recent) {
                setRecentSearches(JSON.parse(recent));
            }
        }
    }, []);

    // Search function
    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults(recentSearches);
            return;
        }

        setLoading(true);
        try {
            const searchResults: SearchResult[] = [];

            // Search pages
            const pagesRef = collection(db, 'pages');
            const pagesQ = firestoreQuery(
                pagesRef,
                where('workspaceId', '==', workspaceId),
                orderBy('title'),
                limit(20)
            );
            const pagesSnapshot = await getDocs(pagesQ);

            pagesSnapshot.forEach(doc => {
                const data = doc.data();
                const title = data.title || 'Untitled';

                // Fuzzy search
                if (fuzzyMatch(searchQuery, title)) {
                    searchResults.push({
                        id: doc.id,
                        title,
                        type: data.type === 'database' ? 'database' : 'page',
                        icon: data.icon,
                        path: `/workspace/${workspaceId}/${doc.id}`,
                        workspaceId,
                        lastModified: data.updatedAt?.toDate(),
                        preview: data.content?.substring(0, 100),
                    });
                }
            });

            // Sort by relevance
            searchResults.sort((a, b) => {
                const scoreA = calculateRelevance(searchQuery, a.title);
                const scoreB = calculateRelevance(searchQuery, b.title);
                return scoreB - scoreA;
            });

            setResults(searchResults.slice(0, 10));
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    }, [workspaceId, recentSearches]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query);
        }, 200);

        return () => clearTimeout(timer);
    }, [query, performSearch]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (results[selectedIndex]) {
                        handleSelectResult(results[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    const handleSelectResult = (result: SearchResult) => {
        // Save to recent searches
        const recent = [result, ...recentSearches.filter(r => r.id !== result.id)].slice(0, 5);
        setRecentSearches(recent);
        localStorage.setItem('recent-searches', JSON.stringify(recent));

        // Navigate
        router.push(result.path);
        onClose();
        setQuery('');
    };

    const handleClearRecent = () => {
        setRecentSearches([]);
        localStorage.removeItem('recent-searches');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[15vh]">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
                    <Search size={20} className="text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search pages, databases, or type a command..."
                        className="flex-1 bg-transparent outline-none text-lg"
                        autoFocus
                    />
                    {loading && <Loader2 size={18} className="text-gray-400 animate-spin" />}
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                    {results.length === 0 && !query ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Search size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-sm">Start typing to search...</p>
                            {recentSearches.length > 0 && (
                                <div className="mt-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-semibold uppercase tracking-wider">Recent</span>
                                        <button
                                            onClick={handleClearRecent}
                                            className="text-xs text-blue-600 hover:text-blue-700"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        {recentSearches.map((result, index) => (
                                            <ResultItem
                                                key={result.id}
                                                result={result}
                                                isSelected={false}
                                                onClick={() => handleSelectResult(result)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : results.length === 0 && query ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <p>No results found for "{query}"</p>
                        </div>
                    ) : (
                        <div className="py-2">
                            {results.map((result, index) => (
                                <ResultItem
                                    key={result.id}
                                    result={result}
                                    isSelected={index === selectedIndex}
                                    onClick={() => handleSelectResult(result)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded">↑</kbd>
                                <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded">↓</kbd>
                                to navigate
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded">Enter</kbd>
                                to select
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded">Esc</kbd>
                                to close
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Result Item Component
 */
interface ResultItemProps {
    result: SearchResult;
    isSelected: boolean;
    onClick: () => void;
}

function ResultItem({ result, isSelected, onClick }: ResultItemProps) {
    const Icon = result.type === 'database' ? Database : result.type === 'recent' ? Clock : FileText;

    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
        >
            {result.icon ? (
                <span className="text-2xl">{result.icon}</span>
            ) : (
                <Icon size={20} className="text-gray-400" />
            )}

            <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{result.title}</div>
                {result.preview && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {result.preview}
                    </div>
                )}
            </div>

            {isSelected && <ArrowRight size={16} className="text-blue-600" />}
        </div>
    );
}

/**
 * Fuzzy match algorithm
 */
function fuzzyMatch(query: string, text: string): boolean {
    const q = query.toLowerCase();
    const t = text.toLowerCase();

    let qIndex = 0;
    for (let i = 0; i < t.length && qIndex < q.length; i++) {
        if (t[i] === q[qIndex]) {
            qIndex++;
        }
    }

    return qIndex === q.length;
}

/**
 * Calculate relevance score
 */
function calculateRelevance(query: string, text: string): number {
    const q = query.toLowerCase();
    const t = text.toLowerCase();

    // Exact match
    if (t === q) return 100;

    // Starts with
    if (t.startsWith(q)) return 90;

    // Contains
    if (t.includes(q)) return 80;

    // Fuzzy match score
    let score = 0;
    let lastIndex = -1;
    for (const char of q) {
        const index = t.indexOf(char, lastIndex + 1);
        if (index > lastIndex) {
            score += 10;
            lastIndex = index;
        }
    }

    return score;
}
