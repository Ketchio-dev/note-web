"use client";

import { use, useEffect, useRef, useState } from "react";
import {
    ChevronDown,
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

const MODELS = [
    { id: "anthropic/claude-4.5-sonnet", label: "Claude 4.5 Sonnet" },
    { id: "anthropic/claude-4.5-opus", label: "Claude 4.5 Opus" },
    { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { id: "google/gemini-3.0-pro", label: "Gemini 3.0 Pro" },
    { id: "openai/gpt-5.2", label: "GPT-5.2" },
] as const;

const QUICK_PROMPTS = [
    "이번 주 핵심 업무를 우선순위대로 정리해줘.",
    "이 노트들 기반으로 회의 안건을 5개 뽑아줘.",
    "프로젝트 계획을 단계별 체크리스트로 바꿔줘.",
    "짧고 명확한 제안서 초안을 작성해줘.",
];

function modelLabel(modelId: string): string {
    const found = MODELS.find((m) => m.id === modelId);
    return found?.label ?? modelId;
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
    const [includeContext, setIncludeContext] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [errorText, setErrorText] = useState<string | null>(null);
    const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
    const [currentPageTitle, setCurrentPageTitle] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const modelMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const stored = localStorage.getItem("openrouter_model");
        if (stored && MODELS.some((m) => m.id === stored)) {
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
    }, [messages, streamingContent]);

    useEffect(() => {
        if (!showModelMenu) return;
        const onMouseDown = (event: MouseEvent) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
                setShowModelMenu(false);
            }
        };
        document.addEventListener("mousedown", onMouseDown);
        return () => document.removeEventListener("mousedown", onMouseDown);
    }, [showModelMenu]);

    const loadHistory = async () => {
        try {
            const chats = await getWorkspaceChats(workspaceId);
            setHistory(chats);
        } catch (error) {
            console.error("Failed to load history:", error);
            setErrorText("대화 목록을 불러오지 못했습니다.");
        }
    };

    const startNewChat = () => {
        setChatId(null);
        setMessages([]);
        setInput("");
        setStreamingContent("");
        setErrorText(null);
        setMobileHistoryOpen(false);
    };

    const selectChat = async (id: string) => {
        try {
            const chat = await getChat(workspaceId, id);
            if (!chat) {
                setErrorText("선택한 대화를 찾을 수 없습니다.");
                return;
            }
            setChatId(id);
            setMessages(chat.messages ?? []);
            setMobileHistoryOpen(false);
            setErrorText(null);
        } catch (error) {
            console.error("Failed to load chat:", error);
            setErrorText("대화를 여는 데 실패했습니다.");
        }
    };

    const removeChat = async (event: React.MouseEvent, id: string) => {
        event.stopPropagation();
        if (!window.confirm("이 대화를 삭제할까요?")) return;

        try {
            await deleteChat(workspaceId, id);
            if (chatId === id) {
                startNewChat();
            }
            await loadHistory();
        } catch (error) {
            console.error("Failed to delete chat:", error);
            setErrorText("대화 삭제에 실패했습니다.");
        }
    };

    const useVoiceInput = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setErrorText("이 브라우저에서는 음성 입력을 지원하지 않습니다.");
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
            setErrorText("음성 인식에 실패했습니다.");
        };
        recognition.start();
    };

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || !user || isStreaming) return;

        const userMessage: Message = { role: "user", content: text };
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

            const contextLine =
                includeContext && currentPageTitle ? `Current page title: ${currentPageTitle}\n` : "";

            const response = await fetchWithAuth("/api/ai/stream", {
                method: "POST",
                body: JSON.stringify({
                    messages: contextLine
                        ? [{ role: "system", content: contextLine }, ...pendingMessages]
                        : pendingMessages,
                    model,
                    userId: user.uid,
                }),
            });

            if (!response.ok) {
                let message = `요청 실패 (${response.status})`;
                try {
                    const data = (await response.json()) as { error?: string };
                    if (data?.error) message = data.error;
                } catch {
                    // ignore parse errors
                }
                throw new Error(message);
            }

            if (!response.body) {
                throw new Error("응답 본문이 없습니다.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

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
                        // ignore malformed chunk
                    }
                }
            }

            const assistantMessage: Message = {
                role: "assistant",
                content: fullContent || "응답을 생성하지 못했습니다. 다시 시도해주세요.",
            };
            const finalMessages = [...pendingMessages, assistantMessage];
            setMessages(finalMessages);

            if (activeChatId) {
                await updateChatMessages(workspaceId, activeChatId, finalMessages);
                await loadHistory();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "메시지 전송에 실패했습니다.";
            console.error("AI send failed:", error);
            setErrorText(message);
            setMessages((prev) => [...prev, { role: "assistant", content: `오류: ${message}` }]);
        } finally {
            setIsStreaming(false);
            setStreamingContent("");
        }
    };

    const historyPanel = (
        <div className="flex h-full flex-col">
            <div className="border-b border-[#e7e7e4] p-4 dark:border-[#2b2b2b]">
                <p className="text-xs font-medium uppercase tracking-wider text-[#8d8c87] dark:text-[#9b9b95]">
                    Conversations
                </p>
                <button
                    type="button"
                    onClick={startNewChat}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#e0e0dc] bg-white px-3 py-2 text-sm font-medium text-[#37352f] transition hover:bg-[#f7f7f5] dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-[#e7e6e3] dark:hover:bg-[#252525]"
                >
                    <Plus size={14} />
                    New chat
                </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-3">
                {history.length === 0 ? (
                    <div className="rounded-md border border-dashed border-[#e3e3df] p-3 text-xs text-[#8d8c87] dark:border-[#343434] dark:text-[#9d9d96]">
                        아직 저장된 대화가 없습니다.
                    </div>
                ) : (
                    history.map((chat) => (
                        <button
                            key={chat.id}
                            type="button"
                            onClick={() => void selectChat(chat.id)}
                            className={`group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition ${chat.id === chatId
                                ? "bg-[#ecebe8] text-[#222] dark:bg-[#2a2a2a] dark:text-[#f0efe9]"
                                : "text-[#5f5e58] hover:bg-[#f2f2ef] dark:text-[#b7b6b1] dark:hover:bg-[#252525]"
                                }`}
                        >
                            <Sparkles size={13} className="shrink-0 text-[#9b9a96] dark:text-[#8f8e8a]" />
                            <span className="min-w-0 flex-1 truncate">{chat.title || "Untitled chat"}</span>
                            <span
                                className="rounded p-1 opacity-0 transition group-hover:opacity-100 hover:bg-[#e6e6e2] dark:hover:bg-[#333]"
                                onClick={(event) => void removeChat(event, chat.id)}
                                role="button"
                                aria-label="Delete chat"
                            >
                                <Trash2 size={12} />
                            </span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="relative flex h-full min-h-0 bg-[#f7f7f5] text-[#37352f] dark:bg-[#191919] dark:text-[#ecebe8]">
            {mobileHistoryOpen && (
                <button
                    type="button"
                    aria-label="Close conversation panel"
                    onClick={() => setMobileHistoryOpen(false)}
                    className="absolute inset-0 z-30 bg-black/35 md:hidden"
                />
            )}

            <aside
                className={`absolute inset-y-0 left-0 z-40 w-[86%] max-w-[300px] border-r border-[#e3e3df] bg-[#fbfbfa] transition-transform dark:border-[#2b2b2b] dark:bg-[#1f1f1f] md:static md:z-auto md:w-[290px] ${mobileHistoryOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                    }`}
            >
                {historyPanel}
            </aside>

            <section className="flex min-w-0 flex-1 flex-col">
                <header className="border-b border-[#e6e6e2] bg-[#fdfdfc] px-4 py-3 dark:border-[#2a2a2a] dark:bg-[#1b1b1b] md:px-6">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMobileHistoryOpen(true)}
                                className="rounded-md border border-[#dfdfda] p-2 text-[#7a7972] md:hidden dark:border-[#333] dark:text-[#a6a59f]"
                            >
                                <Menu size={15} />
                            </button>
                            <div>
                                <p className="text-[15px] font-semibold">Ask AI</p>
                                <p className="text-[11px] text-[#9b9a96] dark:text-[#9d9c97]">
                                    Simple workspace assistant
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIncludeContext((prev) => !prev)}
                                className={`rounded-md border px-2.5 py-1 text-xs transition ${includeContext
                                    ? "border-[#cfcfc9] bg-[#f0efeb] text-[#4f4e49] dark:border-[#3a3a3a] dark:bg-[#282828] dark:text-[#d3d2ce]"
                                    : "border-[#dfdfda] bg-white text-[#8f8e89] dark:border-[#333] dark:bg-[#1f1f1f] dark:text-[#9f9e98]"
                                    }`}
                            >
                                Context {includeContext ? "On" : "Off"}
                            </button>

                            <div ref={modelMenuRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowModelMenu((prev) => !prev)}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-[#dfdfda] bg-white px-2.5 py-1 text-xs text-[#52514c] dark:border-[#333] dark:bg-[#1f1f1f] dark:text-[#d0cfca]"
                                >
                                    {modelLabel(model)}
                                    <ChevronDown size={12} />
                                </button>

                                {showModelMenu && (
                                    <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-md border border-[#e3e3df] bg-white p-1 shadow-lg dark:border-[#333] dark:bg-[#202020]">
                                        {MODELS.map((option) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => {
                                                    setModel(option.id);
                                                    localStorage.setItem("openrouter_model", option.id);
                                                    setShowModelMenu(false);
                                                }}
                                                className={`block w-full rounded px-2 py-1.5 text-left text-xs transition ${model === option.id
                                                    ? "bg-[#efefec] text-[#282824] dark:bg-[#2d2d2d] dark:text-[#f1f0ec]"
                                                    : "text-[#5f5e58] hover:bg-[#f6f6f3] dark:text-[#b8b7b2] dark:hover:bg-[#282828]"
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
                    <div className="mx-auto max-w-3xl">
                        {messages.length === 0 ? (
                            <div className="flex min-h-[52vh] flex-col items-center justify-center text-center">
                                <div className="mb-4 rounded-md border border-[#e3e3df] bg-white p-3 text-[#8b8a84] dark:border-[#333] dark:bg-[#222] dark:text-[#a4a39e]">
                                    <Search size={18} />
                                </div>
                                <h2 className="text-2xl font-semibold tracking-tight text-[#2f2e2a] dark:text-[#eeede9]">
                                    무엇을 도와줄까?
                                </h2>
                                <p className="mt-2 max-w-lg text-sm text-[#8d8c87] dark:text-[#9f9e98]">
                                    화려한 UI 대신, 빠르고 명확하게 답하는 구조로 바꿨다.
                                </p>

                                <div className="mt-8 grid w-full gap-2">
                                    {QUICK_PROMPTS.map((prompt) => (
                                        <button
                                            key={prompt}
                                            type="button"
                                            onClick={() => setInput(prompt)}
                                            className="rounded-md border border-[#e2e2dd] bg-white px-3 py-2 text-left text-sm text-[#4e4d48] transition hover:bg-[#f6f6f3] dark:border-[#333] dark:bg-[#202020] dark:text-[#d2d1cd] dark:hover:bg-[#252525]"
                                        >
                                            {prompt}
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
                                                className={`max-w-[88%] rounded-lg border px-3 py-2 md:max-w-[76%] ${isUser
                                                    ? "border-[#e1e0db] bg-[#efeeea] text-[#2f2d29] dark:border-[#3a3a3a] dark:bg-[#2a2a2a] dark:text-[#eeede8]"
                                                    : "border-[#e2e2dd] bg-white text-[#37352f] dark:border-[#333] dark:bg-[#212121] dark:text-[#e8e7e3]"
                                                    }`}
                                            >
                                                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2">
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
                                        <div className="max-w-[88%] rounded-lg border border-[#e2e2dd] bg-white px-3 py-2 md:max-w-[76%] dark:border-[#333] dark:bg-[#212121]">
                                            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {streamingContent}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                </main>

                <footer className="border-t border-[#e5e5e1] bg-[#fafaf8] px-4 py-3 dark:border-[#2a2a2a] dark:bg-[#1b1b1b] md:px-8">
                    <div className="mx-auto max-w-3xl">
                        {errorText && (
                            <div className="mb-2 rounded-md border border-[#efc0c0] bg-[#fff4f4] px-3 py-2 text-xs text-[#8e3f3f] dark:border-[#5b3434] dark:bg-[#2a1b1b] dark:text-[#ebb4b4]">
                                {errorText}
                            </div>
                        )}

                        <div className="mb-2 flex flex-wrap gap-2 text-[11px] text-[#9b9a96] dark:text-[#9f9e98]">
                            <span className="rounded-full border border-[#e1e1dd] bg-white px-2 py-0.5 dark:border-[#343434] dark:bg-[#212121]">
                                {modelLabel(model)}
                            </span>
                            {includeContext && currentPageTitle && (
                                <span className="rounded-full border border-[#e1e1dd] bg-white px-2 py-0.5 dark:border-[#343434] dark:bg-[#212121]">
                                    {currentPageTitle}
                                </span>
                            )}
                        </div>

                        <div className="flex items-end gap-2 rounded-md border border-[#e0e0dc] bg-white px-2 py-2 dark:border-[#333] dark:bg-[#202020]">
                            <textarea
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && !event.shiftKey) {
                                        event.preventDefault();
                                        void sendMessage();
                                    }
                                }}
                                placeholder="메시지를 입력하세요..."
                                className="min-h-[38px] max-h-32 flex-1 resize-none bg-transparent px-2 py-1 text-sm text-[#37352f] placeholder:text-[#9b9a96] outline-none dark:text-[#ecebe7] dark:placeholder:text-[#8f8e89]"
                            />
                            <button
                                type="button"
                                onClick={useVoiceInput}
                                className="rounded p-2 text-[#8f8e89] transition hover:bg-[#f3f3f0] hover:text-[#5f5e59] dark:text-[#9e9d98] dark:hover:bg-[#2a2a2a] dark:hover:text-[#d4d3ce]"
                                aria-label="Voice input"
                            >
                                <Mic size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => void sendMessage()}
                                disabled={!input.trim() || isStreaming}
                                className={`rounded p-2 transition ${input.trim() && !isStreaming
                                    ? "bg-[#2f2f2b] text-white hover:bg-[#21211f] dark:bg-[#e7e6e2] dark:text-[#1a1a18] dark:hover:bg-white"
                                    : "bg-[#efefec] text-[#a2a19b] dark:bg-[#2a2a2a] dark:text-[#6f6e68]"
                                    }`}
                                aria-label="Send"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </footer>
            </section>
        </div>
    );
}
