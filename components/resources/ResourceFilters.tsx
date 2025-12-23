
import React from 'react';
import { Filter } from 'lucide-react';

export type ResourceFilterType = 'all' | 'platform' | 'organization';

interface ResourceFiltersProps {
    currentFilter: ResourceFilterType;
    onFilterChange: (filter: ResourceFilterType) => void;
    activeColorClass?: string;
}

export const ResourceFilters: React.FC<ResourceFiltersProps> = ({
    currentFilter,
    onFilterChange,
    activeColorClass = 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
}) => {
    const inactiveClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700';

    return (
        <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-slate-500" />
            <button
                onClick={() => onFilterChange('all')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentFilter === 'all' ? activeColorClass : inactiveClass}`}
            >
                All Resources
            </button>
            <button
                onClick={() => onFilterChange('platform')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentFilter === 'platform' ? activeColorClass : inactiveClass}`}
            >
                Platform Focused
            </button>
            <button
                onClick={() => onFilterChange('organization')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentFilter === 'organization' ? activeColorClass : inactiveClass}`}
            >
                Our Organization
            </button>
        </div>
    );
};
