"use client";

import { useState, useEffect } from 'react';
import { Page } from '@/lib/workspace';
import { evaluateFormula, formatFormulaResult } from '@/lib/formula-engine';
import { format, parseISO } from 'date-fns';
import { FileText, Link as LinkIcon, Mail, Phone, User, File, Calculator, Check, X, ExternalLink, Calendar as CalendarIcon } from 'lucide-react';
import { RelationRenderer } from './RelationRenderer';
import { calculateRollup, formatRollupResult } from '@/lib/rollup-calculator';

type PropertyType = NonNullable<Page['properties']>[number];

interface PropertyRendererProps {
    property: PropertyType;
    value: any;
    onChange: (value: any) => void;
    allProperties?: PropertyType[];
    propertyValues?: Record<string, any>;
    readOnly?: boolean;
}

const COLORS = [
    { id: 'gray', name: 'Gray', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-200' },
    { id: 'brown', name: 'Brown', bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-800 dark:text-amber-200' },
    { id: 'orange', name: 'Orange', bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-200' },
    { id: 'yellow', name: 'Yellow', bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200' },
    { id: 'green', name: 'Green', bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200' },
    { id: 'blue', name: 'Blue', bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200' },
    { id: 'purple', name: 'Purple', bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200' },
    { id: 'pink', name: 'Pink', bg: 'bg-pink-100 dark:bg-pink-900', text: 'text-pink-800 dark:text-pink-200' },
    { id: 'red', name: 'Red', bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200' },
];

export default function PropertyRenderer({
    property,
    value,
    onChange,
    allProperties = [],
    propertyValues = {},
    readOnly = false
}: PropertyRendererProps) {
    const [isEditing, setIsEditing] = useState(false);

    // Text
    if (property.type === 'text') {
        return (
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-full px-3 bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
                placeholder="Empty"
                readOnly={readOnly}
            />
        );
    }

    // Number
    if (property.type === 'number') {
        return (
            <input
                type="number"
                value={value || ''}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-full px-3 bg-transparent outline-none text-gray-700 dark:text-gray-300"
                placeholder="Empty"
                readOnly={readOnly}
            />
        );
    }

    // Select
    if (property.type === 'select') {
        const options = property.options || [];
        const selectedOption = options.find(opt => opt.id === value);
        const colorObj = COLORS.find(c => c.id === selectedOption?.color) || COLORS[0];

        return (
            <div className="relative w-full h-full">
                {!readOnly ? (
                    <select
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value || null)}
                        className="w-full h-full px-3 bg-transparent outline-none text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                        <option value="">Empty</option>
                        {options.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                    </select>
                ) : selectedOption ? (
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colorObj.bg} ${colorObj.text}`}>
                        {selectedOption.name}
                    </span>
                ) : (
                    <span className="text-gray-400 text-sm">Empty</span>
                )}
            </div>
        );
    }

    // Multi-select
    if (property.type === 'multi-select') {
        const options = property.options || [];
        const selectedIds = Array.isArray(value) ? value : [];

        return (
            <div className="flex flex-wrap gap-1 px-3 py-1">
                {selectedIds.map((id: string) => {
                    const opt = options.find(o => o.id === id);
                    if (!opt) return null;
                    const colorObj = COLORS.find(c => c.id === opt.color) || COLORS[0];
                    return (
                        <span key={id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colorObj.bg} ${colorObj.text}`}>
                            {opt.name}
                            {!readOnly && (
                                <X
                                    size={12}
                                    className="cursor-pointer hover:opacity-70"
                                    onClick={() => onChange(selectedIds.filter((x: string) => x !== id))}
                                />
                            )}
                        </span>
                    );
                })}
                {!readOnly && (
                    <select
                        value=""
                        onChange={(e) => {
                            if (e.target.value) {
                                onChange([...selectedIds, e.target.value]);
                            }
                        }}
                        className="text-xs bg-transparent outline-none text-gray-500 cursor-pointer"
                    >
                        <option value="">+ Add</option>
                        {options.filter(opt => !selectedIds.includes(opt.id)).map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                    </select>
                )}
            </div>
        );
    }

    // Date
    if (property.type === 'date') {
        const dateValue = value ? (typeof value === 'string' ? value : value.toISOString().split('T')[0]) : '';

        return (
            <div className="flex items-center gap-2 px-3">
                <CalendarIcon size={14} className="text-gray-400" />
                <input
                    type="date"
                    value={dateValue}
                    onChange={(e) => onChange(e.target.value || null)}
                    className="bg-transparent outline-none text-gray-700 dark:text-gray-300 text-sm"
                    readOnly={readOnly}
                />
            </div>
        );
    }

    // Checkbox
    if (property.type === 'checkbox') {
        return (
            <div className="flex items-center justify-center h-full">
                <button
                    onClick={() => !readOnly && onChange(!value)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${value
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 dark:border-gray-600'
                        } ${!readOnly && 'cursor-pointer hover:border-blue-500'}`}
                    disabled={readOnly}
                >
                    {value && <Check size={14} className="text-white" />}
                </button>
            </div>
        );
    }

    // URL
    if (property.type === 'url') {
        return (
            <div className="flex items-center gap-2 px-3">
                <input
                    type="url"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value || null)}
                    className="flex-1 bg-transparent outline-none text-blue-600 dark:text-blue-400 underline text-sm"
                    placeholder="Enter URL"
                    readOnly={readOnly}
                />
                {value && (
                    <a href={value} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                        <ExternalLink size={14} />
                    </a>
                )}
            </div>
        );
    }

    // Email
    if (property.type === 'email') {
        return (
            <div className="flex items-center gap-2 px-3">
                <Mail size={14} className="text-gray-400" />
                <input
                    type="email"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value || null)}
                    className="flex-1 bg-transparent outline-none text-gray-700 dark:text-gray-300 text-sm"
                    placeholder="email@example.com"
                    readOnly={readOnly}
                />
            </div>
        );
    }

    // Phone
    if (property.type === 'phone') {
        return (
            <div className="flex items-center gap-2 px-3">
                <Phone size={14} className="text-gray-400" />
                <input
                    type="tel"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value || null)}
                    className="flex-1 bg-transparent outline-none text-gray-700 dark:text-gray-300 text-sm"
                    placeholder="+1 (555) 000-0000"
                    readOnly={readOnly}
                />
            </div>
        );
    }

    // Files
    if (property.type === 'files') {
        const files = Array.isArray(value) ? value : [];
        return (
            <div className="flex flex-wrap gap-1 px-3 py-1">
                {files.map((file: any, idx: number) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                        <FileText size={12} />
                        {file.name || 'File'}
                        {!readOnly && (
                            <X
                                size={12}
                                className="cursor-pointer hover:opacity-70"
                                onClick={() => onChange(files.filter((_: any, i: number) => i !== idx))}
                            />
                        )}
                    </span>
                ))}
                {!readOnly && (
                    <span className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">+ Add file</span>
                )}
            </div>
        );
    }

    // Formula (read-only, calculated)
    if (property.type === 'formula') {
        const formula = property.formula || '';
        // Build property map from propertyValues
        const propMap: Record<string, any> = {};
        allProperties.forEach(prop => {
            propMap[prop.name] = propertyValues[prop.id];
        });

        const result = evaluateFormula(formula, propMap);
        const displayValue = formatFormulaResult(result);

        return (
            <div className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 italic font-mono">
                {displayValue || 'N/A'}
            </div>
        );
    }

    // Person (simplified - just show user ID or name)
    if (property.type === 'person') {
        return (
            <div className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                {value || 'Unassigned'}
            </div>
        );
    }

    // Relation (show linked pages with real-time loading)
    if (property.type === 'relation') {
        if (readOnly) {
            // Read-only view: just show page IDs
            const linkedIds = Array.isArray(value) ? value : [];
            return (
                <div className="flex flex-wrap gap-1 px-3 py-1">
                    {linkedIds.map((id: string) => (
                        <span key={id} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs">
                            {id.slice(0, 8)}...
                        </span>
                    ))}
                    {linkedIds.length === 0 && (
                        <span className="text-gray-400 text-xs">No relations</span>
                    )}
                </div>
            );
        }

        // Editable view: use RelationRenderer
        return (
            <RelationRenderer
                property={property}
                value={Array.isArray(value) ? value : []}
                onChange={onChange}
            />
        );
    }

    // Progress Bar
    if (property.type === 'progress') {
        const numValue = Number(value) || 0;
        const max = property.max || 100;
        const percentage = Math.min(100, Math.max(0, (numValue / max) * 100));
        const color = property.progressColor || 'blue';

        const colorClasses = {
            blue: 'bg-blue-600',
            green: 'bg-green-600',
            yellow: 'bg-yellow-600',
            red: 'bg-red-600',
            purple: 'bg-purple-600',
            pink: 'bg-pink-600'
        };

        return (
            <div className="px-3 py-2">
                {!readOnly ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={numValue}
                            onChange={(e) => onChange(Number(e.target.value))}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-transparent"
                            min={0}
                            max={max}
                        />
                        <span className="text-xs text-gray-500">/ {max}</span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 min-w-[100px]">
                            <div
                                className={`${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} h-2 rounded-full transition-all duration-300`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
                            {Math.round(percentage)}%
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                                className={`${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} h-2 rounded-full transition-all`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <span className="text-xs text-gray-500">{Math.round(percentage)}%</span>
                    </div>
                )}
            </div>
        );
    }

    // Rollup (read-only, calculated from relations)
    if (property.type === 'rollup') {
        return (
            <div className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 italic">
                {value || '0'}
            </div>
        );
    }

    // Created time, Last edited time (read-only)
    if (property.type === 'created_time' || property.type === 'last_edited_time') {
        const formatted = value ? format(new Date(value), 'MMM d, yyyy h:mm a') : 'N/A';
        return (
            <div className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400">
                {formatted}
            </div>
        );
    }

    // Created by, Last edited by (read-only)
    if (property.type === 'created_by' || property.type === 'last_edited_by') {
        return (
            <div className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                {value || 'Unknown'}
            </div>
        );
    }

    // Default fallback
    return (
        <div className="px-3 py-1 text-sm text-gray-400">
            Unsupported type: {property.type}
        </div>
    );
}
