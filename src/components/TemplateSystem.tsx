/**
 * Template System
 * Reusable page and block templates for productivity
 */

"use client";

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { FileText, CheckSquare, Calendar, ListTodo, Briefcase, BookOpen, Target, X } from 'lucide-react';
import { Block, createBlock } from '@/lib/block-model';

export interface Template {
    id: string;
    name: string;
    description: string;
    icon: any;
    category: 'productivity' | 'personal' | 'work' | 'education';
    blocks: Partial<Block>[];
}

export const BUILTIN_TEMPLATES: Template[] = [
    {
        id: 'meeting-notes',
        name: 'Meeting Notes',
        description: 'Structured template for meeting minutes',
        icon: Briefcase,
        category: 'work',
        blocks: [
            { type: 'heading_1', content: { type: 'heading', content: [{ type: 'text', text: '📅 Meeting Notes' }] } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: 'Details' }] } },
            { type: 'paragraph', content: { type: 'paragraph', content: [{ type: 'text', text: 'Date: ' }] } },
            { type: 'paragraph', content: { type: 'paragraph', content: [{ type: 'text', text: 'Attendees: ' }] } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: 'Agenda' }] } },
            { type: 'bulleted_list_item', content: { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Topic 1' }] }] } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: 'Action Items' }] } },
            { type: 'todo', content: { type: 'taskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Action item' }] }] }, properties: { checked: false } },
        ],
    },
    {
        id: 'project-plan',
        name: 'Project Plan',
        description: 'Comprehensive project planning template',
        icon: Target,
        category: 'work',
        blocks: [
            { type: 'heading_1', content: { type: 'heading', content: [{ type: 'text', text: '🎯 Project Plan' }] } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: 'Overview' }] } },
            { type: 'paragraph', content: { type: 'paragraph', content: [{ type: 'text', text: 'Project description and goals' }] } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: 'Milestones' }] } },
            { type: 'todo', content: { type: 'taskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Milestone 1' }] }] }, properties: { checked: false } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: 'Resources' }] } },
            { type: 'bulleted_list_item', content: { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Resource' }] }] } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: 'Timeline' }] } },
        ],
    },
    {
        id: 'daily-journal',
        name: 'Daily Journal',
        description: 'Daily reflection and planning',
        icon: BookOpen,
        category: 'personal',
        blocks: [
            { type: 'heading_1', content: { type: 'heading', content: [{ type: 'text', text: '📔 Daily Journal' }] } },
            { type: 'paragraph', content: { type: 'paragraph', content: [{ type: 'text', text: `Date: ${new Date().toLocaleDateString()}` }] } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: '🌅 Morning' }] } },
            { type: 'paragraph', content: { type: 'paragraph', content: [{ type: 'text', text: 'How do I feel today?' }] } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: '🎯 Today\'s Goals' }] } },
            { type: 'todo', content: { type: 'taskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Goal 1' }] }] }, properties: { checked: false } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: '✨ Highlights' }] } },
            { type: 'paragraph', content: { type: 'paragraph', content: [{ type: 'text', text: 'What went well today?' }] } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: '💭 Reflections' }] } },
        ],
    },
    {
        id: 'study-notes',
        name: 'Study Notes',
        description: 'Organized notes for studying',
        icon: BookOpen,
        category: 'education',
        blocks: [
            { type: 'heading_1', content: { type: 'heading', content: [{ type: 'text', text: '📚 Study Notes' }] } },
            { type: 'paragraph', content: { type: 'paragraph', content: [{ type: 'text', text: 'Subject: ' }] } },
            { type: 'paragraph', content: { type: 'paragraph', content: [{ type: 'text', text: 'Date: ' }] } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: 'Key Concepts' }] } },
            { type: 'bulleted_list_item', content: { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Concept' }] }] } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: 'Examples' }] } },
            { type: 'code', content: { type: 'codeBlock', content: [{ type: 'text', text: 'Example code' }] } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: 'Practice Questions' }] } },
            { type: 'todo', content: { type: 'taskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Question 1' }] }] }, properties: { checked: false } },
        ],
    },
    {
        id: 'todo-list',
        name: 'Todo List',
        description: 'Simple task list',
        icon: CheckSquare,
        category: 'productivity',
        blocks: [
            { type: 'heading_1', content: { type: 'heading', content: [{ type: 'text', text: '✅ Todo List' }] } },
            { type: 'todo', content: { type: 'taskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 1' }] }] }, properties: { checked: false } },
            { type: 'todo', content: { type: 'taskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 2' }] }] }, properties: { checked: false } },
            { type: 'todo', content: { type: 'taskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 3' }] }] }, properties: { checked: false } },
        ],
    },
    {
        id: 'weekly-planner',
        name: 'Weekly Planner',
        description: 'Plan your week ahead',
        icon: Calendar,
        category: 'productivity',
        blocks: [
            { type: 'heading_1', content: { type: 'heading', content: [{ type: 'text', text: '📅 Weekly Planner' }] } },
            { type: 'paragraph', content: { type: 'paragraph', content: [{ type: 'text', text: 'Week of: ' }] } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: '🎯 Week Goals' }] } },
            { type: 'todo', content: { type: 'taskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Goal 1' }] }] }, properties: { checked: false } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: 'Monday' }] } },
            { type: 'todo', content: { type: 'taskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task' }] }] }, properties: { checked: false } },
            { type: 'heading_2', content: { type: 'heading', content: [{ type: 'text', text: 'Tuesday' }] } },
            { type: 'todo', content: { type: 'taskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task' }] }] }, properties: { checked: false } },
        ],
    },
];

interface TemplateSystemProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (template: Template) => void;
    workspaceId: string;
}

export default function TemplateSystem({ isOpen, onClose, onSelect, workspaceId }: TemplateSystemProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const filteredTemplates = BUILTIN_TEMPLATES.filter(
        template => selectedCategory === 'all' || template.category === selectedCategory
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h2 className="text-xl font-semibold">Choose a Template</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Start with a pre-made structure
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Category Filter */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex gap-2 overflow-x-auto">
                        <CategoryButton
                            active={selectedCategory === 'all'}
                            onClick={() => setSelectedCategory('all')}
                        >
                            All Templates
                        </CategoryButton>
                        <CategoryButton
                            active={selectedCategory === 'productivity'}
                            onClick={() => setSelectedCategory('productivity')}
                        >
                            Productivity
                        </CategoryButton>
                        <CategoryButton
                            active={selectedCategory === 'work'}
                            onClick={() => setSelectedCategory('work')}
                        >
                            Work
                        </CategoryButton>
                        <CategoryButton
                            active={selectedCategory === 'personal'}
                            onClick={() => setSelectedCategory('personal')}
                        >
                            Personal
                        </CategoryButton>
                        <CategoryButton
                            active={selectedCategory === 'education'}
                            onClick={() => setSelectedCategory('education')}
                        >
                            Education
                        </CategoryButton>
                    </div>
                </div>

                {/* Templates Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTemplates.map(template => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onClick={() => {
                                    onSelect(template);
                                    onClose();
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CategoryButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${active
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
        >
            {children}
        </button>
    );
}

function TemplateCard({ template, onClick }: { template: Template; onClick: () => void }) {
    const Icon = template.icon;

    return (
        <button
            onClick={onClick}
            className="text-left p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition group"
        >
            <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition">
                    <Icon size={24} className="text-blue-600" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
                </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
                {template.blocks.length} blocks
            </div>
        </button>
    );
}

/**
 * Create page from template
 */
export async function createPageFromTemplate(
    template: Template,
    workspaceId: string,
    userId: string,
    parentId?: string
): Promise<string | null> {
    try {
        // Create page
        const pageRef = await addDoc(collection(db, 'pages'), {
            title: template.name,
            type: 'page',
            workspaceId,
            userId,
            parentId: parentId || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        const pageId = pageRef.id;

        // Create blocks from template
        for (let i = 0; i < template.blocks.length; i++) {
            const templateBlock = template.blocks[i];
            const block = createBlock(
                templateBlock.type || 'paragraph',
                pageId,
                userId,
                templateBlock.content,
                null,
                generatePosition(i)
            );

            // Merge template properties
            if (templateBlock.properties) {
                block.properties = { ...block.properties, ...templateBlock.properties };
            }

            await addDoc(collection(db, 'blocks'), block);
        }

        return pageId;
    } catch (error) {
        console.error('Failed to create page from template:', error);
        return null;
    }
}

function generatePosition(index: number): string {
    const base62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    let num = index;

    if (num === 0) return 'a0';

    while (num > 0) {
        result = base62[num % 62] + result;
        num = Math.floor(num / 62);
    }

    return 'a' + result;
}
