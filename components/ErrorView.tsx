
import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { BUTTON_PRIMARY } from '../styles/common';

interface ErrorViewProps {
    error: Error;
    resetErrorBoundary: () => void;
    title?: string;
}

export const ErrorView: React.FC<ErrorViewProps> = ({ error, resetErrorBoundary, title = "View Crash" }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
                Something went wrong while rendering this part of the application.
                Our team has been notified.
            </p>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 w-full mb-6 overflow-auto max-h-32 text-left">
                <p className="text-xs font-mono text-red-500">{error.message}</p>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={resetErrorBoundary}
                    className={BUTTON_PRIMARY + " flex items-center"}
                >
                    <RefreshCcw className="w-4 h-4 mr-2" /> Try Again
                </button>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center"
                >
                    <Home className="w-4 h-4 mr-2" /> Go to Home
                </button>
            </div>
        </div>
    );
};
