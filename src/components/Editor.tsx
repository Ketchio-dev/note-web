"use client";
import React, { memo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Quote, Heading1, Heading2, Code, CheckSquare, LinkIcon, Highlighter, Minus } from 'lucide-react';

import { SlashCommand, suggestion } from './extensions';

import { forwardRef, useImperativeHandle, useEffect } from 'react';

interface Selection {
    text: string;
    from: number;
    to: number;
}

export interface EditorHandle {
    insertContent: (content: string) => void;
    getHTML: () => string;
}

interface EditorProps {
    content: string;
    onChange?: (html: string) => void;
    onSelection?: (selection: Selection | null) => void;
}

const Editor = forwardRef<EditorHandle, EditorProps>(({ content, onChange, onSelection }, ref) => {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Underline,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline cursor-pointer',
                },
            }),
            Highlight.configure({
                multicolor: true,
            }),
            HorizontalRule,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            Placeholder.configure({
                placeholder: 'Type something... or "/" for commands',
            }),
            SlashCommand.configure({
                suggestion,
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-0 focus:outline-none min-h-[50vh] dark:prose-invert max-w-none',
            },
        },
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },
        onSelectionUpdate: ({ editor }) => {
            if (onSelection) {
                const { from, to } = editor.state.selection;
                const text = editor.state.doc.textBetween(from, to, '');

                if (text && text.length > 0) {
                    onSelection({ text, from, to });
                } else {
                    onSelection(null);
                }
            }
        }
    });

    useImperativeHandle(ref, () => ({
        insertContent: (text: string) => {
            if (editor) {
                editor.chain().focus().insertContent(text).run();
            }
        },
        getHTML: () => editor?.getHTML() || ""
    }));

    if (!editor) {
        return null;
    }

    const ToolbarButton = ({ onClick, isActive, icon: Icon, title }: any) => (
        <button
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition ${isActive ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
        >
            <Icon size={18} />
        </button>
    );

    const addLink = () => {
        const url = window.prompt('Enter URL:');
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };

    return (
        <div className="w-full mt-4 pb-24 relative" >
            {/* Enhanced Toolbar */}
            <div className="flex items-center gap-1 py-2 mb-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#191919] sticky top-0 z-10 flex-wrap transition-colors" >
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    icon={Bold}
                    title="Bold (⌘B)"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    icon={Italic}
                    title="Italic (⌘I)"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive('underline')}
                    icon={UnderlineIcon}
                    title="Underline (⌘U)"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    isActive={editor.isActive('highlight')}
                    icon={Highlighter}
                    title="Highlight"
                />
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    icon={Heading1}
                    title="Heading 1"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    icon={Heading2}
                    title="Heading 2"
                />
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    icon={List}
                    title="Bullet List"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    icon={ListOrdered}
                    title="Numbered List"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                    isActive={editor.isActive('taskList')}
                    icon={CheckSquare}
                    title="Task List"
                />
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
                <ToolbarButton
                    onClick={addLink}
                    isActive={editor.isActive('link')}
                    icon={LinkIcon}
                    title="Add Link"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    icon={Quote}
                    title="Quote"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    icon={Code}
                    title="Code Block"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    isActive={false}
                    icon={Minus}
                    title="Horizontal Rule"
                />
            </div >

            {/* Editor Area */}
            < div className="min-h-[500px] cursor-text" onClick={() => editor.chain().focus().run()}>
                <EditorContent editor={editor} />
            </div >
        </div >
    );
});

Editor.displayName = "Editor";

// Export with memo to prevent unnecessary re-renders
export default memo(Editor, (prevProps, nextProps) => {
    // Only re-render if content changed
    return prevProps.content === nextProps.content;
});
