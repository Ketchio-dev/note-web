"use client";

import { useState } from 'react';
import { Filter, FilterGroup, FilterCondition, getOperatorsForType } from '@/lib/filter-engine';
import { Sort, SortDirection } from '@/lib/sort-engine';
import { Plus, X, ChevronDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

type PropertyType = { id: string; name: string; type: string };

interface DatabaseControlsProps {
  properties: PropertyType[];
  filterGroup: FilterGroup;
  sorts: Sort[];
  onFilterChange: (filterGroup: FilterGroup) => void;
  onSortChange: (sorts: Sort[]) => void;
}

export default function DatabaseControls({ properties, filterGroup, sorts, onFilterChange, onSortChange }: DatabaseControlsProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSorts, setShowSorts] = useState(false);

  const addFilter = () => {
    const newFilter: Filter = { id: crypto.randomUUID(), propertyId: properties[0]?.id || '', operator: 'equals', value: '' };
    onFilterChange({ ...filterGroup, filters: [...filterGroup.filters, newFilter] });
  };

  const updateFilter = (id: string, updates: Partial<Filter>) => {
    onFilterChange({ ...filterGroup, filters: filterGroup.filters.map(f => f.id === id ? { ...f, ...updates } : f) });
  };

  const removeFilter = (id: string) => {
    onFilterChange({ ...filterGroup, filters: filterGroup.filters.filter(f => f.id !== id) });
  };

  const addSort = () => {
    const newSort: Sort = { id: crypto.randomUUID(), propertyId: properties[0]?.id || '', direction: 'ascending' };
    onSortChange([...sorts, newSort]);
  };

  const updateSort = (id: string, updates: Partial<Sort>) => {
    onSortChange(sorts.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSort = (id: string) => {
    onSortChange(sorts.filter(s => s.id !== id));
  };

  const toggleSortDirection = (id: string) => {
    onSortChange(sorts.map(s => s.id === id ? { ...s, direction: s.direction === 'ascending' ? 'descending' : 'ascending' } : s));
  };

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <div className="relative">
        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${filterGroup.filters.length > 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
          Filter {filterGroup.filters.length > 0 && `(${filterGroup.filters.length})`}
          <ChevronDown size={14} />
        </button>
        {showFilters && (
          <div className="absolute top-full left-0 mt-2 w-[600px] bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl z-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Filters</h3>
              <button onClick={() => setShowFilters(false)}><X size={16} /></button>
            </div>
            <div className="space-y-2">
              {filterGroup.filters.map((filter) => {
                const property = properties.find(p => p.id === filter.propertyId);
                const operators = property ? getOperatorsForType(property.type) : [];
                return (
                  <div key={filter.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <select value={filter.propertyId} onChange={(e) => updateFilter(filter.id, { propertyId: e.target.value })} className="flex-1 text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded">
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={filter.operator} onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })} className="flex-1 text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded">
                      {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                    </select>
                    {!['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked'].includes(filter.operator) && (
                      <input type="text" value={filter.value} onChange={(e) => updateFilter(filter.id, { value: e.target.value })} className="flex-1 text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded" placeholder="Value" />
                    )}
                    <button onClick={() => removeFilter(filter.id)}><Trash2 size={14} className="text-red-600" /></button>
                  </div>
                );
              })}
            </div>
            <button onClick={addFilter} className="mt-3 flex items-center gap-1 text-sm text-blue-600 font-medium"><Plus size={14} /> Add filter</button>
          </div>
        )}
      </div>
      <div className="relative">
        <button onClick={() => setShowSorts(!showSorts)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${sorts.length > 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
          Sort {sorts.length > 0 && `(${sorts.length})`}
          <ChevronDown size={14} />
        </button>
        {showSorts && (
          <div className="absolute top-full left-0 mt-2 w-96 bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl z-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Sort</h3>
              <button onClick={() => setShowSorts(false)}><X size={16} /></button>
            </div>
            <div className="space-y-2">
              {sorts.map((sort) => (
                <div key={sort.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                  <select value={sort.propertyId} onChange={(e) => updateSort(sort.id, { propertyId: e.target.value })} className="flex-1 text-sm px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded">
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={() => toggleSortDirection(sort.id)} className="p-1">
                    {sort.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  </button>
                  <button onClick={() => removeSort(sort.id)}><Trash2 size={14} className="text-red-600" /></button>
                </div>
              ))}
            </div>
            <button onClick={addSort} className="mt-3 flex items-center gap-1 text-sm text-blue-600 font-medium"><Plus size={14} /> Add sort</button>
          </div>
        )}
      </div>
    </div>
  );
}
