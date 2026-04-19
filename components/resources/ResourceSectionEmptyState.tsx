
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ResourceSectionEmptyStateProps {
  icon: LucideIcon;
  iconClassName?: string;
  iconWrapClassName?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    className?: string;
  };
}

export const ResourceSectionEmptyState: React.FC<ResourceSectionEmptyStateProps> = ({
  icon: Icon,
  iconClassName = 'text-slate-400 dark:text-slate-500',
  iconWrapClassName = 'bg-slate-100 dark:bg-slate-800/80',
  title,
  description,
  action,
}) => {
  return (
    <div
      className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 px-8 py-14 text-center max-w-lg mx-auto"
      role="status"
    >
      <div
        className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${iconWrapClassName}`}
      >
        <Icon className={`h-7 w-7 ${iconClassName}`} aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={
            action.className ??
            'mt-6 inline-flex items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors'
          }
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
