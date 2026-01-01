
import React, { useState } from 'react';
import { Notification } from '../types';
import { BUTTON_PRIMARY, CARD_CLASS, INPUT_CLASS } from '../styles/common';
import { Bell, Check, Trash2, Search, Filter, MailOpen, ArrowLeft, X } from 'lucide-react';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (page: string) => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ 
    notifications, 
    onMarkAsRead, 
    onMarkAllAsRead, 
    onDismiss,
    onDelete,
    onNavigate
}) => {
    const [filter, setFilter] = useState<'all' | 'unread' | 'activity' | 'system'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const filteredNotifications = notifications.filter(n => {
        const matchesFilter = 
            filter === 'all' ? true :
            filter === 'unread' ? !n.isRead :
            filter === 'activity' ? (n.type === 'message' || n.type === 'meeting' || n.type === 'goal') :
            filter === 'system' ? (n.type === 'system' || n.type === 'match') : true;
        
        const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.body.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkRead = () => {
        selectedIds.forEach(id => onMarkAsRead(id));
        setSelectedIds([]);
    };

    const handleBulkDelete = () => {
        selectedIds.forEach(id => onDelete(id));
        setSelectedIds([]);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center gap-4">
                <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
                    <p className="text-slate-500 dark:text-slate-400">Stay updated with your mentorship journey.</p>
                </div>
            </div>

            <div className={CARD_CLASS + " p-0 overflow-hidden"}>
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between bg-slate-50 dark:bg-slate-950">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
                        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 ${filter === 'all' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50'}`}>All</button>
                        <button onClick={() => setFilter('unread')} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 ${filter === 'unread' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50'}`}>Unread</button>
                        <button onClick={() => setFilter('activity')} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 ${filter === 'activity' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50'}`}>Activity</button>
                        <button onClick={() => setFilter('system')} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 ${filter === 'system' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50'}`}>System</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className={INPUT_CLASS + " pl-9 py-1.5 w-full md:w-64"}
                            />
                        </div>
                        <button onClick={onMarkAllAsRead} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Mark all as read">
                            <MailOpen className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800">
                        <span className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">{selectedIds.length} selected</span>
                        <div className="flex gap-2">
                            <button onClick={handleBulkRead} className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline px-3 py-1">Mark Read</button>
                            <button onClick={handleBulkDelete} className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline px-3 py-1">Delete</button>
                        </div>
                    </div>
                )}

                {/* List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredNotifications.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No notifications found.</p>
                        </div>
                    ) : (
                        filteredNotifications.map(n => {
                            const isClickable = n.type === 'match' && n.chatId;
                            const handleClick = () => {
                                if (isClickable && n.chatId) {
                                    // Navigate to chat with the specific chatId
                                    // The chat page will use initialChatId prop
                                    onNavigate(`chat:${n.chatId}`);
                                }
                            };
                            
                            return (
                                <div 
                                    key={n.id} 
                                    onClick={isClickable ? handleClick : undefined}
                                    className={`p-4 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group ${!n.isRead ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : ''} ${isClickable ? 'cursor-pointer' : ''}`}
                                >
                                    <div className="pt-1">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(n.id)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                toggleSelection(n.id);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`text-sm ${!n.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                {n.title}
                                                {!n.isRead && <span className="ml-2 inline-block w-2 h-2 bg-emerald-500 rounded-full"></span>}
                                                {isClickable && <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">→ Open chat</span>}
                                            </h3>
                                            <span className="text-xs text-slate-400 whitespace-nowrap">{n.timestamp}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{n.body}</p>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!n.isRead && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onMarkAsRead(n.id);
                                                }} 
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-full" 
                                                title="Mark as Read"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(n.id);
                                            }} 
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full" 
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsView;
