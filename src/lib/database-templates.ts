export interface DatabaseTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    properties: PropertyTemplate[];
}

interface PropertyTemplate {
    id: string;
    name: string;
    type: 'text' | 'number' | 'select' | 'multi-select' | 'date' | 'checkbox' | 'url' | 'email' | 'phone' | 'person' | 'files' | 'formula' | 'relation' | 'rollup' | 'created_time' | 'created_by' | 'last_edited_time' | 'last_edited_by' | 'progress';
    options?: { id: string; name: string; color: string }[];
    formula?: string;
}

export const DATABASE_TEMPLATES: DatabaseTemplate[] = [
    {
        id: 'empty',
        name: 'Empty database',
        description: 'Start from scratch',
        icon: '📋',
        color: 'gray',
        properties: []
    },
    {
        id: 'tasks-tracker',
        name: 'Tasks Tracker',
        description: 'Stay organized with tasks, your way.',
        icon: '✅',
        color: 'green',
        properties: [
            {
                id: 'task-name',
                name: 'Task name',
                type: 'text'
            },
            {
                id: 'status',
                name: 'Status',
                type: 'select',
                options: [
                    { id: 'not-started', name: 'Not started', color: 'gray' },
                    { id: 'in-progress', name: 'In progress', color: 'blue' },
                    { id: 'done', name: 'Done', color: 'green' }
                ]
            },
            {
                id: 'assignee',
                name: 'Assignee',
                type: 'person'
            },
            {
                id: 'due-date',
                name: 'Due date',
                type: 'date'
            }
        ]
    },
    {
        id: 'projects',
        name: 'Projects',
        description: 'Manage projects start to finish.',
        icon: '📊',
        color: 'blue',
        properties: [
            {
                id: 'project-name',
                name: 'Project name',
                type: 'text'
            },
            {
                id: 'status',
                name: 'Status',
                type: 'select',
                options: [
                    { id: 'not-started', name: 'Not started', color: 'gray' },
                    { id: 'in-progress', name: 'In progress', color: 'blue' },
                    { id: 'done', name: 'Done', color: 'green' }
                ]
            },
            {
                id: 'priority',
                name: 'Priority',
                type: 'select',
                options: [
                    { id: 'low', name: 'Low', color: 'green' },
                    { id: 'medium', name: 'Medium', color: 'yellow' },
                    { id: 'high', name: 'High', color: 'red' }
                ]
            },
            {
                id: 'deadline',
                name: 'Deadline',
                type: 'date'
            },
            {
                id: 'progress',
                name: 'Progress',
                type: 'number'
            }
        ]
    },
    {
        id: 'document-hub',
        name: 'Document Hub',
        description: 'Collaborate on docs in one hub.',
        icon: '📄',
        color: 'red',
        properties: [
            {
                id: 'doc-name',
                name: 'Doc name',
                type: 'text'
            },
            {
                id: 'created-by',
                name: 'Created by',
                type: 'person'
            },
            {
                id: 'created-time',
                name: 'Created time',
                type: 'date'
            },
            {
                id: 'category',
                name: 'Category',
                type: 'select',
                options: [
                    { id: 'design', name: 'Design', color: 'purple' },
                    { id: 'engineering', name: 'Engineering', color: 'blue' },
                    { id: 'marketing', name: 'Marketing', color: 'pink' },
                    { id: 'other', name: 'Other', color: 'gray' }
                ]
            }
        ]
    },
    {
        id: 'meeting-notes',
        name: 'Meeting Notes',
        description: 'Turn meetings into action.',
        icon: '📝',
        color: 'yellow',
        properties: [
            {
                id: 'meeting-name',
                name: 'Meeting name',
                type: 'text'
            },
            {
                id: 'date',
                name: 'Date',
                type: 'date'
            },
            {
                id: 'participants',
                name: 'Participants',
                type: 'person'
            },
            {
                id: 'action-items',
                name: 'Action items',
                type: 'checkbox'
            },
            {
                id: 'notes',
                name: 'Notes',
                type: 'text'
            }
        ]
    },
    {
        id: 'goals-tracker',
        name: 'Goals Tracker',
        description: 'Set team goals, achieve together.',
        icon: '🎯',
        color: 'orange',
        properties: [
            {
                id: 'goal-name',
                name: 'Goal name',
                type: 'text'
            },
            {
                id: 'status',
                name: 'Status',
                type: 'select',
                options: [
                    { id: 'planning', name: 'Planning', color: 'gray' },
                    { id: 'active', name: 'Active', color: 'blue' },
                    { id: 'achieved', name: 'Achieved', color: 'green' },
                    { id: 'missed', name: 'Missed', color: 'red' }
                ]
            },
            {
                id: 'owner',
                name: 'Owner',
                type: 'person'
            },
            {
                id: 'due-date',
                name: 'Due date',
                type: 'date'
            },
            {
                id: 'progress',
                name: 'Progress',
                type: 'number'
            }
        ]
    },
    {
        id: 'brainstorm-session',
        name: 'Brainstorm Session',
        description: 'Spark new ideas together.',
        icon: '💡',
        color: 'brown',
        properties: [
            {
                id: 'idea',
                name: 'Idea',
                type: 'text'
            },
            {
                id: 'created-by',
                name: 'Created by',
                type: 'person'
            },
            {
                id: 'priority',
                name: 'Priority',
                type: 'select',
                options: [
                    { id: 'high', name: 'High', color: 'red' },
                    { id: 'medium', name: 'Medium', color: 'yellow' },
                    { id: 'low', name: 'Low', color: 'green' }
                ]
            },
            {
                id: 'feasibility',
                name: 'Feasibility',
                type: 'select',
                options: [
                    { id: 'easy', name: 'Easy', color: 'green' },
                    { id: 'moderate', name: 'Moderate', color: 'yellow' },
                    { id: 'hard', name: 'Hard', color: 'red' }
                ]
            }
        ]
    }
];

// Helper function to create database from template
export function createDatabaseFromTemplate(template: DatabaseTemplate) {
    return {
        properties: template.properties.map(prop => ({
            ...prop,
            id: crypto.randomUUID() // Generate new IDs for actual use
        }))
    };
}
