/**
 * Shared Constants
 * Centralized constants to prevent duplication
 */

import { LucideIcon } from 'lucide-react';

export const COLORS = [
    { id: 'gray', name: 'Gray', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-200' },
    { id: 'brown', name: 'Brown', bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-800 dark:text-amber-200' },
    { id: 'orange', name: 'Orange', bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-200' },
    { id: 'yellow', name: 'Yellow', bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200' },
    { id: 'green', name: 'Green', bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200' },
    { id: 'blue', name: 'Blue', bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200' },
    { id: 'purple', name: 'Purple', bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200' },
    { id: 'pink', name: 'Pink', bg: 'bg-pink-100 dark:bg-pink-900', text: 'text-pink-800 dark:text-pink-200' },
    { id: 'red', name: 'Red', bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200' },
] as const;

export type ColorId = typeof COLORS[number]['id'];

export interface ColorConfig {
    id: ColorId;
    name: string;
    bg: string;
    text: string;
}

/**
 * Performance thresholds
 */
export const PERFORMANCE = {
    LONG_TASK_THRESHOLD_MS: 50,
    DEBOUNCE_DEFAULT_MS: 300,
    THROTTLE_DEFAULT_MS: 100,
} as const;

/**
 * UI defaults
 */
export const UI_DEFAULTS = {
    MAX_ACTIVITY_ITEMS: 50,
    MAX_SEARCH_RESULTS: 20,
    TOAST_DURATION_MS: 3000,
} as const;

/**
 * Icon type helper
 */
export type IconComponent = LucideIcon;
