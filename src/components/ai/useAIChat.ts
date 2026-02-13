import { useState, useRef, useEffect, useCallback } from 'react';
import { generateAIContent } from '@/lib/ai';
import { updatePage, Page } from '@/lib/workspace';
import { toast } from 'sonner';
import { Message, AIAction } from '@/types/ai';
import { fetchWithAuth } from '@/lib/client-api';

interface UseAIChatProps {
    workspaceId: string;
    userId: string;
    editorContent: string;
    onInsertContent: (content: string) => void;
    onReplaceContent: (content: string) => void;
    availablePages: Page[];
}

export function useAIChat({
    workspaceId,
    userId,
    editorContent,
    onInsertContent,
    onReplaceContent,
    availablePages
}: UseAIChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [model, setModel] = useState("google/gemini-3.0-pro");
    const [isWebMode, setIsWebMode] = useState(false);
    const [selectedContext, setSelectedContext] = useState<Page[]>([]);

    const handleModelChange = (newModel: string) => {
        setModel(newModel);
        localStorage.setItem("openrouter_model", newModel);
    };

    // Load persisted model on mount
    useEffect(() => {
        const savedModel = localStorage.getItem("openrouter_model");
        if (savedModel) {
            setModel(savedModel);
        }
    }, []);

    const handleSend = useCallback(async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        // Create placeholder for assistant message
        const assistantMsgId = Date.now();
        setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantMsgId }]);

        try {
            // Build context string WITH IDs
            let contextStr = "";
            if (selectedContext.length > 0) {
                contextStr += "Context from referenced pages:\n";
                const formattedContext = selectedContext.map(p => {
                    return "- Page: " + p.title + " (ID: " + p.id + ") \n  Content: " + (p.content || "Empty");
                });
                contextStr += formattedContext.join("\n\n") + "\n\n";
            }
            contextStr += `Current Editor Content: \n${editorContent.substring(0, 1000)}...\n\n`;

            let finalPrompt = `${contextStr}User Query: ${userMsg.content}`;
            if (isWebMode) {
                finalPrompt += "\n\n[Instruction: The user has enabled Web Search Mode. Please use your internal knowledge base to act as if you are searching the web. Provide up-to-date, comprehensive information as if you just browsed the internet.]";
            }

            const sysPrompt = `You are an expert AI coding and note-taking assistant embedded in a modern notion-like workspace.
            
            **Guidelines:**
            1. **Format**: Use clean Markdown.
            2. **Tone**: Be professional, direct, and helpful.
            3. **Tools/Permissions**: You have permission to MODIFY the pages.
               - To **APPEND** to current editor: Use \`:::action { "type": "append", "content": "text" } :::\`
               - To **REPLACE** current editor: Use \`:::action { "type": "replace", "content": "text" } :::\`
               - To **UPDATE** a specific context page: Use \`:::action { "type": "update_page", "pageId": "PAGE_ID_FROM_CONTEXT", "content": "new full content" } :::\`
               - ONLY use these actions if the user explicitly asks to edit, write, fix, or modify.
               - You can execute multiple actions in one response.
            4. **Context**: Use the provided page IDs to target specific pages.
            
            Always aim for clarity and actionable information.`;

            const messages = [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: finalPrompt }
            ];

            // === STREAMING ===
            const response = await fetchWithAuth('/api/ai/stream', {
                method: 'POST',
                body: JSON.stringify({ messages, model, userId })
            });

            if (!response.ok) {
                throw new Error('Failed to start streaming');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';

            if (!reader) {
                throw new Error('No response body');
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();

                        if (data === '[DONE]') continue;

                        try {
                            const json = JSON.parse(data);

                            if (json.error) {
                                throw new Error(json.error);
                            }

                            if (json.content) {
                                accumulatedContent += json.content;

                                // Update message in real-time
                                setMessages(prev => prev.map(msg =>
                                    msg.id === assistantMsgId
                                        ? { ...msg, content: accumulatedContent }
                                        : msg
                                ));
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            // Parse Actions from final content
            let displayContent = accumulatedContent;
            const actionRegex = /:::action\s*({[\s\S]*?})\s*:::/g;
            let match;
            const actionsToExecute: AIAction[] = [];

            while ((match = actionRegex.exec(accumulatedContent)) !== null) {
                try {
                    const actionJson = match[1];
                    const action = JSON.parse(actionJson);
                    actionsToExecute.push(action);
                    displayContent = displayContent.replace(match[0], `__ACTION_EXECUTED:${action.type}__`);
                } catch (e) {
                    console.error("Failed to parse AI action", e);
                }
            }

            // Execute Actions
            for (const action of actionsToExecute) {
                if (action.type === 'append' && action.content) {
                    onInsertContent(action.content);
                } else if (action.type === 'replace' && action.content) {
                    onReplaceContent(action.content);
                } else if (action.type === 'update_page') {
                    if (action.pageId && action.content) {
                        await updatePage(action.pageId, { content: action.content });
                    }
                }
            }

            // Update final message
            setMessages(prev => prev.map(msg =>
                msg.id === assistantMsgId
                    ? { ...msg, content: displayContent }
                    : msg
            ));

        } catch (e: any) {
            console.error("AI Generation Failed", e);
            const errorMessage = e?.message || "알 수 없는 오류가 발생했습니다.";
            toast.error("AI 응답 생성 실패", {
                description: errorMessage
            });
            setMessages(prev => prev.map(msg =>
                msg.id === assistantMsgId
                    ? { ...msg, content: "죄송합니다. 오류가 발생했습니다. API 키가 설정되어 있는지 확인해주세요." }
                    : msg
            ));
        } finally {
            setLoading(false);
        }
    }, [input, selectedContext, editorContent, isWebMode, model, userId, onInsertContent, onReplaceContent]);

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

    return {
        messages,
        setMessages, // Exporting this to allow clearing
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
    };
}
