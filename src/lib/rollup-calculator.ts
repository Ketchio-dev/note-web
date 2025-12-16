/**
 * Rollup Calculator - Automatic aggregations from related pages
 */

import { Page } from './workspace';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export type RollupFunction = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'show_original';

export interface RollupProperty {
    rollupRelation: string; // Relation property ID
    rollupProperty: string; // Property ID to aggregate
    rollupFunction: RollupFunction;
}

/**
 * Calculate rollup value for a page
 */
export async function calculateRollup(
    page: Page,
    rollupProperty: RollupProperty
): Promise<number | string> {
    try {
        // 1. Find the relation property
        const relationProp = page.properties?.find(
            p => p.id === rollupProperty.rollupRelation
        );

        if (!relationProp || relationProp.type !== 'relation') {
            return 0;
        }

        // 2. Get related page IDs
        const relatedPageIds = page.propertyValues?.[relationProp.id];

        if (!Array.isArray(relatedPageIds) || relatedPageIds.length === 0) {
            return rollupProperty.rollupFunction === 'count' ? 0 : 0;
        }

        // 3. Fetch related pages
        const relatedPages = await Promise.all(
            relatedPageIds.map(async (id) => {
                try {
                    const pageDoc = await getDoc(doc(db, 'pages', id));
                    if (pageDoc.exists()) {
                        return { id: pageDoc.id, ...pageDoc.data() } as Page;
                    }
                    return null;
                } catch (e) {
                    console.error(`Failed to fetch page ${id}:`, e);
                    return null;
                }
            })
        );

        const validPages = relatedPages.filter((p): p is Page => p !== null);

        if (validPages.length === 0) {
            return rollupProperty.rollupFunction === 'count' ? 0 : 0;
        }

        // 4. Extract values from the rollup property
        const values = validPages
            .map(p => p.propertyValues?.[rollupProperty.rollupProperty])
            .filter(v => v != null && v !== '')
            .map(v => {
                // Convert to number for numeric operations
                const num = Number(v);
                return isNaN(num) ? 0 : num;
            });

        // 5. Apply aggregation function
        switch (rollupProperty.rollupFunction) {
            case 'count':
                return validPages.length;

            case 'sum':
                return values.reduce((a, b) => a + b, 0);

            case 'avg':
                return values.length > 0
                    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
                    : 0;

            case 'max':
                return values.length > 0 ? Math.max(...values) : 0;

            case 'min':
                return values.length > 0 ? Math.min(...values) : 0;

            case 'show_original':
                // Show first value or count
                return values[0] || validPages.length;

            default:
                return 0;
        }
    } catch (error) {
        console.error('Rollup calculation error:', error);
        return 0;
    }
}

/**
 * Format rollup result for display
 */
export function formatRollupResult(value: number | string, fn: RollupFunction): string {
    if (fn === 'count') {
        return `${value} items`;
    }

    if (typeof value === 'number') {
        if (fn === 'avg') {
            return value.toFixed(2);
        }
        return value.toString();
    }

    return String(value);
}
