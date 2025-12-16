/**
 * Filter Engine - Powerful filtering for database views
 */

import { Page } from './workspace';

export type FilterOperator = 
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'is_empty' | 'is_not_empty'
  | 'greater_than' | 'less_than'
  | 'greater_than_or_equal' | 'less_than_or_equal'
  | 'is_before' | 'is_after'
  | 'is_checked' | 'is_not_checked';

export type FilterCondition = 'AND' | 'OR';

export interface Filter {
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value: any;
}

export interface FilterGroup {
  condition: FilterCondition;
  filters: Filter[];
}

/**
 * Apply filters to pages
 */
export function applyFilters(pages: Page[], filterGroup: FilterGroup): Page[] {
  if (!filterGroup.filters.length) return pages;

  return pages.filter(page => {
    const results = filterGroup.filters.map(filter => {
      const value = page.propertyValues?.[filter.propertyId];
      return evaluateFilter(value, filter.operator, filter.value);
    });

    return filterGroup.condition === 'AND' 
      ? results.every(Boolean) 
      : results.some(Boolean);
  });
}

/**
 * Evaluate a single filter
 */
function evaluateFilter(value: any, operator: FilterOperator, filterValue: any): boolean {
  const strValue = String(value || '').toLowerCase();
  const strFilterValue = String(filterValue || '').toLowerCase();

  switch (operator) {
    case 'equals':
      return value == filterValue;
    case 'not_equals':
      return value != filterValue;
    case 'contains':
      return strValue.includes(strFilterValue);
    case 'not_contains':
      return !strValue.includes(strFilterValue);
    case 'starts_with':
      return strValue.startsWith(strFilterValue);
    case 'ends_with':
      return strValue.endsWith(strFilterValue);
    case 'is_empty':
      return !value || value === '' || (Array.isArray(value) && value.length === 0);
    case 'is_not_empty':
      return !!value && value !== '' && (!Array.isArray(value) || value.length > 0);
    case 'greater_than':
      return Number(value) > Number(filterValue);
    case 'less_than':
      return Number(value) < Number(filterValue);
    case 'greater_than_or_equal':
      return Number(value) >= Number(filterValue);
    case 'less_than_or_equal':
      return Number(value) <= Number(filterValue);
    case 'is_checked':
      return value === true;
    case 'is_not_checked':
      return value !== true;
    case 'is_before':
      return new Date(value) < new Date(filterValue);
    case 'is_after':
      return new Date(value) > new Date(filterValue);
    default:
      return true;
  }
}

/**
 * Get available operators for a property type
 */
export function getOperatorsForType(type: string): { value: FilterOperator; label: string }[] {
  const textOps: { value: FilterOperator; label: string }[] = [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ];

  const numberOps: { value: FilterOperator; label: string }[] = [
    { value: 'equals', label: 'Equals' },
    { value:  'not_equals', label: 'Not equals' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'greater_than_or_equal', label: 'Greater than or equal' },
    { value: 'less_than_or_equal', label: 'Less than or equal' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ];

  const checkboxOps: { value: FilterOperator; label: string }[] = [
    { value: 'is_checked', label: 'Is checked' },
    { value: 'is_not_checked', label: 'Is not checked' },
  ];

  const dateOps: { value: FilterOperator; label: string }[] = [
    { value: 'equals', label: 'Is' },
    { value: 'is_before', label: 'Is before' },
    { value: 'is_after', label: 'Is after' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ];

  switch (type) {
    case 'number':
    case 'formula':
      return numberOps;
    case 'checkbox':
      return checkboxOps;
    case 'date':
      return dateOps;
    case 'select':
    case 'multi-select':
    case 'text':
    case 'email':
    case 'url':
    case 'phone':
    default:
      return textOps;
  }
}
