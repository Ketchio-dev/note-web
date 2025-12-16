/**
 * Sort Engine - Sorting for database views
 */

import { Page } from './workspace';

export type SortDirection = 'ascending' | 'descending';

export interface Sort {
  id: string;
  propertyId: string;
  direction: SortDirection;
}

/**
 * Apply multiple sorts to pages
 */
export function applySorts(pages: Page[], sorts: Sort[]): Page[] {
  if (!sorts.length) return pages;

  return [...pages].sort((a, b) => {
    for (const sort of sorts) {
      const aValue = a.propertyValues?.[sort.propertyId];
      const bValue = b.propertyValues?.[sort.propertyId];
      
      const comparison = compareValues(aValue, bValue);
      
      if (comparison !== 0) {
        return sort.direction === 'ascending' ? comparison : -comparison;
      }
    }
    return 0;
  });
}

/**
 * Compare two values
 */
function compareValues(a: any, b: any): number {
  // Handle null/undefined
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  // Handle numbers
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  // Handle strings (case-insensitive)
  const aStr = String(a).toLowerCase();
  const bStr = String(b).toLowerCase();
  
  return aStr.localeCompare(bStr);
}

/**
 * Group pages by property value
 */
export interface GroupedPages {
  [key: string]: Page[];
}

export function groupPages(pages: Page[], propertyId: string): GroupedPages {
  const grouped: GroupedPages = {};

  pages.forEach(page => {
    const value = page.propertyValues?.[propertyId];
    const key = value != null ? String(value) : '__none__';

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(page);
  });

  return grouped;
}
