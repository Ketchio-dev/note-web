"use client";

import { CSSProperties, use, useEffect, useMemo, useRef, useState } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import {
    Bot,
    ChevronDown,
    Compass,
    FileText,
    ListTodo,
    Menu,
    Mic,
    Plus,
    Search,
    Send,
    Sparkles,
    Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/context/AuthContext";
import { fetchWithAuth } from "@/lib/client-api";
import {
    ChatSession,
    createChat,
    deleteChat,
    getChat,
    getWorkspaceChats,
    updateChatMessages,
} from "@/lib/chat-service";

interface Message {
    role: "user" | "assistant";
    content: string;
}

const headingFont = Space_Grotesk({
    subsets: ["latin"],
    weight: ["500", "700"],
});

const bodyFont = IBM_Plex_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
});

const monoFont = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "500"],
});

const MODELS = [
    { id: "anthropic/claude-4.5-sonnet", label: "Claude 4.5 Sonnet" },
    { id: "anthropic/claude-4.5-opus", label: "Claude 4.5 Opus" },
    { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { id: "google/gemini-3.0-pro", label: "Gemini 3.0 Pro" },
    { id: "openai/gpt-5.2", label: "GPT-5.2" },
] as const;

const QUICK_PROMPTS = [
    {
        icon: Search,
        title: "Research Brief",
        description: "Summarize key points from my recent notes.",
        prompt: "Summarize the most important things in my recent notes and list action items.",
    },
    {
        icon: Compass,
        title: "Project Roadmap",
        description: "Turn a rough goal into phases.",
        prompt: "Help me break this project into milestones with weekly deliverables.",
    },
    {
        icon: FileText,
        title: "Write Draft",
        description: "Generate a clear first draft.",
        prompt: "Write a draft proposal with objective, scope, risks, and timeline.",
    },
    {
        icon: ListTodo,
        title: "Task Breakdown",
        description: "Convert ideas into executable tasks.",
        prompt: "Create a practical checklist from this plan with priorities and owners.",
    },
];

function resolveModelLabel(modelId: string): string {
    const found = MODELS.find((model) => model.id === modelId);
    return found?.label || modelId;
}

export default function AIDashboard({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = use(params);
    const { user } = useAuth();

    const [messages, setMessages] = useState<Message[]>([]);
    const [chatId, setChatId] = useState<string | null>(null);
    const [history, setHistory] = useState<ChatSession[]>([]);
    const [input, setInput] = useState("");
    const [model, setModel] = useState("google/gemini-3.0-pro");
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [includeContext, setIncludeContext] = useState(true);
    const [currentPageTitle, setCurrentPageTitle] = useState("");
    const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
    const [desktopHistoryCollapsed, setDesktopHistoryCollapsed] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const modelMenuRef = useRef<HTMLDivElement>(null);

    const aiTheme = useMemo(
        () =>
        ({
            "--ai-bg": "#0b1220",
            "--ai-panel": "rgba(15, 23, 42, 0.82)",
            "--ai-panel-strong": "rgba(15, 23, 42, 0.95)",
            "--ai-line": "rgba(148, 163, 184, 0.24)",
            "--ai-text": "#e2e8f0",
            "--ai-muted": "#94a3b8",
            "--ai-accent": "#22d3ee",
            "--ai-accent-2": "#fb923c",
            "--ai-user-ink": "#201205",
        }) as CSSProperties,
        []
    );

    useEffect(() => {
        const stored = localStorage.getItem("openrouter_model");
        if (stored && MODELS.some((modelOption) => modelOption.id === stored)) {
            setModel(stored);
        }
    }, []);

    useEffect(() => {
        if (!workspaceId) return;
        void loadHistory();
    }, [workspaceId]);

    useEffect(() => {
        const title = document.title?.trim();
        if (title && title !== "Ask AI") {
            setCurrentPageTitle(title);
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages, streamingContent, isStreaming]);

    useEffect(() => {
        if (!showModelMenu) return;

        const closeMenu = (event: MouseEvent) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
                setShowModelMenu(false);
            }
        };

        document.addEventListener("mousedown", closeMenu);
        return () => document.removeEventListener("mousedown", closeMenu);
    }, [showModelMenu]);

    const loadHistory = async () => {
        try {
            const chats = await getWorkspaceChats(workspaceId);
            setHistory(chats);
        } catch (error) {
            console.error("Failed to load chat history:", error);
            setErrorText("Failed to load chat history.");
        }
    };

    const startNewChat = () => {
        setChatId(null);
        setMessages([]);
        setStreamingContent("");
        setErrorText(null);
        setMobileHistoryOpen(false);
    };

    const handleSelectChat = async (selectedChatId: string) => {
        try {
            const chat = await getChat(workspaceId, selectedChatId);
            if (!chat) {
                setErrorText("Selected chat no longer exists.");
                return;
            }
            setChatId(chat.id);
            setMessages(chat.messages || []);
            setMobileHistoryOpen(false);
            setErrorText(null);
        } catch (error) {
            console.error("Failed to load chat:", error);
            setErrorText("Failed to open the selected chat.");
        }
    };

    const handleDeleteChat = async (event: React.MouseEvent, targetChatId: string) => {
        event.stopPropagation();
        if (!window.confirm("Delete this conversation?")) return;

        try {
            await deleteChat(workspaceId, targetChatId);
            if (chatId === targetChatId) {
                startNewChat();
            }
            await loadHistory();
        } catch (error) {
            console.error("Failed to delete chat:", error);
            setErrorText("Failed to delete the conversation.");
        }
    };

    const handleVoiceInput = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setErrorText("Voice input is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.onresult = (event: any) => {
            const transcript = event.results?.[0]?.[0]?.transcript;
            if (transcript) {
                setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
            }
        };
        recognition.onerror = () => {
            setErrorText("Voice input failed. Please try again.");
        };
        recognition.start();
    };

    const handleSend = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput || !user || !workspaceId || isStreaming) return;

        const userMessage: Message = { role: "user", content: trimmedInput };
        const pendingMessages = [...messages, userMessage];

        setMessages(pendingMessages);
        setInput("");
        setIsStreaming(true);
        setStreamingContent("");
        setErrorText(null);

        try {
            let activeChatId = chatId;

            if (!activeChatId) {
                const newChat = await createChat(workspaceId, user.uid, userMessage);
                activeChatId = newChat.id;
                setChatId(newChat.id);
                await loadHistory();
            } else {
                await updateChatMessages(workspaceId, activeChatId, pendingMessages);
            }

            const contextPrefix = includeContext && currentPageTitle
                ? `Current page title: ${currentPageTitle}\n`
                : "";

            const response = await fetchWithAuth("/api/ai/stream", {
                method: "POST",
                body: JSON.stringify({
                    messages: contextPrefix
                        ? [{ role: "system", content: contextPrefix }, ...pendingMessages]
                        : pendingMessages,
                    model,
                    userId: user.uid,
                }),
            });

            if (!response.ok) {
                let errorMessage = `Request failed (${response.status})`;
                try {
                    const data = (await response.json()) as { error?: string };
                    if (data?.error) {
                        errorMessage = data.error;
                    }
                } catch {
                    // Ignore JSON parse errors and use fallback.
                }
                throw new Error(errorMessage);
            }

            if (!response.body) {
                throw new Error("No response body.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffered = "";
            let fullContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffered += decoder.decode(value, { stream: true });
                const lines = buffered.split("\n");
                buffered = lines.pop() ?? "";

                for (const rawLine of lines) {
                    const line = rawLine.trim();
                    if (!line.startsWith("data:")) continue;

                    const payload = line.slice(5).trim();
                    if (!payload || payload === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(payload) as { content?: string };
                        if (parsed.content) {
                            fullContent += parsed.content;
                            setStreamingContent(fullContent);
                        }
                    } catch {
                        // Ignore malformed stream chunks.
                    }
                }
            }

            if (!fullContent.trim()) {
                fullContent = "I could not produce a response this time. Please retry.";
            }

            const assistantMessage: Message = { role: "assistant", content: fullContent };
            const finalMessages = [...pendingMessages, assistantMessage];
            setMessages(finalMessages);

            if (activeChatId) {
                await updateChatMessages(workspaceId, activeChatId, finalMessages);
                await loadHistory();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to send message.";
            console.error("AI message failed:", error);
            setErrorText(errorMessage);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: `Error: ${errorMessage}` },
            ]);
        } finally {
            setIsStreaming(false);
            setStreamingContent("");
        }
    };

    const historyPanel = (
        <div className="flex h-full flex-col">
            <div className="border-b border-[var(--ai-line)] p-4">
                <div className="flex items-center justify-between">
                    {!desktopHistoryCollapsed && (
                        <div>
                            <p className={`${headingFont.className} text-[13px] font-semibold tracking-wide text-slate-100`}>
                                Conversation Dock
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--ai-muted)]">
                                Keep context organized.
                            </p>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setDesktopHistoryCollapsed((prev) => !prev)}
                        className="hidden rounded-lg border border-[var(--ai-line)] p-2 text-[var(--ai-muted)] transition hover:border-cyan-400/60 hover:text-cyan-300 md:inline-flex"
                        title={desktopHistoryCollapsed ? "Expand panel" : "Collapse panel"}
                    >
                        <Menu size={14} />
                    </button>
                </div>

                <button
                    type="button"
                    onClick={startNewChat}
                    className={`mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#22d3ee,#fb923c)] px-4 py-2 text-[13px] font-semibold text-slate-950 transition hover:brightness-110 ${desktopHistoryCollapsed ? "w-10 px-0" : "w-full"
                        }`}
                >
                    <Plus size={14} />
                    {!desktopHistoryCollapsed && "New Chat"}
                </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {history.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--ai-line)] p-3 text-xs text-[var(--ai-muted)]">
                        No conversations yet.
                    </div>
                ) : (
                    history.map((chat) => (
                        <button
                            key={chat.id}
                            type="button"
                            onClick={() => void handleSelectChat(chat.id)}
                            className={`group flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${chat.id === chatId
                                ? "border-cyan-400/60 bg-cyan-500/10"
                                : "border-transparent bg-slate-900/35 hover:border-slate-500/40"
                                }`}
                        >
                            <Bot size={14} className="shrink-0 text-cyan-300" />
                            {!desktopHistoryCollapsed && (
                                <>
                                    <span className="min-w-0 flex-1 truncate text-xs text-slate-200">
                                        {chat.title || "Untitled chat"}
                                    </span>
                                    <span
                                        className="rounded p-1 text-slate-500 opacity-0 transition hover:bg-rose-500/20 hover:text-rose-300 group-hover:opacity-100"
                                        onClick={(event) => void handleDeleteChat(event, chat.id)}
                                        role="button"
                                        aria-label="Delete chat"
                                    >
                                        <Trash2 size={12} />
                                    </span>
                                </>
                            )}
                        </button>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className={`${bodyFont.className} relative h-full min-h-0 overflow-hidden bg-[var(--ai-bg)] text-[var(--ai-text)]`} style={aiTheme}>
            <style jsx>{`
                @keyframes aiFloat {
                    0%,
                    100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-7px);
                    }
                }
                @keyframes aiReveal {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .ai-float {
                    animation: aiFloat 6s ease-in-out infinite;
                }
                .ai-reveal {
                    animation: aiReveal 420ms ease-out both;
                }
            `}</style>

            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-32 left-1/4 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
                <div className="absolute bottom-0 right-[-120px] h-96 w-96 rounded-full bg-orange-400/12 blur-3xl" />
                <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,rgba(34,211,238,0.06),transparent)]" />
            </div>

            {mobileHistoryOpen && (
                <button
                    type="button"
                    aria-label="Close history panel"
                    onClick={() => setMobileHistoryOpen(false)}
                    className="absolute inset-0 z-30 bg-black/55 md:hidden"
                />
            )}

            <aside
                className={`absolute inset-y-0 left-0 z-40 w-[86%] max-w-[320px] border-r border-[var(--ai-line)] bg-[var(--ai-panel-strong)] shadow-2xl backdrop-blur-xl transition-transform md:hidden ${mobileHistoryOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {historyPanel}
            </aside>

            <div className="relative z-10 flex h-full min-h-0">
                <aside
                    className={`hidden h-full border-r border-[var(--ai-line)] bg-[var(--ai-panel)] backdrop-blur-xl md:block ${desktopHistoryCollapsed ? "w-[86px]" : "w-[300px]"
                        }`}
                >
                    {historyPanel}
                </aside>

                <section className="flex min-w-0 flex-1 flex-col">
                    <header className="border-b border-[var(--ai-line)] bg-slate-950/35 px-4 py-3 backdrop-blur-xl md:px-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMobileHistoryOpen(true)}
                                    className="rounded-lg border border-[var(--ai-line)] p-2 text-[var(--ai-muted)] transition hover:border-cyan-400/60 hover:text-cyan-300 md:hidden"
                                >
                                    <Menu size={16} />
                                </button>
                                <div>
                                    <p className={`${headingFont.className} text-base font-semibold tracking-wide text-slate-100 md:text-lg`}>
                                        Studio AI
                                    </p>
                                    <p className={`${monoFont.className} text-[10px] uppercase tracking-[0.12em] text-[var(--ai-muted)]`}>
                                        Focused Workspace Companion
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIncludeContext((prev) => !prev)}
                                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${includeContext
                                        ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-200"
                                        : "border-[var(--ai-line)] text-[var(--ai-muted)] hover:text-slate-300"
                                        }`}
                                >
                                    Context {includeContext ? "On" : "Off"}
                                </button>

                                <div ref={modelMenuRef} className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowModelMenu((prev) => !prev)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ai-line)] bg-slate-900/65 px-2.5 py-1.5 text-xs text-slate-200 transition hover:border-cyan-400/70"
                                    >
                                        <Sparkles size={12} className="text-cyan-300" />
                                        {resolveModelLabel(model)}
                                        <ChevronDown size={12} />
                                    </button>

                                    {showModelMenu && (
                                        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-[var(--ai-line)] bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl">
                                            {MODELS.map((option) => (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setModel(option.id);
                                                        localStorage.setItem("openrouter_model", option.id);
                                                        setShowModelMenu(false);
                                                    }}
                                                    className={`mb-1 block w-full rounded-lg px-3 py-2 text-left text-xs transition last:mb-0 ${model === option.id
                                                        ? "bg-cyan-500/20 text-cyan-100"
                                                        : "text-slate-300 hover:bg-slate-800"
                                                        }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
                        <div className="mx-auto max-w-5xl">
                            {messages.length === 0 ? (
                                <div className="flex min-h-[58vh] flex-col items-center justify-center text-center">
                                    <div className="ai-float mb-6 rounded-2xl border border-cyan-300/35 bg-[linear-gradient(135deg,rgba(34,211,238,0.2),rgba(251,146,60,0.28))] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.32)]">
                                        <Bot size={28} className="text-slate-100" />
                                    </div>
                                    <h2 className={`${headingFont.className} text-2xl font-semibold text-slate-100 md:text-3xl`}>
                                        What are we building next?
                                    </h2>
                                    <p className="mt-3 max-w-xl text-sm text-[var(--ai-muted)] md:text-base">
                                        Ask for strategy, drafting, or task breakdowns. This panel now prioritizes clear structure over decorative noise.
                                    </p>

                                    <div className="mt-10 grid w-full max-w-3xl gap-3 sm:grid-cols-2">
                                        {QUICK_PROMPTS.map((item, index) => (
                                            <button
                                                key={item.title}
                                                type="button"
                                                className="ai-reveal rounded-2xl border border-[var(--ai-line)] bg-[var(--ai-panel)] p-4 text-left transition hover:border-cyan-400/60 hover:bg-slate-900/65"
                                                style={{ animationDelay: `${index * 90}ms` }}
                                                onClick={() => setInput(item.prompt)}
                                            >
                                                <item.icon size={17} className="mb-3 text-cyan-300" />
                                                <p className={`${headingFont.className} text-sm font-semibold text-slate-100`}>
                                                    {item.title}
                                                </p>
                                                <p className="mt-1 text-xs text-[var(--ai-muted)]">
                                                    {item.description}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-5 pb-36">
                                    {messages.map((message, index) => {
                                        const isUser = message.role === "user";
                                        return (
                                            <div key={`${message.role}-${index}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                                <div
                                                    className={`max-w-[88%] rounded-2xl border px-4 py-3 md:max-w-[76%] ${isUser
                                                        ? "border-orange-300/30 bg-[linear-gradient(135deg,rgba(251,146,60,0.95),rgba(245,158,11,0.85))] text-[var(--ai-user-ink)]"
                                                        : "border-[var(--ai-line)] bg-[var(--ai-panel)] text-slate-100"
                                                        }`}
                                                >
                                                    <div
                                                        className={`prose max-w-none text-sm leading-relaxed ${isUser
                                                            ? "prose-p:my-1 prose-strong:text-[var(--ai-user-ink)]"
                                                            : "prose-invert prose-p:my-1 prose-headings:text-slate-100 prose-a:text-cyan-300"
                                                            }`}
                                                    >
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {message.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {isStreaming && streamingContent && (
                                        <div className="flex justify-start">
                                            <div className="max-w-[88%] rounded-2xl border border-cyan-300/35 bg-[var(--ai-panel)] px-4 py-3 md:max-w-[76%]">
                                                <div className="prose prose-invert prose-p:my-1 max-w-none text-sm">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {streamingContent}
                                                    </ReactMarkdown>
                                                </div>
                                                <div className="mt-2 h-1.5 w-20 rounded-full bg-[linear-gradient(90deg,#22d3ee,#fb923c)]" />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>
                    </main>

                    <footer className="border-t border-[var(--ai-line)] bg-slate-950/55 px-4 pb-4 pt-3 backdrop-blur-xl md:px-8">
                        <div className="mx-auto max-w-5xl">
                            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ai-muted)]">
                                <span className="rounded-full border border-[var(--ai-line)] bg-slate-900/55 px-2.5 py-1">
                                    Model: {resolveModelLabel(model)}
                                </span>
                                <span className="rounded-full border border-[var(--ai-line)] bg-slate-900/55 px-2.5 py-1">
                                    {includeContext ? "Context enabled" : "Context disabled"}
                                </span>
                                {currentPageTitle && includeContext && (
                                    <span className="rounded-full border border-[var(--ai-line)] bg-slate-900/55 px-2.5 py-1">
                                        Page: {currentPageTitle}
                                    </span>
                                )}
                            </div>

                            {errorText && (
                                <div className="mb-2 rounded-lg border border-rose-400/30 bg-rose-500/12 px-3 py-2 text-xs text-rose-200">
                                    {errorText}
                                </div>
                            )}

                            <div className="flex items-end gap-2 rounded-2xl border border-[var(--ai-line)] bg-[var(--ai-panel)] px-3 py-2">
                                <textarea
                                    value={input}
                                    onChange={(event) => setInput(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && !event.shiftKey) {
                                            event.preventDefault();
                                            void handleSend();
                                        }
                                    }}
                                    placeholder="Ask for analysis, writing, or execution steps..."
                                    className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={handleVoiceInput}
                                    className="rounded-lg border border-[var(--ai-line)] p-2 text-[var(--ai-muted)] transition hover:border-cyan-400/60 hover:text-cyan-300"
                                    aria-label="Use voice input"
                                >
                                    <Mic size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleSend()}
                                    disabled={!input.trim() || isStreaming}
                                    className={`rounded-lg p-2 transition ${input.trim() && !isStreaming
                                        ? "bg-[linear-gradient(135deg,#22d3ee,#fb923c)] text-slate-950 hover:brightness-110"
                                        : "bg-slate-800 text-slate-500"
                                        }`}
                                    aria-label="Send message"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </footer>
                </section>
            </div>
        </div>
    );
}
