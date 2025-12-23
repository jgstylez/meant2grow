
import React from 'react';
import { Plus } from 'lucide-react';

interface ResourceHeaderProps {
    title: string;
    icon: React.ReactNode;
    onManageClick?: () => void;
    manageLabel?: string;
    manageColorClass?: string;
}

export const ResourceHeader: React.FC<ResourceHeaderProps> = ({
    title,
    icon,
    onManageClick,
    manageLabel = "Manage",
    manageColorClass = "bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600"
}) => {
    return (
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                <span className="mr-3">{icon}</span> {title}
            </h2>
            {onManageClick && (
                <button
                    onClick={onManageClick}
                    className={`${manageColorClass} text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors`}
                >
                    <Plus className="w-4 h-4 mr-2" /> {manageLabel}
                </button>
            )}
        </div>
    );
};
