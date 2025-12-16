"use client";

import { useMemo, useState } from 'react';
import { Page } from '@/lib/workspace';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Activity, TrendingUp } from 'lucide-react';

interface ChartViewProps {
    parentPage: Page;
    childPages: Page[];
}

type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ChartView({ parentPage, childPages }: ChartViewProps) {
    const columns = parentPage.properties || [];
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [xAxis, setXAxis] = useState<string | null>(null);
    const [yAxis, setYAxis] = useState<string | null>(null);
    const [groupBy, setGroupBy] = useState<string | null>(null);

    // Prepare data for charting
    const chartData = useMemo(() => {
        if (!xAxis || !yAxis) return [];

        return childPages.map(page => {
            const xProp = columns.find(c => c.id === xAxis);
            const yProp = columns.find(c => c.id === yAxis);
            const groupProp = groupBy ? columns.find(c => c.id === groupBy) : null;

            return {
                name: page.propertyValues?.[xAxis] || page.title || 'Untitled',
                value: Number(page.propertyValues?.[yAxis]) || 0,
                group: groupProp && groupBy ? page.propertyValues?.[groupBy] : null,
            };
        });
    }, [childPages, xAxis, yAxis, groupBy, columns]);

    const numberColumns = columns.filter(c => c.type === 'number' || c.type === 'formula');
    const textColumns = columns.filter(c => c.type === 'text' || c.type === 'select');

    return (
        <div className="w-full p-4 md:p-6">
            {/* Controls */}
            <div className="mb-6 space-y-4 bg-white dark:bg-[#1C1C1C] p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex flex-wrap gap-3">
                    {/* Chart Type */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                            Chart Type
                        </label>
                        <select
                            value={chartType}
                            onChange={(e) => setChartType(e.target.value as ChartType)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#252525] border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                        >
                            <option value="bar">📊 Bar Chart</option>
                            <option value="line">📈 Line Chart</option>
                            <option value="pie">🥧 Pie Chart</option>
                            <option value="area">📉 Area Chart</option>
                            <option value="scatter">⚡ Scatter Plot</option>
                        </select>
                    </div>

                    {/* X Axis */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                            X-Axis (Labels)
                        </label>
                        <select
                            value={xAxis || ''}
                            onChange={(e) => setXAxis(e.target.value || null)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#252525] border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                        >
                            <option value="">Select property...</option>
                            {textColumns.map(col => (
                                <option key={col.id} value={col.id}>{col.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Y Axis */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                            Y-Axis (Values)
                        </label>
                        <select
                            value={yAxis || ''}
                            onChange={(e) => setYAxis(e.target.value || null)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#252525] border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                        >
                            <option value="">Select property...</option>
                            {numberColumns.map(col => (
                                <option key={col.id} value={col.id}>{col.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Chart */}
            {!xAxis || !yAxis ? (
                <div className="flex flex-col items-center justify-center h-96 bg-gray-50 dark:bg-[#1C1C1C] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                    <BarChart3 size={48} className="text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                        Select X and Y axes to visualize data
                    </p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                        Choose properties from the dropdowns above
                    </p>
                </div>
            ) : chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 bg-gray-50 dark:bg-[#1C1C1C] rounded-lg border border-gray-300 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400">No data available</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#1C1C1C] p-6 rounded-lg border border-gray-200 dark:border-gray-800">
                    <ResponsiveContainer width="100%" height={400}>
                        {chartType === 'bar' && (
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                                <XAxis dataKey="name" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        )}

                        {chartType === 'line' && (
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                                <XAxis dataKey="name" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                            </LineChart>
                        )}

                        {chartType === 'pie' && (
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        )}

                        {chartType === 'area' && (
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                                <XAxis dataKey="name" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                            </AreaChart>
                        )}

                        {chartType === 'scatter' && (
                            <ScatterChart>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                                <XAxis dataKey="name" stroke="#9ca3af" />
                                <YAxis dataKey="value" stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px'
                                    }}
                                    cursor={{ strokeDasharray: '3 3' }}
                                />
                                <Scatter name="Data" data={chartData} fill="#3b82f6" />
                            </ScatterChart>
                        )}
                    </ResponsiveContainer>
                </div>
            )}

            {/* Stats */}
            {chartData.length > 0 && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#1C1C1C] p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Items</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{chartData.length}</p>
                    </div>
                    <div className="bg-white dark:bg-[#1C1C1C] p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sum</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {chartData.reduce((sum, d) => sum + d.value, 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-[#1C1C1C] p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Average</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length).toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-[#1C1C1C] p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Max</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {Math.max(...chartData.map(d => d.value)).toFixed(2)}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
