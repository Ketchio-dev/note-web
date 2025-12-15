"use client";

import { useState, useEffect } from 'react';
import { Sparkles, X, Zap } from 'lucide-react';
import { subscribeToWorkspacePages, Page } from '@/lib/workspace';
import { useAuth } from '@/context/AuthContext';

import ChatMessage from './ai/ChatMessage';
import ChatInput from './ai/ChatInput';
import ModelSelector from './ai/ModelSelector';
import ContextPicker from './ai/ContextPicker';
import { useAIChat } from './ai/useAIChat';

interface AIAssistantProps {
    onInsertContent: (content: string) => void;
    onReplaceContent: (content: string) => void;
    editorContent: string;
    workspaceId: string;
}

export default function AIAssistant({ onInsertContent, onReplaceContent, editorContent, workspaceId }: AIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [contextMenuOpen, setContextMenuOpen] = useState(false);

    // Auth
    const { user } = useAuth();

    // Page Data subscription
    const [availablePages, setAvailablePages] = useState<Page[]>([]);
    useEffect(() => {
        if (!workspaceId) return;
        const unsubscribe = subscribeToWorkspacePages(workspaceId, (pages) => {
            setAvailablePages(pages);
        });
        return () => unsubscribe();
    }, [workspaceId]);

    const [searchQuery, setSearchQuery] = useState("");

    // Custom Hook for Logic
    const {
        messages,
        setMessages,
        input,
        setInput,
        loading,
        model,
        handleModelChange,
        handleSend,
        isWebMode,
        setIsWebMode,
        selectedContext,
        setSelectedContext,
        handleSuggestion
    } = useAIChat({
        workspaceId,
        userId: user?.uid || '',
        editorContent,
        onInsertContent,
        onReplaceContent,
        availablePages
    });

    const handleAddContext = (page: Page) => {
        if (!selectedContext.find(p => p.id === page.id)) {
            setSelectedContext([...selectedContext, page]);
        }
        setContextMenuOpen(false);
        setSearchQuery("");
    };

    return (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2 font-sans">
            {/* Modal */}
            {isOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="ai-assistant-title"
                    className="absolute bottom-16 right-0 w-[500px] h-[600px] bg-white dark:bg-[#1C1C1C] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-[#1C1C1C]">
                        <div className="flex items-center gap-2">
                            <Sparkles size={20} className="text-purple-600" />
                            <h2 id="ai-assistant-title" className="font-semibold text-gray-900 dark:text-gray-100">AI Assistant</h2>
                        </div>
                        <div className="flex items-center gap-1">
                            <ModelSelector model={model} onModelChange={handleModelChange} />
                            <button
                                onClick={() => setIsOpen(false)}
                                aria-label="Close AI assistant"
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Chat Body */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center mt-10 gap-6 opacity-0 animate-in fade-in duration-500 fill-mode-forwards" style={{ animationDelay: '100ms' }}>
                                <div className="w-16 h-16 bg-white border border-gray-100 rounded-full shadow-sm flex items-center justify-center text-3xl">
                                    🧙‍♂️
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">How can I help you today?</h3>

                                <div className="flex flex-col gap-2 w-full px-4">
                                    <button onClick={() => handleSuggestion('improve')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left group">
                                        <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center group-hover:bg-yellow-200 transition">✨</div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-200">Improve writing</div>
                                            <div className="text-xs text-gray-400">Fix grammar and tone</div>
                                        </div>
                                    </button>
                                    <button onClick={() => handleSuggestion('translate')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left group">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-200 transition">文</div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-200">Translate this page</div>
                                            <div className="text-xs text-gray-400">To English, Japanese, etc.</div>
                                        </div>
                                    </button>
                                    <button onClick={() => handleSuggestion('summarize')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left group">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-200 transition">📝</div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-200">Summarize</div>
                                            <div className="text-xs text-gray-400">Create a quick summary</div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            messages.map((m, i) => (
                                <ChatMessage
                                    key={i}
                                    role={m.role}
                                    content={m.content}
                                    reasoning={m.reasoning}
                                    onInsertContent={onInsertContent}
                                />
                            ))
                        )}
                        {loading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 flex items-center justify-center">🤖</div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex items-center">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce mr-1"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce mr-1" style={{ animationDelay: '0.2s' }}></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="relative">
                        <ContextPicker
                            isOpen={contextMenuOpen}
                            onClose={() => setContextMenuOpen(false)}
                            onSelect={handleAddContext}
                            availablePages={availablePages}
                            selectedContext={selectedContext}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                        />
                        <ChatInput
                            input={input}
                            setInput={setInput}
                            onSend={handleSend}
                            loading={loading}
                            isWebMode={isWebMode}
                            toggleWebMode={() => setIsWebMode(!isWebMode)}
                            selectedContext={selectedContext}
                            onRemoveContext={(id) => setSelectedContext(prev => prev.filter(p => p.id !== id))}
                            onAddContextClick={() => setContextMenuOpen(!contextMenuOpen)}
                        />
                    </div>
                </div>
            )}

            {/* Fab */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
                className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all border border-gray-200 dark:border-gray-700 ${isOpen ? "bg-white text-black rotate-90" : "bg-white hover:bg-gray-50 text-black hover:scale-105"
                    }`}
                style={isOpen ? { boxShadow: 'none' } : {}}
            >
                {isOpen ? <X size={24} /> : <Sparkles size={20} className="text-purple-600" fill="currentColor" fillOpacity={0.2} />}
            </button>
        </div>
    );
}
