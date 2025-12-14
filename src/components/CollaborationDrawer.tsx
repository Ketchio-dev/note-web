"use client";

import { useState, useEffect } from 'react';
import { X, Clock, BarChart2, User, Activity } from 'lucide-react';
import { subscribeToPageUpdates, getPageAnalytics, Page } from '@/lib/workspace';
import { formatDistanceToNow } from 'date-fns';

interface CollaborationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    pageId: string;
    pageTitle: string;
}

export default function CollaborationDrawer({ isOpen, onClose, pageId, pageTitle }: CollaborationDrawerProps) {
    const [activeTab, setActiveTab] = useState<'updates' | 'analytics'>('updates');
    const [updates, setUpdates] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<{ totalViews: number; uniqueViewers: number; views: any[] } | null>(null);
    const [chartData, setChartData] = useState<{ date: string; views: number }[]>([]);

    useEffect(() => {
        if (isOpen && pageId) {
            // Subscribe to Updates
            const unsubscribe = subscribeToPageUpdates(pageId, (newUpdates) => {
                setUpdates(newUpdates);
            });

            // Fetch Analytics
            getPageAnalytics(pageId).then(data => {
                setAnalytics(data);

                // Process views into chart data (views per day, last 28 days)
                const daysMap = new Map<string, number>();
                const now = new Date();
                // Initialize last 14 days with 0
                for (let i = 13; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - i);
                    daysMap.set(d.toDateString(), 0);
                }

                data.views.forEach((v: any) => {
                    const d = v.timestamp?.toDate ? v.timestamp.toDate() : new Date(); // Handle client-side timestamp latency
                    const key = d.toDateString();
                    if (daysMap.has(key)) {
                        daysMap.set(key, (daysMap.get(key) || 0) + 1);
                    }
                });

                const chart = Array.from(daysMap.entries()).map(([date, count]) => ({
                    date: date.split(' ').slice(1, 3).join(' '), // "Oct 24"
                    views: count
                }));
                setChartData(chart);
            });

            return () => unsubscribe();
        }
    }, [isOpen, pageId]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/5 z-40 backdrop-blur-[1px]" onClick={onClose} />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-white dark:bg-[#191919] shadow-2xl z-50 animate-in slide-in-from-right duration-200 border-l border-gray-200 dark:border-[#333] flex flex-col">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-[#333] flex items-center justify-between">
                    <div className="flex gap-6 text-sm font-medium">
                        <button
                            onClick={() => setActiveTab('updates')}
                            className={`pb-4 -mb-4 border-b-2 transition-colors ${activeTab === 'updates' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            Updates
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`pb-4 -mb-4 border-b-2 transition-colors ${activeTab === 'analytics' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            Analytics
                        </button>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-0">

                    {/* UPDATES TAB */}
                    {activeTab === 'updates' && (
                        <div className="flex flex-col">
                            {updates.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">No updates yet</div>
                            ) : (
                                updates.map((update, i) => (
                                    <div key={i} className="px-5 py-4 border-b border-gray-50 dark:border-[#252525] flex gap-3 hover:bg-gray-50 dark:hover:bg-[#202020] transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            U
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-900 dark:text-gray-200">
                                                <span className="font-semibold">User</span> {update.action}
                                            </div>
                                            {update.details && (
                                                <div className="text-xs text-gray-500 mt-0.5">{update.details}</div>
                                            )}
                                            <div className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                                                <Clock size={10} />
                                                {update.timestamp?.toDate ? formatDistanceToNow(update.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ANALYTICS TAB */}
                    {activeTab === 'analytics' && analytics && (
                        <div className="p-6">

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-4 bg-gray-50 dark:bg-[#252525] rounded-xl border border-gray-100 dark:border-[#333]">
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                                        <Activity size={12} /> Total Views
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalViews}</div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-[#252525] rounded-xl border border-gray-100 dark:border-[#333]">
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                                        <User size={12} /> Unique Viewers
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.uniqueViewers}</div>
                                </div>
                            </div>

                            {/* Chart Title */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Views (Last 14 Days)</h3>
                            </div>

                            {/* Custom SVG Chart */}
                            <div className="h-48 w-full mb-8 relative">
                                <SimpleLineChart data={chartData} />
                            </div>

                            {/* Viewer List (Mock for now as we only store ID) */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Viewers</h3>
                                <div className="space-y-3">
                                    {/* In a real app, join with Users collection */}
                                    {analytics.views.slice(0, 5).map((v, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-[#333] flex items-center justify-center text-[10px]">
                                                    {v.userId ? v.userId.slice(0, 2).toUpperCase() : '?'}
                                                </div>
                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                    {v.userId === 'anonymous' ? 'Anonymous' : `User (${v.userId.slice(0, 4)})`}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {v.timestamp?.toDate ? formatDistanceToNow(v.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// Simple SVG Line Chart Component
function SimpleLineChart({ data }: { data: { views: number }[] }) {
    if (!data || data.length === 0) return null;

    // Normalize logic
    const height = 100;
    const width = 300;
    const max = Math.max(...data.map(d => d.views), 5); // Minimum scale of 5

    const points = data.map((d, i) => {
        // Distribute X evenly
        const x = (i / (data.length - 1)) * width;
        // Scale Y (invert because SVG 0 is top)
        const y = height - (d.views / max) * height;
        return `${x},${y}`;
    }).join(" ");

    // For Area fill: start at bottom left, go to points, end at bottom right
    const areaPath = `M0,${height} L${points} L${width},${height} Z`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            {/* Grid lines (optional) */}
            <line x1="0" y1={height} x2={width} y2={height} stroke="#e5e7eb" strokeWidth="1" />
            <line x1="0" y1="0" x2={width} y2="0" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

            {/* Area */}
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
            <path d={areaPath} fill="url(#chartGradient)" />

            {/* Line */}
            <polyline
                points={points}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Dots */}
            {data.map((d, i) => {
                const x = (i / (data.length - 1)) * width;
                const y = height - (d.views / max) * height;
                return (
                    <circle key={i} cx={x} cy={y} r="3" fill="white" stroke="#3B82F6" strokeWidth="2" className="opacity-0 hover:opacity-100 transition-opacity" />
                );
            })}
        </svg>
    );
}
