"use client";

import { Page, updatePage } from '@/lib/workspace';
import { FileText, Circle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ListViewProps {
  workspaceId: string;
  parentPage: Page;
  childPages: Page[];
}

export default function ListView({ workspaceId, parentPage, childPages }: ListViewProps) {
  const router = useRouter();
  const columns = parentPage.properties || [];
  const checkboxProperty = columns.find(c => c.type === 'checkbox');

  return (
    <div className="w-full p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-1">
        {childPages.map(page => {
          const isComplete = checkboxProperty ? page.propertyValues?.[checkboxProperty.id] : false;
          return (
            <div key={page.id} className="group flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 transition cursor-pointer" onClick={() => router.push(`/workspace/${workspaceId}/${page.id}`)}>
              {checkboxProperty && (
                <button onClick={(e) => { e.stopPropagation(); updatePage(page.id, { propertyValues: { ...page.propertyValues, [checkboxProperty.id]: !isComplete } }); }}>
                  {isComplete ? <CheckCircle size={20} className="text-blue-600" /> : <Circle size={20} className="text-gray-400" />}
                </button>
              )}
              <FileText size={16} className="text-gray-400" />
              <div className="flex-1">
                <h3 className={`font-medium ${isComplete ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>{page.title || 'Untitled'}</h3>
              </div>
            </div>
          );
        })}
        {childPages.length === 0 && <div className="text-center py-12 text-gray-500">No items</div>}
      </div>
    </div>
  );
}
