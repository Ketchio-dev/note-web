"use client";

import { Page } from '@/lib/workspace';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface TimelineViewProps {
  workspaceId: string;
  parentPage: Page;
  childPages: Page[];
}

export default function TimelineView({ workspaceId, parentPage, childPages }: TimelineViewProps) {
  const router = useRouter();
  const columns = parentPage.properties || [];
  const startDateProperty = columns.find(c => c.type === 'date' && (c.name.toLowerCase().includes('start') || c.name.toLowerCase() === 'date'));
  const endDateProperty = columns.find(c => c.type === 'date' && c.name.toLowerCase().includes('end'));

  if (!startDateProperty) {
    return <div className="flex flex-col items-center justify-center h-96 text-gray-500"><p>No Date Property Found</p></div>;
  }

  const sortedPages = [...childPages].filter(p => p.propertyValues?.[startDateProperty.id]).sort((a, b) => new Date(a.propertyValues?.[startDateProperty.id]).getTime() - new Date(b.propertyValues?.[startDateProperty.id]).getTime());
  const allDates = sortedPages.flatMap(p => {
    const start = p.propertyValues?.[startDateProperty.id];
    const end = endDateProperty ? p.propertyValues?.[endDateProperty.id] : null;
    return [start, end].filter(Boolean).map(d => new Date(d!).getTime());
  });
  const minDate = allDates.length > 0 ? Math.min(...allDates) : Date.now();
  const maxDate = allDates.length > 0 ? Math.max(...allDates) : Date.now();
  const totalDuration = maxDate - minDate || 1;

  return (
    <div className="w-full p-4 md:p-6 overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="mb-6 bg-white dark:bg-[#1C1C1C] p-4 rounded-lg">
          <h3 className="font-semibold">Timeline: {sortedPages.length} items</h3>
        </div>
        <div className="space-y-3">
          {sortedPages.map(page => {
            const startDate = new Date(page.propertyValues?.[startDateProperty.id]);
            const endDate = endDateProperty && page.propertyValues?.[endDateProperty.id] ? new Date(page.propertyValues[endDateProperty.id]) : startDate;
            const startPos = ((startDate.getTime() - minDate) / totalDuration) * 100;
            const width = Math.max(((endDate.getTime() - startDate.getTime()) / totalDuration) * 100, 2);
            return (
              <div key={page.id}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-48 truncate text-sm font-medium">{page.title || 'Untitled'}</div>
                  <div className="text-xs text-gray-500">{format(startDate, 'MMM d')}</div>
                </div>
                <div className="relative h-10 bg-gray-100 dark:bg-gray-900 rounded">
                  <div className="absolute h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded shadow cursor-pointer" style={{ left: `${startPos}%`, width: `${width}%` }} onClick={() => router.push(`/workspace/${workspaceId}/${page.id}`)}>
                    <div className="h-full flex items-center px-3 text-white text-xs truncate">{page.title || 'Untitled'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {sortedPages.length === 0 && <div className="text-center py-12 text-gray-500">No items with dates</div>}
      </div>
    </div>
  );
}
