import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { INPUT_CLASS, BUTTON_PRIMARY, CARD_CLASS } from '../styles/common';
import { Crown, UserPlus, Edit2, Trash2, Mail, X, AlertTriangle } from 'lucide-react';
import { createUser, updateUser, getAllUsers, deleteUser } from '../services/database';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getErrorMessage } from '../utils/errors';
import { logger } from '../services/logger';

interface PlatformOperatorManagementProps {
    currentUser: User;
}

const PlatformOperatorManagement: React.FC<PlatformOperatorManagementProps> = ({ currentUser }) => {
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminName, setNewAdminName] = useState('');
    const [creatingAdmin, setCreatingAdmin] = useState(false);
    const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [platformOperators, setPlatformOperators] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingOperator, setEditingOperator] = useState<User | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    // Check if current user is platform operator
    const isPlatformOperator = useMemo(() => {
        const userRoleString = String(currentUser.role);
        return currentUser.role === Role.PLATFORM_OPERATOR || 
               userRoleString === "PLATFORM_OPERATOR";
    }, [currentUser.role]);

    // Load platform operators
    const loadPlatformOperators = useCallback(async () => {
        try {
            setLoading(true);
            const allUsers = await getAllUsers();
            const operators = allUsers.filter((u) => {
                const userRoleString = String(u.role);
                return u.role === Role.PLATFORM_OPERATOR || 
                       userRoleString === "PLATFORM_OPERATOR";
            });
            setPlatformOperators(operators);
        } catch (error) {
            logger.error('Error loading platform operators', error);
            setPlatformOperators([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPlatformOperators();
    }, [loadPlatformOperators]);

    const handleCreateOperator = async () => {
        if (!newAdminEmail || !newAdminName) {
            setAdminMessage({ type: 'error', text: 'Please fill in both email and name' });
            return;
        }

        setCreatingAdmin(true);
        setAdminMessage(null);

        try {
            // Check if user exists by querying users collection
            const usersQuery = query(
                collection(db, 'users'),
                where('email', '==', newAdminEmail)
            );
            const existingUsersSnapshot = await getDocs(usersQuery);

            if (!existingUsersSnapshot.empty) {
                // Update existing user
                const existingUserDoc = existingUsersSnapshot.docs[0];
                await updateUser(existingUserDoc.id, {
                    role: Role.PLATFORM_OPERATOR,
                    organizationId: 'platform',
                });
                setAdminMessage({
                    type: 'success',
                    text: `Updated ${newAdminEmail} to Platform Operator role`
                });
            } else {
                // Create new platform operator
                await createUser({
                    email: newAdminEmail,
                    name: newAdminName,
                    role: Role.PLATFORM_OPERATOR,
                    organizationId: 'platform',
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newAdminName)}&background=10b981&color=fff`,
                    title: 'Platform Operator',
                    company: 'Meant2Grow',
                    skills: [],
                    bio: 'Platform operator for Meant2Grow',
                });
                setAdminMessage({
                    type: 'success',
                    text: `Created Platform Operator: ${newAdminName} (${newAdminEmail})`
                });
            }

            setNewAdminEmail('');
            setNewAdminName('');
            await loadPlatformOperators();
        } catch (error: unknown) {
            logger.error('Error creating platform operator', error);
            setAdminMessage({
                type: 'error',
                text: getErrorMessage(error) || 'Failed to create platform operator'
            });
        } finally {
            setCreatingAdmin(false);
        }
    };

    const handleDeleteOperator = async (userId: string) => {
        if (userId === currentUser.id) {
            setAdminMessage({ type: 'error', text: 'You cannot delete yourself' });
            return;
        }
        try {
            await deleteUser(userId);
            setShowDeleteConfirm(null);
            await loadPlatformOperators();
            setAdminMessage({ type: 'success', text: 'Platform operator deleted successfully' });
        } catch (error: unknown) {
            logger.error('Error deleting platform operator', error);
            setAdminMessage({ type: 'error', text: getErrorMessage(error) || 'Failed to delete platform operator' });
        }
    };

    if (!isPlatformOperator) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className={CARD_CLASS + " text-center py-8"}>
                    <Crown className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-500">Access denied. Only platform operators can access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                    <Crown className="w-6 h-6 text-amber-500 flex-shrink-0" />
                    <span>Platform Operator Management</span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Create new platform operator users who can manage platform-wide content and resources.
                </p>
            </div>

            <div className={CARD_CLASS}>
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                    <UserPlus className="w-4 h-4 mr-2 flex-shrink-0" /> Create Platform Operator
                </h4>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            className={INPUT_CLASS}
                            placeholder="admin@meant2grow.com"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            disabled={creatingAdmin}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Full Name
                        </label>
                        <input
                            type="text"
                            className={INPUT_CLASS}
                            placeholder="Platform Operator"
                            value={newAdminName}
                            onChange={(e) => setNewAdminName(e.target.value)}
                            disabled={creatingAdmin}
                        />
                    </div>
                    {adminMessage && (
                        <div className={`p-3 rounded-lg text-sm ${adminMessage.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            }`}>
                            {adminMessage.text}
                        </div>
                    )}
                    <button
                        onClick={handleCreateOperator}
                        disabled={creatingAdmin || !newAdminEmail || !newAdminName}
                        className={BUTTON_PRIMARY + ' w-full sm:w-auto' + (creatingAdmin ? ' opacity-50 cursor-not-allowed' : '')}
                    >
                        {creatingAdmin ? (
                            <>Creating...</>
                        ) : (
                            <>
                                <UserPlus className="w-4 h-4 mr-2 flex-shrink-0" /> Create Platform Operator
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Platform Operators List */}
            <div className={CARD_CLASS}>
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Crown className="w-4 h-4" /> Platform Operators ({platformOperators.length})
                </h4>
                {loading ? (
                    <div className="text-center py-8 text-slate-500">Loading operators...</div>
                ) : platformOperators.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <Crown className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No platform operators found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {platformOperators.map((operator) => (
                            <div
                                key={operator.id}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    <img
                                        src={operator.avatar}
                                        alt={operator.name}
                                        className="w-12 h-12 rounded-full flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h5 className="font-semibold text-slate-900 dark:text-white">
                                                {operator.name}
                                            </h5>
                                            {operator.id === currentUser.id && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-slate-600 dark:text-slate-400">
                                            <span className="flex items-center gap-1 min-w-0 truncate">
                                                <Mail className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{operator.email}</span>
                                            </span>
                                            {operator.title && (
                                                <span className="text-slate-500 dark:text-slate-500">{operator.title}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {operator.id !== currentUser.id && (
                                        <>
                                            <button
                                                onClick={() => setEditingOperator(operator)}
                                                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                                title="Edit"
                                                aria-label={`Edit ${operator.name}`}
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(operator.id)}
                                                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                title="Delete"
                                                aria-label={`Delete ${operator.name}`}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className={CARD_CLASS}>
                <h4 className="font-bold text-slate-900 dark:text-white mb-4">Important Notes</h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                    <li>Platform operators can manage blog posts and platform-wide resources</li>
                    <li>They can see all organizations but manage platform content only</li>
                    <li>New platform operators will need to sign in through the app</li>
                    <li>If a user already exists, their role will be updated to Platform Operator</li>
                </ul>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0 pb-[env(safe-area-inset-bottom)]">
                    <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[85vh] sm:max-h-none overflow-y-auto">
                        <div className="flex items-start gap-4 mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    Confirm Deletion
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Are you sure you want to delete this platform operator? This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 min-h-[44px] px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium touch-manipulation"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteOperator(showDeleteConfirm)}
                                className="flex-1 min-h-[44px] px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium touch-manipulation"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Operator Modal */}
            {editingOperator && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-xl shadow-2xl p-6 max-w-md w-full my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Platform Operator</h3>
                            <button
                                onClick={() => setEditingOperator(null)}
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    className={INPUT_CLASS}
                                    value={editingOperator.name}
                                    onChange={(e) => setEditingOperator({ ...editingOperator, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className={INPUT_CLASS}
                                    value={editingOperator.email}
                                    onChange={(e) => setEditingOperator({ ...editingOperator, email: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                                <button
                                    onClick={() => setEditingOperator(null)}
                                    className="flex-1 min-h-[44px] px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium touch-manipulation"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            await updateUser(editingOperator.id, {
                                                name: editingOperator.name,
                                                email: editingOperator.email,
                                            });
                                            setEditingOperator(null);
                                            await loadPlatformOperators();
                                            setAdminMessage({ type: 'success', text: 'Platform operator updated successfully' });
                                        } catch (error: unknown) {
                                            setAdminMessage({ type: 'error', text: getErrorMessage(error) || 'Failed to update platform operator' });
                                        }
                                    }}
                                    className={BUTTON_PRIMARY + " flex-1"}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlatformOperatorManagement;

