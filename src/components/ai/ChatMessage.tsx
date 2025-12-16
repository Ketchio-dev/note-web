"use client";

import { CheckCheck, Copy, FileText } from 'lucide-react';
import { memo } from 'react';

interface ChatMessageProps {
    role: 'user' | 'assistant' | 'system';
    content: string;
    reasoning?: string;
    onInsertContent: (content: string) => void;
    onReplaceContent?: (content: string) => void;
}

function ChatMessage({ role, content, reasoning, onInsertContent, onReplaceContent }: ChatMessageProps) {
    // Helper to render content with styled action badges
    const renderMessageContent = (msgContent: string) => {
        const parts = msgContent.split(/(__ACTION_EXECUTED:[a-z_]+__)/g);
        return parts.map((part, idx) => {
            if (part.startsWith("__ACTION_EXECUTED:")) {
                const actionType = part.replace("__ACTION_EXECUTED:", "").replace("__", "");
                return (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 ml-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-medium select-none">
                        <CheckCheck size={10} />
                        {actionType === 'update_page' ? 'Page Updated' : 'Editor Updated'}
                    </span>
                );
            }
            return <span key={idx} className="whitespace-pre-wrap">{part}</span>;
        });
    };

    const cleanContent = content.replace(/__ACTION_EXECUTED:[a-z_]+__/g, '');

    return (
        <div className={`flex gap-3 ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 flex items-center justify-center">🤖</div>
            )}
            <div className="flex flex-col gap-1 max-w-[80%]">
                {reasoning && (
                    <details className="mb-1 group">
                        <summary className="cursor-pointer text-[10px] text-gray-400 font-mono flex items-center gap-1 select-none">
                            <span className="w-1 h-2 bg-purple-400 rounded-full"></span> Thinking...
                        </summary>
                        <div className="mt-1 text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 font-mono whitespace-pre-wrap">
                            {reasoning}
                        </div>
                    </details>
                )}
                <div className={`p-3 rounded-lg text-sm ${role === 'user' ? 'bg-black text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}>
                    {/* RENDER CONTENT WITH BADGES */}
                    <div>{renderMessageContent(content)}</div>

                    {role === 'assistant' && (
                        <div className="mt-3 flex gap-2 w-full">
                            <button
                                onClick={() => onInsertContent(cleanContent)}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-3 rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5"
                                title="Insert at cursor position"
                            >
                                <FileText size={14} />
                                Insert
                            </button>
                            {onReplaceContent && (
                                <button
                                    onClick={() => onReplaceContent(cleanContent)}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5"
                                    title="Replace selected text"
                                >
                                    <FileText size={14} />
                                    Replace
                                </button>
                            )}
                            <button
                                onClick={() => navigator.clipboard.writeText(cleanContent)}
                                className="px-3 bg-gray-100 dark:bg-gray-700/50 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                title="Copy to clipboard"
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Wrap with React.memo for performance
export default memo(ChatMessage);
