"use client";

import { Page } from '@/lib/workspace';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CalendarViewProps {
  workspaceId: string;
  parentPage: Page;
  childPages: Page[];
}

export default function CalendarView({ workspaceId, parentPage, childPages }: CalendarViewProps) {
  const router = useRouter();
  const columns = parentPage.properties || [];
  const dateProperty = columns.find(c => c.type === 'date');
  const [currentDate, setCurrentDate] = useState(new Date());

  if (!dateProperty) {
    return <div className="flex flex-col items-center justify-center h-96 text-gray-500"><p>No Date Property Found</p></div>;
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const pagesByDate: Record<string, Page[]> = {};
  
  childPages.forEach(page => {
    const dateValue = page.propertyValues?.[dateProperty.id];
    if (dateValue) {
      const dateKey = format(new Date(dateValue), 'yyyy-MM-dd');
      if (!pagesByDate[dateKey]) pagesByDate[dateKey] = [];
      pagesByDate[dateKey].push(page);
    }
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 bg-white dark:bg-[#1C1C1C] p-4 rounded-lg">
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}><ChevronLeft size={20} /></button>
        <h2 className="text-xl font-bold">{format(currentDate, 'MMMM yyyy')}</h2>
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}><ChevronRight size={20} /></button>
      </div>
      <div className="bg-white dark:bg-[#1C1C1C] rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
          {weekDays.map(day => <div key={day} className="p-3 text-center text-sm font-semibold bg-gray-50 dark:bg-gray-900">{day}</div>)}
        </div>
        <div className="grid grid-cols-7" style={{ minHeight: '600px' }}>
          {Array.from({ length: monthStart.getDay() }).map((_, idx) => <div key={`empty-${idx}`} className="border-r border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20" />)}
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const pagesForDay = pagesByDate[dateKey] || [];
            const isToday = isSameDay(day, new Date());
            return (
              <div key={dateKey} className={`border-r border-b border-gray-200 dark:border-gray-800 p-2 min-h-[100px] ${isToday ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>
                <div className="space-y-1">
                  {pagesForDay.slice(0, 3).map(page => (
                    <div key={page.id} onClick={() => router.push(`/workspace/${workspaceId}/${page.id}`)} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded cursor-pointer truncate">{page.title || 'Untitled'}</div>
                  ))}
                  {pagesForDay.length > 3 && <div className="text-xs text-gray-500 px-2">+{pagesForDay.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
