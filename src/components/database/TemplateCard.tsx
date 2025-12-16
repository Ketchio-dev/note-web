"use client";

import { DatabaseTemplate } from '@/lib/database-templates';

interface TemplateCardProps {
    template: DatabaseTemplate;
    onClick: () => void;
}

const COLOR_CLASSES: Record<string, string> = {
    gray: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    green: 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    blue: 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    red: 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    orange: 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    purple: 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    pink: 'bg-pink-100 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
    brown: 'bg-amber-100 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
};

export default function TemplateCard({ template, onClick }: TemplateCardProps) {
    const colorClass = COLOR_CLASSES[template.color] || COLOR_CLASSES.gray;

    return (
        <button
            onClick={onClick}
            className="group relative p-4 rounded-lg border-2 text-left transition-all hover:shadow-lg hover:scale-[1.02] bg-white dark:bg-[#1C1C1C] border-gray-200 dark:border-gray-800 hover:border-blue-500"
        >
            {/* Icon Badge */}
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg text-2xl mb-3 ${colorClass} border`}>
                {template.icon}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {template.name}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {template.description}
            </p>

            {/* Preview */}
            {template.properties.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="space-y-1.5">
                        {template.properties.slice(0, 3).map((prop, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                <span>{prop.name}</span>
                                <span className="text-gray-400">·</span>
                                <span className="text-gray-500">{prop.type}</span>
                            </div>
                        ))}
                        {template.properties.length > 3 && (
                            <div className="text-xs text-gray-400 pl-3.5">
                                +{template.properties.length - 3} more
                            </div>
                        )}
                    </div>
                </div>
            )}
        </button>
    );
}
