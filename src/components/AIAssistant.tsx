"use client";

import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowUp, X, Globe, Paperclip, ChevronDown, FileText, Search, Zap, Copy } from 'lucide-react';
import { generateAIContent } from '@/lib/ai';
import { subscribeToWorkspacePages, Page } from '@/lib/workspace';

interface AIAssistantProps {
    onInsertContent: (content: string) => void;
    editorContent: string;
    workspaceId: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function AIAssistant({ onInsertContent, editorContent, workspaceId }: AIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [availablePages, setAvailablePages] = useState<Page[]>([]);

    const [selectedContext, setSelectedContext] = useState<Page[]>([]);
    const [isWebMode, setIsWebMode] = useState(false);
    const [model, setModel] = useState("anthropic/claude-3.5-sonnet");
    const [showModelSelector, setShowModelSelector] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        if (isOpen) {
            // Subscribe to real-time updates when open
            // Subscribe to real-time updates when open
            unsubscribe = subscribeToWorkspacePages(workspaceId, (pages) => {
                // Filter out:
                // 1. Explicitly trashed pages
                // 2. Orphans (parentId points to non-existent page)
                // 3. Children of trashed/hidden pages

                const pageMap = new Map(pages.map(p => [p.id, p]));

                const isVisible = (p: Page): boolean => {
                    if (p.inTrash) return false;
                    if (!p.parentId) return true; // Root page, visible if not trash

                    const parent = pageMap.get(p.parentId);
                    if (!parent) return false; // Orphan (parent deleted/missing)

                    return isVisible(parent); // Recursive check up the tree
                };

                setAvailablePages(pages.filter(p => isVisible(p)));
            });

            // Sync model from storage
            const storedModel = localStorage.getItem("openrouter_model");
            // Validate stored model to ensure it's not an old invalid one
            const validModels = [
                "anthropic/claude-3.5-sonnet",
                "anthropic/claude-3-opus",
                "google/gemini-flash-1.5",
                "google/gemini-pro-1.5",
                "openai/gpt-4o"
            ];
            if (storedModel && validModels.includes(storedModel)) {
                setModel(storedModel);
            } else {
                setModel("anthropic/claude-3.5-sonnet");
            }
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [isOpen, workspaceId]);

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
            // Build context string
            let contextStr = "";
            if (selectedContext.length > 0) {
                contextStr += "Context from referenced pages:\n";
                // In a real app, we'd fetch content for these pages. 
                // For MVP, we pass their titles as a stub or assume we have content if simpler. 
                // Let's just mention them for now.
                contextStr += selectedContext.map(p => `- [Page: ${p.title}]`).join("\n") + "\n\n";
            }
            contextStr += `Current Editor Content:\n${editorContent.substring(0, 1000)}...\n\n`; // Truncate for token limits

            contextStr += `Current Editor Content:\n${editorContent.substring(0, 1000)}...\n\n`; // Truncate for token limits

            let finalPrompt = `${contextStr}User Query: ${userMsg.content}`;
            if (isWebMode) {
                finalPrompt += "\n\n[Instruction: The user has enabled Web Search Mode. Please use your internal knowledge base to act as if you are searching the web. Provide up-to-date, comprehensive information as if you just browsed the internet.]";
            }

            const sysPrompt = `You are an expert AI coding and note-taking assistant embedded in a modern notion-like workspace.
            
            **Guidelines:**
            1. **Format**: Use clean Markdown (Headers, Bullet points, Code blocks, Tables).
            2. **Tone**: Be professional, direct, and helpful. Avoid robotic intros.
            3. **Content**: When asked to research or explain, provide comprehensive and structured answers.
            4. **Context**: Use the user's provided page context to give relevant answers.
            5. **Language**: Respond in the same language as the user's query (Korean/English/etc).
            
            Always aim for clarity and actionable information.`;

            const result = await generateAIContent(finalPrompt, sysPrompt, model);

            setMessages(prev => [...prev, { role: 'assistant', content: result }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Error: Could not process request." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestion = (type: 'translate' | 'improve' | 'summarize') => {
        let text = "";
        let sys = "";
        if (type === 'translate') {
            text = "Translate this page to English (or identify language and translate to opposite).";
            sys = "You are a translator.";
        } else if (type === 'improve') {
            text = "Fix grammar and improve the tone of this page.";
            sys = "You are an expert editor.";
        } else if (type === 'summarize') {
            text = "Summarize this page in 3 bullet points.";
            sys = "You are a summarizer.";
        }
        setInput(text);
        // Optionally auto-send:
        // handleSend(); // But 'input' isn't set yet in state immediately. 
        // Better to just populate input for user to confirm.
    };

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
                            <ChevronDown size={14} className={`opacity-50 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Model Selector Dropdown */}
                        {showModelSelector && (
                            <div className="absolute top-12 left-4 w-64 bg-white dark:bg-[#252525] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[300px] overflow-y-auto p-1 animate-in z-50 fade-in zoom-in-95 duration-100">
                                <div className="text-[10px] font-semibold text-gray-400 px-2 py-1 uppercase">Advanced Models</div>
                                <button onClick={() => handleModelChange("anthropic/claude-3.5-sonnet")} className="w-full text-left px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 flex justify-between items-center">
                                    Claude 3.5 Sonnet {model === "anthropic/claude-3.5-sonnet" && "✓"}
                                </button>
                                <button onClick={() => handleModelChange("anthropic/claude-3-opus")} className="w-full text-left px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 flex justify-between items-center">
                                    Claude 3 Opus {model === "anthropic/claude-3-opus" && "✓"}
                                </button>
                                <button onClick={() => handleModelChange("google/gemini-flash-1.5")} className="w-full text-left px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 flex justify-between items-center">
                                    Gemini 1.5 Flash {model === "google/gemini-flash-1.5" && "✓"}
                                </button>
                                <button onClick={() => handleModelChange("google/gemini-pro-1.5")} className="w-full text-left px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 flex justify-between items-center">
                                    Gemini 1.5 Pro {model === "google/gemini-pro-1.5" && "✓"}
                                </button>
                                <button onClick={() => handleModelChange("openai/gpt-4o")} className="w-full text-left px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-200 flex justify-between items-center">
                                    GPT-4o {model === "openai/gpt-4o" && "✓"}
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
                                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 flex items-center justify-center">🤖</div>}
                                    <div className={`max-w-[80%] p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-black text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}>
                                        <div className="whitespace-pre-wrap">{m.content}</div>
                                        {m.role === 'assistant' && (
                                            <div className="mt-3 flex gap-2 w-full">
                                                <button
                                                    onClick={() => onInsertContent(m.content)}
                                                    className="flex-1 bg-black text-white dark:bg-white dark:text-black py-1.5 rounded-md text-xs font-bold hover:opacity-80 transition flex items-center justify-center gap-2"
                                                >
                                                    <FileText size={14} /> Add to Page
                                                </button>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(m.content)}
                                                    className="px-2 bg-gray-100 dark:bg-gray-700/50 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                                    title="Copy to clipboard"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        )}
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

                                        {/* Context Menu */}
                                        {contextMenuOpen && (
                                            <div className="absolute bottom-8 left-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto z-50">
                                                <div className="p-2 text-xs font-bold text-gray-400 uppercase">Pages</div>
                                                {availablePages.map(page => (
                                                    <button
                                                        key={page.id}
                                                        onClick={() => {
                                                            if (!selectedContext.find(p => p.id === page.id)) {
                                                                setSelectedContext([...selectedContext, page]);
                                                            }
                                                            setContextMenuOpen(false);
                                                            inputRef.current?.focus();
                                                        }}
                                                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center gap-2 truncate"
                                                    >
                                                        <FileText size={14} />
                                                        {page.title || "Untitled"}
                                                    </button>
                                                ))}
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
                                                        setInput(prev => prev + `\n[Attached File: ${file.name}]\n${text}\n`);
                                                    };
                                                    reader.readAsText(file);
                                                }
                                            }}
                                        />
                                    </button>
                                    <button
                                        onClick={() => setIsWebMode(!isWebMode)}
                                        className={`p-1 rounded transition ${isWebMode ? "text-blue-500 bg-blue-50 dark:bg-blue-900/30" : "text-gray-400 hover:text-black dark:hover:text-white"}`}
                                        title="Toggle Web Knowledge"
                                    >
                                        <Globe size={14} />
                                    </button>
                                </div>
                                <button
                                    onClick={handleSend}
                                    disabled={loading || (!input.trim() && selectedContext.length === 0)}
                                    className={`w-7 h-7 rounded-sm flex items-center justify-center transition-all ${input.trim() ? "bg-black text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
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
                className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all border border-gray-200 dark:border-gray-700 ${isOpen ? "bg-white text-black rotate-90" : "bg-white hover:bg-gray-50 text-black hover:scale-105"
                    }`}
                style={isOpen ? { boxShadow: 'none' } : {}}
            >
                {isOpen ? <X size={24} /> : <Sparkles size={20} className="text-purple-600" fill="currentColor" fillOpacity={0.2} />}
            </button>
        </div >
    );
}
