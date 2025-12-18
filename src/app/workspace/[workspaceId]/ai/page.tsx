"use client";

import { useState, useRef, useEffect, use } from "react";
import { useAuth } from "@/context/AuthContext"; // Assuming we have auth context
import { generateAIContent } from "@/lib/ai";
import { Sparkles, ArrowUp, Zap, FileText, Globe, Paperclip, Search, CheckCircle2, ChevronDown, Plus, MessageSquare, Trash2, History, Menu, Copy, RefreshCw } from "lucide-react"; // Import more icons
import { createChat, updateChatMessages, getWorkspaceChats, getChat, ChatSession, deleteChat } from "@/lib/chat-service";

interface Message {
    role: 'user' | 'assistant';
    content: string;
    reasoning?: string;
}

export default function AIDashboard({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = use(params); // Next 15+ way to unwrap params
    const { user } = useAuth();

    // Chat State
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);

    // History State
    const [history, setHistory] = useState<ChatSession[]>([]);
    const [showHistory, setShowHistory] = useState(false); // Toggle sidebar

    // Model Selection State
    const [model, setModel] = useState("google/gemini-3.0-pro"); // Default
    const [showModelSelector, setShowModelSelector] = useState(false);

    // Streaming State
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");

    // Context State
    const [includeContext, setIncludeContext] = useState(true);
    const [currentPageTitle, setCurrentPageTitle] = useState<string>("");

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load & History Fetch
    useEffect(() => {
        const stored = localStorage.getItem("openrouter_model");
        // Validate stored model to ensure it's not an old invalid one
        const validModels = [
            "anthropic/claude-4.5-sonnet",
            "anthropic/claude-4.5-opus",
            "google/gemini-2.5-flash",
            "google/gemini-3.0-pro",
            "openai/gpt-5.2"
        ];
        if (stored && validModels.includes(stored)) {
            setModel(stored);
        } else {
            setModel("google/gemini-3.0-pro");
        }

        if (workspaceId) {
            loadHistory();
        }
    }, [workspaceId]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const loadHistory = async () => {
        if (!workspaceId) return;
        const chats = await getWorkspaceChats(workspaceId);
        setHistory(chats);
    };

    const handleNewChat = () => {
        setChatId(null);
        setMessages([]);
        setInput("");
        // setShowHistory(false); // Optional: close sidebar on new chat
    };

    const handleLoadChat = async (id: string) => {
        if (!workspaceId) return;
        setLoading(true);
        try {
            const chat = await getChat(workspaceId, id);
            if (chat) {
                setChatId(chat.id);
                setMessages(chat.messages);
            }
        } catch (error) {
            console.error("Failed to load chat", error);
        } finally {
            setLoading(false);
            setShowHistory(false); // Close sidebar on mobile/action
        }
    };

    const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!workspaceId) return;
        if (confirm("Delete this chat?")) {
            await deleteChat(workspaceId, id);
            await loadHistory();
            if (chatId === id) handleNewChat();
        }
    }

    const handleModelChange = (newModel: string) => {
        setModel(newModel);
        localStorage.setItem("openrouter_model", newModel);
        setShowModelSelector(false);
    };

    const handleSendWithStreaming = async () => {
        if (!input.trim() || !user || !workspaceId) return;

        const userMsg: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];

        setMessages(newMessages);
        setInput("");
        setIsStreaming(true);
        setStreamingContent("");

        try {
            // 1. Save or Create Chat
            let currentChatId = chatId;
            if (!currentChatId) {
                const newChat = await createChat(workspaceId, user.uid, userMsg);
                currentChatId = newChat.id;
                setChatId(currentChatId);
                loadHistory();
            } else {
                await updateChatMessages(workspaceId, currentChatId, newMessages);
            }

            // 2. Prepare context if enabled
            let contextText = "";
            if (includeContext && currentPageTitle) {
                contextText = `Current page: ${currentPageTitle}`;
            }

            // 3. Call streaming API
            const response = await fetch('/api/ai/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: contextText ? [
                        { role: 'system', content: contextText },
                        { role: 'user', content: userMsg.content }
                    ] : [{ role: 'user', content: userMsg.content }],
                    model,
                    userId: user.uid
                }),
            });

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.content) {
                                fullContent += parsed.content;
                                setStreamingContent(fullContent);
                            }
                        } catch (e) {
                            // Skip
                        }
                    }
                }
            }

            // 4. Save final message
            const aiMsg: Message = { role: 'assistant', content: fullContent };
            const finalMessages = [...newMessages, aiMsg];
            setMessages(finalMessages);

            if (currentChatId) {
                await updateChatMessages(workspaceId, currentChatId, finalMessages);
                loadHistory();
            }

        } catch (error) {
            console.error("Stream Error", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, streaming failed." }]);
        } finally {
            setIsStreaming(false);
            setStreamingContent("");
        }
    };

    const handleSend = handleSendWithStreaming;

    const handleCopy = async (content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            // Simple toast notification (you can enhance with a toast library)
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top';
            toast.textContent = '✓ Copied to clipboard';
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('animate-out', 'fade-out');
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleRegenerate = async (messageIndex: number) => {
        if (!user || !workspaceId || messageIndex < 1) return;

        // Get the user message before the AI response
        const userMessage = messages[messageIndex - 1];
        if (userMessage.role !== 'user') return;

        // Remove the AI message and everything after it
        const newMessages = messages.slice(0, messageIndex);
        setMessages(newMessages);
        setLoading(true);

        try {
            // Regenerate AI response
            const { content, reasoning } = await generateAIContent(userMessage.content, undefined, model);
            const aiMsg: Message = { role: 'assistant', content, reasoning };
            const finalMessages = [...newMessages, aiMsg];

            setMessages(finalMessages);

            // Update chat if exists
            if (chatId) {
                await updateChatMessages(workspaceId, chatId, finalMessages);
            }
        } catch (error) {
            console.error("Regenerate Error", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, regeneration failed." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 h-screen flex bg-[#191919] text-white relative font-sans overflow-hidden">

            {/* History Sidebar (Collapsible) */}
            <div className={`
                ${showHistory ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0'} 
                bg-[#1e1e1e] border-r border-[#333] transition-all duration-300 absolute md:relative z-30 h-full flex flex-col
            `}>
                <div className="p-4 flex items-center justify-between border-b border-[#333]">
                    <span className="font-semibold text-sm text-gray-400">History</span>
                    <button onClick={() => handleNewChat()} className="p-1 hover:bg-[#333] rounded-md text-gray-300" title="New Chat">
                        <Plus size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {history.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => handleLoadChat(chat.id)}
                            className={`
                                group flex items-center justify-between p-3 rounded-lg cursor-pointer text-sm transition
                                ${chatId === chat.id ? 'bg-[#333] text-white' : 'text-gray-400 hover:bg-[#252525] hover:text-gray-200'}
                            `}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <MessageSquare size={14} className="shrink-0" />
                                <span className="truncate max-w-[140px]">{chat.title}</span>
                            </div>
                            <button
                                onClick={(e) => handleDeleteChat(e, chat.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full relative">

                {/* Top Bar: Menu & Model Selector */}
                <div className="flex items-center p-4 gap-4">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="p-2 hover:bg-[#333] rounded-lg text-gray-400 transition"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="relative z-50">
                        <button
                            onClick={() => setShowModelSelector(!showModelSelector)}
                            className="flex items-center gap-2 text-lg font-semibold hover:bg-[#2A2A2A] px-3 py-2 rounded-lg transition text-gray-200"
                        >
                            <span>{model.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            <ChevronDown size={16} className={`opacity-50 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Model Dropdown */}
                        {showModelSelector && (
                            <div className="absolute top-12 left-0 w-64 bg-[#252525] rounded-xl shadow-2xl border border-gray-800 z-50 max-h-[400px] overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100">
                                <div className="text-[10px] font-semibold text-gray-500 px-2 py-1 uppercase">2025 / Advanced</div>
                                <button onClick={() => handleModelChange("anthropic/claude-4.5-sonnet")} className="w-full text-left px-2 py-2 hover:bg-[#333] rounded-lg text-xs text-gray-200 flex justify-between items-center transition">
                                    <span className="font-medium">Claude 4.5 Sonnet</span>
                                    {model === "anthropic/claude-4.5-sonnet" && <span className="text-white">✓</span>}
                                </button>
                                <button onClick={() => handleModelChange("anthropic/claude-4.5-opus")} className="w-full text-left px-2 py-2 hover:bg-[#333] rounded-lg text-xs text-gray-200 flex justify-between items-center transition">
                                    <span className="font-medium">Claude 4.5 Opus</span>
                                    {model === "anthropic/claude-4.5-opus" && <span className="text-white">✓</span>}
                                </button>
                                <button onClick={() => handleModelChange("google/gemini-2.5-flash")} className="w-full text-left px-2 py-2 hover:bg-[#333] rounded-lg text-xs text-gray-200 flex justify-between items-center transition">
                                    <span className="font-medium">Gemini 2.5 Flash</span>
                                    {model === "google/gemini-2.5-flash" && <span className="text-white">✓</span>}
                                </button>
                                <button onClick={() => handleModelChange("google/gemini-3.0-pro")} className="w-full text-left px-2 py-2 hover:bg-[#333] rounded-lg text-xs text-gray-200 flex justify-between items-center transition">
                                    <span className="font-medium">Gemini 3.0 Pro</span>
                                    {model === "google/gemini-3.0-pro" && <span className="text-white">✓</span>}
                                </button>
                                <button onClick={() => handleModelChange("openai/gpt-5.2")} className="w-full text-left px-2 py-2 hover:bg-[#333] rounded-lg text-xs text-gray-200 flex justify-between items-center transition">
                                    <span className="font-medium">GPT-5.2</span>
                                    {model === "openai/gpt-5.2" && <span className="text-white">✓</span>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Stream */}
                <div className="flex-1 overflow-y-auto p-4 md:p-10 flex flex-col items-center pb-32">
                    {messages.length === 0 ? (
                        // Empty State
                        <div className="flex-1 flex flex-col items-center justify-center h-full w-full max-w-4xl">
                            <div className="w-16 h-16 bg-white dark:bg-[#333] rounded-full flex items-center justify-center mb-6 shadow-2xl">
                                <Sparkles size={32} className="text-gray-800 dark:text-white" />
                            </div>

                            {/* Suggestion Cards (Use same map as before or simplified) */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full mt-8">
                                {[
                                    { icon: Sparkles, color: "text-purple-500", label: "New in AI", sub: "Check updates", prompt: "What's new in AI?" },
                                    { icon: FileText, color: "text-blue-500", label: "Write agenda", sub: "For meetings", prompt: "Draft a meeting agenda for..." },
                                    { icon: Search, color: "text-orange-500", label: "Analyze doc", sub: "Summarize PDF", prompt: "Summarize this document: " },
                                    { icon: CheckCircle2, color: "text-green-500", label: "Task tracker", sub: "Create list", prompt: "Create a task list for project: " },
                                ].map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setInput(item.prompt);
                                            // Optional: auto-focus or auto-send
                                        }}
                                        className="flex flex-col gap-2 p-4 rounded-2xl bg-[#252525] hover:bg-[#2A2A2A] border border-gray-800 hover:border-blue-800 transition text-left group"
                                    >
                                        <item.icon size={20} className={`${item.color} mb-1`} />
                                        <div>
                                            <div className="font-semibold text-sm text-gray-200">{item.label}</div>
                                            <div className="text-xs text-gray-400 group-hover:text-gray-300">{item.sub}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Chat History
                        <div className="w-full max-w-3xl space-y-6">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start items-start'}`}>
                                    {m.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-full bg-[#333] flex-shrink-0 flex items-center justify-center border border-gray-700">
                                            <Sparkles size={16} className="text-purple-400" />
                                        </div>
                                    )}
                                    <div className={`max-w-[85%] flex flex-col gap-2 group ${m.role === 'user' ? 'items-end' : 'items-start'}`}>

                                        {/* Reasoning Block */}
                                        {m.reasoning && (
                                            <details className="mb-2 group">
                                                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 select-none font-mono">
                                                    <div className="w-1 h-3 bg-purple-500 rounded-full mr-1"></div>
                                                    Thinking Process
                                                    <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
                                                </summary>
                                                <div className="mt-2 text-xs text-gray-400 bg-[#222] p-3 rounded-md border border-gray-700/50 font-mono whitespace-pre-wrap leading-relaxed animate-in fade-in slide-in-from-top-1">
                                                    {m.reasoning}
                                                </div>
                                            </details>
                                        )}

                                        <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${m.role === 'user'
                                            ? 'bg-white text-black font-medium'
                                            : 'bg-[#2A2A2A] text-gray-100 border border-gray-800'
                                            }`}>
                                            <div className="whitespace-pre-wrap">{m.content}</div>
                                        </div>

                                        {/* Action Buttons (Only for AI messages) */}
                                        {m.role === 'assistant' && (
                                            <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleCopy(m.content)}
                                                    className="p-1.5 rounded-lg hover:bg-[#333] text-gray-500 hover:text-gray-300 transition"
                                                    title="Copy to clipboard"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleRegenerate(i)}
                                                    className="p-1.5 rounded-lg hover:bg-[#333] text-gray-500 hover:text-gray-300 transition"
                                                    title="Regenerate response"
                                                >
                                                    <RefreshCw size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {/* Streaming Message */}
                            {isStreaming && streamingContent && (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-[#333] flex-shrink-0 flex items-center justify-center border border-gray-700">
                                        <Sparkles size={16} className="text-purple-400 animate-pulse" />
                                    </div>
                                    <div className="max-w-[85%] flex flex-col gap-2">
                                        <div className="p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm bg-[#2A2A2A] text-gray-100 border border-gray-800">
                                            <div className="whitespace-pre-wrap">{streamingContent}</div>
                                            <div className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {loading && !isStreaming && (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-white text-xs shrink-0 bg-[#252525]">
                                        <Sparkles size={14} />
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500 text-sm h-8">
                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse" />
                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse delay-75" />
                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse delay-150" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area - Fixed Bottom */}
                <div className="absolute bottom-0 left-0 w-full flex justify-center pb-8 px-4 bg-gradient-to-t from-[#191919] via-[#191919] to-transparent pt-10">
                    <div className="w-full max-w-3xl bg-[#252525] rounded-[28px] p-2 flex items-center gap-2 shadow-lg border border-[#333]">
                        {/* Plus Button */}
                        <button className="w-8 h-8 rounded-full bg-[#333] hover:bg-[#444] flex items-center justify-center text-gray-400 transition" onClick={handleNewChat}>
                            <Plus size={18} />
                        </button>

                        <button className="w-8 h-8 rounded-full hover:bg-[#333] flex items-center justify-center text-gray-400 transition">
                            <Globe size={18} />
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Message AI..."
                            className="flex-1 bg-transparent border-none outline-none text-white px-2 placeholder:text-gray-500"
                        />

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim()}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${input.trim() ? "bg-white text-black" : "bg-[#333] text-gray-500"}`}
                            >
                                <ArrowUp size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="absolute bottom-2 w-full text-center text-[10px] text-gray-600 pointer-events-none">
                    AI can make mistakes. Check important info.
                </div>
            </div>
        </div>
    );
}
