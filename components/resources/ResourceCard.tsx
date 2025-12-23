
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { CARD_CLASS } from '../../styles/common';
import { Resource } from '../../types';

interface ResourceCardProps {
    resource: Resource | any;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
    return (
        <div className={CARD_CLASS + " hover:shadow-md transition-shadow group flex flex-col"}>
            <div className="flex items-start justify-between mb-4">
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${resource.type === 'Article' ? 'bg-blue-100 text-blue-800' :
                        resource.type === 'Book' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                    {resource.type}
                </span>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">{resource.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex-1">{resource.description}</p>
            <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-emerald-600 hover:underline mt-auto inline-block"
            >
                Read Now &rarr;
            </a>
        </div>
    );
};
