
import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
    onClick: () => void;
    label?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ onClick, label = "Back" }) => (
    <button
        onClick={onClick}
        className="flex items-center text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-6 group"
    >
        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> {label}
    </button>
);
