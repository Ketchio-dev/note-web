"use client";

import { useState, useRef } from 'react';
import { X, Plus, Sparkles, FileUp, Link as LinkIcon, ArrowRight } from 'lucide-react';
import { DATABASE_TEMPLATES, DatabaseTemplate } from '@/lib/database-templates';
import TemplateCard from '@/components/database/TemplateCard';
import { fetchWithAuth } from '@/lib/client-api';

interface DatabaseCreationMenuProps {
    isOpen: boolean;
    onCreateEmpty: () => void;
    onSelectTemplate: (template: DatabaseTemplate) => void;
    onShowAllTemplates: () => void;
    onClose: () => void;
}

export default function DatabaseCreationMenu({
    isOpen,
    onCreateEmpty,
    onSelectTemplate,
    onShowAllTemplates,
    onClose
}: DatabaseCreationMenuProps) {
    const [pasteInput, setPasteInput] = useState('');
    const [showAIBuilder, setShowAIBuilder] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    // Show top 3 suggested templates (excluding empty)
    const suggestedTemplates = DATABASE_TEMPLATES.filter(t => t.id !== 'empty').slice(0, 3);

    /**
     * Handle AI Database Builder
     */
    const handleAIBuild = async () => {
        if (!aiPrompt.trim()) return;

        setIsGenerating(true);
        try {
            // Call AI API to generate database structure
            const response = await fetchWithAuth('/api/ai', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: `Create a database structure for: ${aiPrompt}. Return JSON with columns array, each having: name, type (text/number/select/date/checkbox), and optional default values.`,
                }),
            });

            const data = await response.json();

            // Parse AI response and create database
            const aiTemplate: DatabaseTemplate = {
                id: 'ai-generated',
                name: aiPrompt,
                description: 'AI-generated database',
                icon: '🤖',
                color: 'purple',
                properties: parseAIColumns(data.content || data.response),
            };

            onSelectTemplate(aiTemplate);
            onClose();
        } catch (error) {
            console.error('AI generation failed:', error);
            alert('Failed to generate database. Creating empty database instead.');
            onCreateEmpty();
        } finally {
            setIsGenerating(false);
        }
    };

    /**
     * Handle CSV Import
     */
    const handleCSVImport = async (file: File) => {
        try {
            const text = await file.text();
            await importCSVFromText(file.name, text);
        } catch (error) {
            console.error('CSV import failed:', error);
            alert('Failed to import CSV file');
        }
    };

    /**
     * Handle ZIP Import
     */
    const handleZIPImport = async (file: File) => {
        try {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            const contents = await zip.loadAsync(file);

            // Find all CSV files (case insensitive)
            const csvFiles: { name: string; content: string }[] = [];

            console.log('ZIP contents:', Object.keys(contents.files));

            for (const [filename, zipEntry] of Object.entries(contents.files)) {
                console.log('Checking file:', filename, 'isDir:', zipEntry.dir);

                // Check if file ends with .csv (case insensitive) and is not a directory
                if (filename.toLowerCase().endsWith('.csv') && !zipEntry.dir) {
                    try {
                        const content = await zipEntry.async('text');
                        csvFiles.push({ name: filename, content });
                        console.log('Added CSV:', filename);
                    } catch (err) {
                        console.error('Failed to read file:', filename, err);
                    }
                }
            }

            console.log('Found CSV files:', csvFiles.length);

            if (csvFiles.length === 0) {
                alert(`No CSV files found in ZIP.\n\nFiles in ZIP:\n${Object.keys(contents.files).join('\n')}`);
                return;
            }

            // If only one CSV, import it directly
            if (csvFiles.length === 1) {
                await importCSVFromText(csvFiles[0].name, csvFiles[0].content);
                return;
            }

            // Multiple CSVs - let user choose
            const choice = prompt(
                `Found ${csvFiles.length} CSV files:\n${csvFiles.map((f, i) => `${i + 1}. ${f.name}`).join('\n')}\n\nEnter number to import (or 0 to import all):`
            );

            if (!choice) return;

            const choiceNum = parseInt(choice);
            if (choiceNum === 0) {
                // Import all (create multiple databases)
                for (const csvFile of csvFiles) {
                    await importCSVFromText(csvFile.name, csvFile.content);
                }
                alert(`Imported ${csvFiles.length} databases`);
            } else if (choiceNum > 0 && choiceNum <= csvFiles.length) {
                await importCSVFromText(csvFiles[choiceNum - 1].name, csvFiles[choiceNum - 1].content);
            }
        } catch (error) {
            console.error('ZIP import failed:', error);
            alert(`Failed to import ZIP file: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    /**
     * Import CSV from text content
     */
    const importCSVFromText = async (filename: string, text: string) => {
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            alert(`${filename} is empty`);
            return;
        }

        // Parse CSV header
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        // Infer column types
        const properties = headers.map((header, index) => {
            const sampleValue = lines[1]?.split(',')[index]?.trim().replace(/"/g, '');
            let type: 'text' | 'number' | 'select' | 'date' | 'checkbox' = 'text';

            // Check for empty strings to avoid false positives
            if (sampleValue && !isNaN(Number(sampleValue))) {
                type = 'number';
            } else if (sampleValue?.toLowerCase() === 'true' || sampleValue?.toLowerCase() === 'false') {
                type = 'checkbox';
            } else if (sampleValue && /^\d{4}-\d{2}-\d{2}/.test(sampleValue)) {
                type = 'date';
            }

            return {
                id: `csv-col-${index}`,
                name: header,
                type,
            };
        });

        const csvTemplate: DatabaseTemplate = {
            id: 'csv-import',
            name: filename.replace('.csv', ''),
            description: `Imported from ${filename}`,
            icon: '📊',
            color: 'green',
            properties,
        };

        onSelectTemplate(csvTemplate);
        onClose();
    };

    /**
     * Handle file selection
     */
    const handleFileSelect = async (file: File) => {
        if (file.name.endsWith('.csv')) {
            await handleCSVImport(file);
        } else if (file.name.endsWith('.zip')) {
            await handleZIPImport(file);
        } else {
            alert('Please select a CSV or ZIP file');
        }
    };

    /**
     * Parse AI response to properties
     */
    const parseAIColumns = (aiResponse: string) => {
        interface AIColumn {
            id?: string;
            name: string;
            type: string;
            options?: Array<{ id: string; name: string; color: string }>;
        }

        interface AIParsedResponse {
            columns?: AIColumn[];
            properties?: AIColumn[];
        }

        type PropertyType = 'text' | 'number' | 'select' | 'multi-select' | 'date' | 'checkbox' | 'url' | 'email' | 'phone' | 'person' | 'files' | 'formula' | 'relation' | 'rollup' | 'created_time' | 'created_by' | 'last_edited_time' | 'last_edited_by' | 'progress';

        const validPropertyTypes: PropertyType[] = ['text', 'number', 'select', 'multi-select', 'date', 'checkbox', 'url', 'email', 'phone', 'person', 'files', 'formula', 'relation', 'rollup', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by', 'progress'];

        const isValidPropertyType = (type: string): type is PropertyType => {
            return validPropertyTypes.includes(type as PropertyType);
        };

        try {
            const parsed: AIParsedResponse = JSON.parse(aiResponse);
            const columns = parsed.columns || parsed.properties || [];

            return columns.map((col, index) => ({
                id: col.id || `ai-prop-${index}`,
                name: col.name,
                type: isValidPropertyType(col.type) ? col.type : 'text',
                options: col.options,
            }));
        } catch {
            // Fallback: create basic properties
            return [
                { id: 'name', name: 'Name', type: 'text' as PropertyType },
                {
                    id: 'status', name: 'Status', type: 'select' as PropertyType, options: [
                        { id: 'todo', name: 'To Do', color: 'gray' },
                        { id: 'done', name: 'Done', color: 'green' },
                    ]
                },
                { id: 'date', name: 'Date', type: 'date' as PropertyType },
            ];
        }
    };

    /**
     * AI Builder Modal
     */
    if (showAIBuilder) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAIBuilder(false)}>
                <div
                    className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl w-full max-w-md p-6"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Sparkles className="text-purple-500" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Build with AI</h2>
                            <p className="text-sm text-gray-500">Describe your database and AI will create it</p>
                        </div>
                    </div>

                    <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Example: Create a task tracker with name, priority, status, due date, and assignee"
                        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg mb-4 min-h-[120px] resize-none"
                        autoFocus
                    />

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowAIBuilder(false)}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAIBuild}
                            disabled={!aiPrompt.trim() || isGenerating}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    Generate
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        New database
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* Paste or Link Input */}
                    <div className="relative">
                        <input
                            type="text"
                            value={pasteInput}
                            onChange={(e) => setPasteInput(e.target.value)}
                            placeholder="Paste or link data source..."
                            className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                        />
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-200 dark:bg-gray-800" />

                    {/* Quick Actions */}
                    <div className="space-y-1">
                        <button
                            onClick={() => {
                                onCreateEmpty();
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-lg transition group"
                        >
                            <div className="w-5 h-5 flex items-center justify-center">
                                <Plus size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                            </div>
                            <span className="flex-1 text-left">New empty data source</span>
                        </button>

                        <button
                            onClick={() => setShowAIBuilder(true)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-lg transition group"
                        >
                            <div className="w-5 h-5 flex items-center justify-center">
                                <Sparkles size={16} className="text-purple-500" />
                            </div>
                            <span className="flex-1 text-left">Build with AI</span>
                            <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">New</span>
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-lg transition group"
                        >
                            <div className="w-5 h-5 flex items-center justify-center">
                                <FileUp size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                            </div>
                            <span className="flex-1 text-left">Import CSV / ZIP</span>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.zip"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file);
                            }}
                        />
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-200 dark:bg-gray-800" />

                    {/* Suggested Templates */}
                    <div>
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">
                            Suggested
                        </div>
                        <div className="space-y-1.5">
                            {suggestedTemplates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => {
                                        onSelectTemplate(template);
                                        onClose();
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-lg transition group"
                                >
                                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-xl">
                                        {template.icon}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            {template.name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {template.description}
                                        </div>
                                    </div>
                                    <ArrowRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                                </button>
                            ))}
                        </div>

                        {/* More Templates Button */}
                        <button
                            onClick={() => {
                                onShowAllTemplates();
                                onClose();
                            }}
                            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-lg transition"
                        >
                            <span>More templates</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
