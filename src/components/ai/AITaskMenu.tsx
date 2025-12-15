"use client";

import { useState } from 'react';
import {
    Sparkles,
    Languages,
    FileText,
    Wand2,
    CheckCircle2,
    MessageCircle,
    List,
    ChevronRight
} from 'lucide-react';

export enum AITask {
    SUMMARIZE = 'summarize',
    TRANSLATE = 'translate',
    EXPAND = 'expand',
    SIMPLIFY = 'simplify',
    FIX_GRAMMAR = 'fix_grammar',
    CHANGE_TONE = 'change_tone',
    EXTRACT_ACTIONS = 'extract_actions',
    CONTINUE_WRITING = 'continue_writing',
}

const TASK_CONFIG = {
    [AITask.SUMMARIZE]: {
        icon: FileText,
        label: 'Summarize',
        prompt: 'Summarize the following text concisely in 3-5 bullet points:',
        color: 'text-blue-600'
    },
    [AITask.TRANSLATE]: {
        icon: Languages,
        label: 'Translate to Korean',
        prompt: 'Translate the following text to Korean. Maintain the original tone and meaning:',
        color: 'text-green-600'
    },
    [AITask.EXPAND]: {
        icon: Wand2,
        label: 'Expand',
        prompt: 'Expand and elaborate on the following text with more details and examples:',
        color: 'text-purple-600'
    },
    [AITask.SIMPLIFY]: {
        icon: MessageCircle,
        label: 'Simplify',
        prompt: 'Simplify the following text for easier understanding. Use clear, simple language:',
        color: 'text-orange-600'
    },
    [AITask.FIX_GRAMMAR]: {
        icon: CheckCircle2,
        label: 'Fix Grammar',
        prompt: 'Fix grammar, spelling, and punctuation in the following text. Return only the corrected version:',
        color: 'text-red-600'
    },
    [AITask.CHANGE_TONE]: {
        icon: MessageCircle,
        label: 'Make Professional',
        prompt: 'Rewrite the following text in a professional, formal tone:',
        color: 'text-indigo-600'
    },
    [AITask.EXTRACT_ACTIONS]: {
        icon: List,
        label: 'Extract Action Items',
        prompt: 'Extract action items from the following text as a clear, bulleted list:',
        color: 'text-yellow-600'
    },
    [AITask.CONTINUE_WRITING]: {
        icon: Sparkles,
        label: 'Continue Writing',
        prompt: 'Continue writing from where this text left off. Match the tone and style:',
        color: 'text-pink-600'
    },
};

interface AITaskMenuProps {
    selectedText: string;
    onTaskSelect: (task: AITask, prompt: string) => void;
    onClose: () => void;
    position: { x: number; y: number };
}

export default function AITaskMenu({
    selectedText,
    onTaskSelect,
    onClose,
    position
}: AITaskMenuProps) {
    const [hoveredTask, setHoveredTask] = useState<AITask | null>(null);

    const handleTaskClick = (task: AITask) => {
        const config = TASK_CONFIG[task];
        const fullPrompt = `${config.prompt}\n\n${selectedText}`;
        onTaskSelect(task, fullPrompt);
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40"
                onClick={onClose}
            />

            {/* Menu */}
            <div
                className="fixed z-50 bg-white dark:bg-[#1C1C1C] rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800 p-1 min-w-[240px] animate-in fade-in zoom-in-95 duration-200"
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                }}
            >
                {/* Header */}
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-600" />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        AI Tasks
                    </span>
                </div>

                {/* Task List */}
                <div className="py-1">
                    {Object.entries(TASK_CONFIG).map(([task, config]) => {
                        const Icon = config.icon;
                        const isHovered = hoveredTask === task;

                        return (
                            <button
                                key={task}
                                onClick={() => handleTaskClick(task as AITask)}
                                onMouseEnter={() => setHoveredTask(task as AITask)}
                                onMouseLeave={() => setHoveredTask(null)}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#252525] rounded transition-colors group text-left"
                            >
                                <Icon
                                    size={16}
                                    className={`${config.color} opacity-70 group-hover:opacity-100 transition-opacity`}
                                />
                                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 font-medium">
                                    {config.label}
                                </span>
                                <ChevronRight
                                    size={14}
                                    className={`text-gray-400 transition-transform ${isHovered ? 'translate-x-0.5' : ''
                                        }`}
                                />
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400">
                    {selectedText.length > 100
                        ? `${selectedText.substring(0, 100)}...`
                        : selectedText}
                </div>
            </div>
        </>
    );
}
