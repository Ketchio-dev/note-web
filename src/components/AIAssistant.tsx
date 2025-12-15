"use client";

import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowUp, X, Globe, Paperclip, ChevronDown, FileText, Search, Zap, Copy, Layout, CheckCheck, Play } from 'lucide-react';
import { generateAIContent } from '@/lib/ai';
import { subscribeToWorkspacePages, Page, updatePage } from '@/lib/workspace';

interface AIAssistantProps {
    onInsertContent: (content: string) => void;
    onReplaceContent: (content: string) => void;
    editorContent: string;
    workspaceId: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function AIAssistant({ onInsertContent, onReplaceContent, editorContent, workspaceId }: AIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [contextMenuOpen, setContextMenuOpen] = useState(false);

    // Page Data
    const [availablePages, setAvailablePages] = useState<Page[]>([]);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");

    const [selectedContext, setSelectedContext] = useState<Page[]>([]);
    const [isWebMode, setIsWebMode] = useState(false);
    const [model, setModel] = useState("google/gemini-3.0-pro");
    const [showModelSelector, setShowModelSelector] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Fetch Pages for Context
    useEffect(() => {
        if (!workspaceId) return;
        const unsubscribe = subscribeToWorkspacePages(workspaceId, (pages) => {
            setAvailablePages(pages);
        });
        return () => unsubscribe();
    }, [workspaceId]);

    // Focus search when opening context menu
    useEffect(() => {
        if (contextMenuOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            setSearchQuery(""); // Reset search on close
        }
    }, [contextMenuOpen]);


    const handleModelChange = (newModel: string) => {
        setModel(newModel);
        localStorage.setItem("openrouter_model", newModel);
        setShowModelSelector(false);
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            // Build context string WITH IDs
            let contextStr = "";
            if (selectedContext.length > 0) {
                contextStr += "Context from referenced pages:\n";
                // INCLUDE PAGE ID HERE
                const formattedContext = selectedContext.map(p => {
                    return "- Page: " + p.title + " (ID: " + p.id + ") \n  Content: " + (p.content || "Empty");
                });
                contextStr += formattedContext.join("\n\n") + "\n\n";
            }
            contextStr += `Current Editor Content: \n${editorContent.substring(0, 1000)}...\n\n`;

            let finalPrompt = `${contextStr}User Query: ${userMsg.content} `;
            if (isWebMode) {
                finalPrompt += "\n\n[Instruction: The user has enabled Web Search Mode. Please use your internal knowledge base to act as if you are searching the web. Provide up-to-date, comprehensive information as if you just browsed the internet.]";
            }

            const sysPrompt = `You are an expert AI coding and note - taking assistant embedded in a modern notion - like workspace.
            
            ** Guidelines:**
    1. ** Format **: Use clean Markdown.
            2. ** Tone **: Be professional, direct, and helpful.
            3. ** Tools / Permissions **: You have permission to MODIFY the pages.
               - To ** APPEND ** to current editor: Use \`:::action { "type": "append", "content": "text" } :::\`
               - To **REPLACE** current editor: Use \`:::action { "type": "replace", "content": "text" } :::\`
               - To **UPDATE** a specific context page: Use \`:::action { "type": "update_page", "pageId": "PAGE_ID_FROM_CONTEXT", "content": "new full content" } :::\`
               - ONLY use these actions if the user explicitly asks to edit, write, fix, or modify.
               - You can execute multiple actions in one response.
            4. **Context**: Use the provided page IDs to target specific pages.
            
            Always aim for clarity and actionable information.`;

            const { content, reasoning } = await generateAIContent(finalPrompt, sysPrompt, model);

            // Parse Actions
            let displayContent = content;
            const actionRegex = /:::action\s*({[\s\S]*?})\s*:::/g;
            let match;
            const actionsToExecute: any[] = [];

            // First pass: Collect actions and strip them from display text
            while ((match = actionRegex.exec(content)) !== null) {
                try {
                    const actionJson = match[1];
                    const action = JSON.parse(actionJson);
                    actionsToExecute.push(action);

                    // Replace with a marker we can style later, or just remove if we want it invisible
                    // Replacing with a clean marker for the UI
                    displayContent = displayContent.replace(match[0], `__ACTION_EXECUTED:${action.type}__`);
                } catch (e) {
                    console.error("Failed to parse AI action", e);
                }
            }

            // Execute Actions
            for (const action of actionsToExecute) {
                if (action.type === 'append') {
                    onInsertContent(action.content);
                } else if (action.type === 'replace') {
                    onReplaceContent(action.content);
                } else if (action.type === 'update_page') {
                    if (action.pageId && action.content) {
                        await updatePage(action.pageId, { content: action.content });
                    }
                }
            }

            setMessages(prev => [...prev, { role: 'assistant', content: displayContent, reasoning }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Error: Could not process request." }]);
        } finally {
            setLoading(false);
        }
    };

    // Helper to render content with styled action badges
    const renderMessageContent = (content: string) => {
        const parts = content.split(/(__ACTION_EXECUTED:[a-z_]+__)/g);
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

    const handleSuggestion = (type: 'translate' | 'improve' | 'summarize') => {
        let text = "";
        if (type === 'translate') {
            text = "Translate this page to English (or identify language and translate to opposite).";
        } else if (type === 'improve') {
            text = "Fix grammar and improve the tone of this page.";
        } else if (type === 'summarize') {
            text = "Summarize this page in 3 bullet points.";
        }
        setInput(text);
    };

    // Filter pages for context menu
    const filteredPages = availablePages
        .filter(p => !p.inTrash)
        .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2 font-sans">
            {/* Modal */}
            {isOpen && (
                <div className="bg-white dark:bg-[#1C1C1C] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-[400px] h-[500px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
                    {/* Header */}
                    <div className="relative flex justify-between items-center p-3 border-b border-gray-100 dark:border-gray-800">
                        <button
                            onClick={() => setShowModelSelector(!showModelSelector)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition"
                        >
                            <Sparkles size={16} className="text-purple-500" />
                            <div className="flex flex-col items-start leading-none">
                                <span>New AI chat</span>
                                <span className="text-[10px] text-gray-400 font-normal">{model.split('/').pop()}</span>
                            </div>
                            <ChevronDown size={14} className={`opacity - 50 transition - transform ${showModelSelector ? 'rotate-180' : ''} `} />
                        </button>

                        {/* Model Selector Dropdown */}
                        {showModelSelector && (
                            <div className="absolute top-12 left-4 w-64 bg-white dark:bg-[#252525] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[300px] overflow-y-auto p-1 animate-in z-50 fade-in zoom-in-95 duration-100">
                                <div className="text-[10px] font-semibold text-gray-400 px-2 py-1 uppercase">2025 / Advanced</div>
                                <button onClick={() => handleModelChange("anthropic/claude-4.5-sonnet")} className="w-full text-left px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 flex justify-between items-center">
                                    Claude 4.5 Sonnet {model === "anthropic/claude-4.5-sonnet" && "✓"}
                                </button>
                                <button onClick={() => handleModelChange("anthropic/claude-4.5-opus")} className="w-full text-left px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 flex justify-between items-center">
                                    Claude 4.5 Opus {model === "anthropic/claude-4.5-opus" && "✓"}
                                </button>
                                <button onClick={() => handleModelChange("google/gemini-2.5-flash")} className="w-full text-left px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 flex justify-between items-center">
                                    Gemini 2.5 Flash {model === "google/gemini-2.5-flash" && "✓"}
                                </button>
                                <button onClick={() => handleModelChange("google/gemini-3.0-pro")} className="w-full text-left px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 flex justify-between items-center">
                                    Gemini 3.0 Pro {model === "google/gemini-3.0-pro" && "✓"}
                                </button>
                                <button onClick={() => handleModelChange("openai/gpt-5.2")} className="w-full text-left px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 flex justify-between items-center">
                                    GPT-5.2 {model === "openai/gpt-5.2" && "✓"}
                                </button>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => setMessages([])} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1" title="Clear Chat">
                                <Zap size={14} />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                                <X size={16} />
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
                                <div key={i} className={`flex gap - 3 ${m.role === 'user' ? 'justify-end' : 'justify-start'} `}>
                                    {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 flex items-center justify-center">🤖</div>}
                                    <div className="flex flex-col gap-1 max-w-[80%]">
                                        {(m as any).reasoning && (
                                            <details className="mb-1 group">
                                                <summary className="cursor-pointer text-[10px] text-gray-400 font-mono flex items-center gap-1 select-none">
                                                    <span className="w-1 h-2 bg-purple-400 rounded-full"></span> Thinking...
                                                </summary>
                                                <div className="mt-1 text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 font-mono whitespace-pre-wrap">
                                                    {(m as any).reasoning}
                                                </div>
                                            </details>
                                        )}
                                        <div className={`p - 3 rounded - lg text - sm ${m.role === 'user' ? 'bg-black text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200'} `}>
                                            {/* RENDER CONTENT WITH BADGES */}
                                            <div>{renderMessageContent(m.content)}</div>

                                            {m.role === 'assistant' && (
                                                <div className="mt-3 flex gap-2 w-full">
                                                    <button
                                                        onClick={() => onInsertContent(m.content.replace(/__ACTION_EXECUTED:[a-z_]+__/g, ''))}
                                                        className="flex-1 bg-black text-white dark:bg-white dark:text-black py-1.5 rounded-md text-xs font-bold hover:opacity-80 transition flex items-center justify-center gap-2"
                                                    >
                                                        <FileText size={14} /> Add to Page
                                                    </button>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(m.content.replace(/__ACTION_EXECUTED:[a-z_]+__/g, ''))}
                                                        className="px-2 bg-gray-100 dark:bg-gray-700/50 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                                        title="Copy text only"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
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
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1C1C1C]">
                        {selectedContext.length > 0 && (
                            <div className="flex gap-2 mb-2 overflow-x-auto">
                                {selectedContext.map(page => (
                                    <span key={page.id} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded flex items-center gap-1">
                                        <FileText size={10} />
                                        {page.title}
                                        <button onClick={() => setSelectedContext(prev => prev.filter(p => p.id !== page.id))} className="hover:text-blue-800"><X size={10} /></button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="relative bg-gray-50 dark:bg-[#2C2C2C] rounded-xl border border-gray-200 dark:border-gray-700 p-2 focus-within:ring-2 focus-within:ring-black/5 dark:focus-within:ring-white/10 transition-all">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={loading ? "Thinking..." : "Message AI..."}
                                className="w-full bg-transparent border-none focus:outline-none text-sm p-1 text-gray-900 dark:text-white"
                                autoFocus
                                disabled={loading}
                            />
                            <div className="flex justify-between items-center mt-2 px-1">
                                <div className="flex gap-1">
                                    <div className="relative">
                                        <button
                                            onClick={() => setContextMenuOpen(!contextMenuOpen)}
                                            className="flex items-center gap-1 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded transition"
                                        >
                                            <span className="font-bold">@</span> Add context
                                        </button>

                                        {/* Improved Context Menu */}
                                        {contextMenuOpen && (
                                            <div className="absolute bottom-8 left-0 w-64 bg-[#1E1E1E] text-white rounded-lg shadow-2xl border border-gray-700 max-h-64 overflow-hidden z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                                                {/* Search Bar */}
                                                <div className="p-2 border-b border-gray-700">
                                                    <div className="flex items-center gap-2 bg-[#2C2C2C] rounded px-2 py-1.5 border border-transparent focus-within:border-blue-500 transition-colors">
                                                        <Search size={14} className="text-gray-400" />
                                                        <input
                                                            ref={searchInputRef}
                                                            type="text"
                                                            placeholder="Search pages..."
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            className="bg-transparent border-none text-xs text-white placeholder:text-gray-500 w-full focus:outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="overflow-y-auto flex-1 py-1">
                                                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase">Pages</div>

                                                    {filteredPages.length === 0 ? (
                                                        <div className="px-3 py-2 text-xs text-gray-500 italic text-center">No pages found</div>
                                                    ) : (
                                                        filteredPages.map(page => (
                                                            <button
                                                                key={page.id}
                                                                onClick={() => {
                                                                    if (!selectedContext.find(p => p.id === page.id)) {
                                                                        setSelectedContext([...selectedContext, page]);
                                                                    }
                                                                    setContextMenuOpen(false);
                                                                    setSearchQuery("");
                                                                    inputRef.current?.focus();
                                                                }}
                                                                className="w-full text-left px-3 py-2 hover:bg-[#2C2C2C] text-sm flex items-center gap-2.5 transition-colors group"
                                                            >
                                                                <div className="w-5 h-5 flex items-center justify-center text-base bg-[#2C2C2C] group-hover:bg-[#333] rounded-sm transition-colors">
                                                                    {page.icon ? page.icon : (page.type === 'database' ? <Layout size={12} className="text-gray-400" /> : <FileText size={12} className="text-gray-400" />)}
                                                                </div>
                                                                <div className="flex-1 truncate">
                                                                    <div className="text-gray-200 text-sm truncate">{page.title || "Untitled"}</div>
                                                                    <div className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                                                                        {page.section === 'private' ? 'Private' : 'Teamspace'}
                                                                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                                        Last edited by You
                                                                    </div>
                                                                </div>
                                                                {selectedContext.find(p => p.id === page.id) && <span className="text-blue-500 text-xs">Added</span>}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-gray-400 hover:text-black dark:hover:text-white p-1 rounded relative"
                                        title="Attach file (Text/MD)"
                                    >
                                        <Paperclip size={14} />
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept=".txt,.md,.json,.csv"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                        const text = ev.target?.result as string;
                                                        setInput(prev => prev + `\n[Attached File: ${file.name}]\n${text} \n`);
                                                    };
                                                    reader.readAsText(file);
                                                }
                                            }}
                                        />
                                    </button>
                                    <button
                                        onClick={() => setIsWebMode(!isWebMode)}
                                        className={`p - 1 rounded transition ${isWebMode ? "text-blue-500 bg-blue-50 dark:bg-blue-900/30" : "text-gray-400 hover:text-black dark:hover:text-white"} `}
                                        title="Toggle Web Knowledge"
                                    >
                                        <Globe size={14} />
                                    </button>
                                </div>
                                <button
                                    onClick={handleSend}
                                    disabled={loading || (!input.trim() && selectedContext.length === 0)}
                                    className={`w - 7 h - 7 rounded - sm flex items - center justify - center transition - all ${input.trim() ? "bg-black text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"} `}
                                >
                                    <ArrowUp size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fab */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w - 12 h - 12 rounded - full shadow - lg flex items - center justify - center transition - all border border - gray - 200 dark: border - gray - 700 ${isOpen ? "bg-white text-black rotate-90" : "bg-white hover:bg-gray-50 text-black hover:scale-105"
                    } `}
                style={isOpen ? { boxShadow: 'none' } : {}}
            >
                {isOpen ? <X size={24} /> : <Sparkles size={20} className="text-purple-600" fill="currentColor" fillOpacity={0.2} />}
            </button>
        </div >
    );
}
