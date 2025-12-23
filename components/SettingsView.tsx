import React, { useState, useEffect } from 'react';
import { User, Role, Mood, ProgramSettings } from '../types';
import { INPUT_CLASS, BUTTON_PRIMARY, CARD_CLASS } from '../styles/common';
import {
    Users, Settings, Bell, Shield, Calendar, ToggleRight, ToggleLeft, Moon, CheckCircle, Save,
    Key, Smartphone, Globe, LogOut, Trash2, Download, History, AlertTriangle, Check,
    CreditCard, ArrowUp, ArrowDown, X, FileText, Smile, Meh, Frown, Zap, Coffee, Heart, AlertCircle,
    UserPlus, Crown, Edit2
} from 'lucide-react';
import { createUser, getUserByEmail, updateUser, getUsersByOrganization, getOrganization } from '../services/database';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { createCheckoutSession, getCustomerPortalUrl, createCustomer, PRICING_TIERS } from '../services/flowglad';
import { Organization } from '../types';
import SkillsSelector from './SkillsSelector';
import {
    requestCalendarAccess,
    storeCalendarCredentials,
    getCalendarCredentials,
    clearCalendarCredentials
} from '../services/calendarService';
import {
    requestOutlookAccess,
    storeOutlookCredentials,
    getOutlookCredentials,
    clearOutlookCredentials,
    exchangeOutlookCode,
} from '../services/outlookCalendarService';
import {
    requestAppleCalendarAccess,
    storeAppleCredentials,
    getAppleCredentials,
    clearAppleCredentials,
} from '../services/appleCalendarService';

interface SettingsViewProps {
    user: User;
    onUpdateUser: (u: User) => void;
    initialTab?: string;
    organizationId?: string;
    programSettings?: ProgramSettings | null;
    onUpdateOrganization?: (organizationId: string, updates: Partial<any>) => Promise<void>;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user, onUpdateUser, initialTab, organizationId, programSettings, onUpdateOrganization }) => {
    const [activeTab, setActiveTab] = useState(initialTab || 'profile');
    const [formData, setFormData] = useState(user);
    const [showSuccess, setShowSuccess] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    // Sync formData with user prop when it changes (e.g., after onboarding updates)
    useEffect(() => {
        setFormData(user);
    }, [user]);

    // Initialize goalsPublic from user, defaulting to true if not set
    const [goalsPublic, setGoalsPublic] = useState(user.goalsPublic !== undefined ? user.goalsPublic : true);

    // Sync goalsPublic with user prop when it changes
    useEffect(() => {
        setGoalsPublic(user.goalsPublic !== undefined ? user.goalsPublic : true);
    }, [user.goalsPublic]);

    // Organization State for Billing
    const [organization, setOrganization] = useState<Organization | null>(null);

    useEffect(() => {
        const fetchOrg = async () => {
            if (organizationId) {
                const org = await getOrganization(organizationId);
                setOrganization(org);
            }
        };
        fetchOrg();
    }, [organizationId]);

    // Handle Billing specific URL params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('status') === 'success' && activeTab === 'billing') {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            // Clean URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [activeTab]);

    // Security State
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

    // Billing State
    const currentPlan = (organization?.subscriptionTier) || 'starter';
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [isBillingLoading, setIsBillingLoading] = useState(false);

    const handleUpgrade = async (planSlug: string) => {
        if (!organizationId || !organization) return;

        try {
            setIsBillingLoading(true);
            let customerId = organization.flowgladCustomerId;

            if (!customerId) {
                // Lazy create customer
                customerId = await createCustomer(organization, user.email);
                await onUpdateOrganization?.(organizationId, { flowgladCustomerId: customerId });
                // Update local state temporarily
                setOrganization(prev => prev ? ({ ...prev, flowgladCustomerId: customerId }) : null);
            }

            const checkoutUrl = await createCheckoutSession(organizationId, planSlug, customerId);
            window.location.href = checkoutUrl;
        } catch (error) {
            console.error('Error starting checkout:', error);
            alert('Failed to start checkout session');
            setIsBillingLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        if (!organizationId || !organization) return;

        try {
            setIsBillingLoading(true);
            let customerId = organization.flowgladCustomerId;

            if (!customerId) {
                // Lazy create customer
                customerId = await createCustomer(organization, user.email);
                await onUpdateOrganization?.(organizationId, { flowgladCustomerId: customerId });
                setOrganization(prev => prev ? ({ ...prev, flowgladCustomerId: customerId }) : null);
            }

            const portalUrl = await getCustomerPortalUrl(organizationId);
            window.location.href = portalUrl;
        } catch (error) {
            console.error('Error getting portal URL:', error);
            alert('Failed to open billing portal');
            setIsBillingLoading(false);
        }
    };

    // Calendar Sync State
    const [googleConnected, setGoogleConnected] = useState(false);
    const [outlookConnected, setOutlookConnected] = useState(false);
    const [appleConnected, setAppleConnected] = useState(false);
    const [calendarSyncing, setCalendarSyncing] = useState<Record<string, boolean>>({
        google: false,
        outlook: false,
        apple: false,
    });

    useEffect(() => {
        // Check if calendars are connected
        setGoogleConnected(!!getCalendarCredentials(user.id));
        setOutlookConnected(!!getOutlookCredentials(user.id));
        setAppleConnected(!!getAppleCredentials(user.id));
    }, [user.id]);

    // Handle Outlook OAuth callback
    useEffect(() => {
        const handleOutlookCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');

            if (code && window.location.pathname.includes('/auth/outlook/callback')) {
                try {
                    setCalendarSyncing(prev => ({ ...prev, outlook: true }));
                    const credentials = await exchangeOutlookCode(code);
                    storeOutlookCredentials(user.id, credentials);
                    setOutlookConnected(true);
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 3000);
                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (error: any) {
                    console.error('Error connecting Outlook:', error);
                    alert(error.message || 'Failed to connect Outlook calendar');
                } finally {
                    setCalendarSyncing(prev => ({ ...prev, outlook: false }));
                }
            }
        };

        handleOutlookCallback();
    }, [user.id]);
    const [targetPlan, setTargetPlan] = useState<'starter' | 'professional' | 'business' | 'enterprise' | null>(null);

    // Platform Admin State
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminName, setNewAdminName] = useState('');
    const [creatingAdmin, setCreatingAdmin] = useState(false);
    const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Notification Preferences State
    const [notificationPrefs, setNotificationPrefs] = useState<Record<string, { email: boolean; push: boolean }>>({
        'New Messages': { email: true, push: true },
        'Meeting Reminders': { email: true, push: true },
        'Goal Updates': { email: true, push: false },
        'System Alerts': { email: false, push: true }
    });

    const togglePref = (category: string, type: 'email' | 'push') => {
        setNotificationPrefs(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [type]: !prev[category][type]
            }
        }));
    };

    useEffect(() => {
        if (document.documentElement.classList.contains('dark')) {
            setDarkMode(true);
        }
    }, []);

    const toggleDarkMode = () => {
        if (darkMode) {
            document.documentElement.classList.remove('dark');
            setDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            setDarkMode(true);
        }
    };

    const handleSave = () => {
        onUpdateUser({ ...formData, goalsPublic });
        setShowSuccess(true);
        setPasswordForm({ current: '', new: '', confirm: '' });
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const toggleGoalsPublic = () => {
        const newValue = !goalsPublic;
        setGoalsPublic(newValue);
        // Auto-save the preference
        onUpdateUser({ ...formData, goalsPublic: newValue });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: Users },
        { id: 'preferences', label: 'Preferences', icon: Settings },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'calendar', label: 'Sync Calendar', icon: Calendar },
        { id: 'billing', label: 'Billing', icon: CreditCard },
        { id: 'platform-admin', label: 'Platform Admin', icon: Crown }
    ];

    const isPlatformAdmin = user.role === Role.PLATFORM_ADMIN;
    const visibleTabs = isPlatformAdmin
        ? tabs // Platform admins see all tabs including platform-admin
        : user.role === Role.ADMIN
            ? tabs.filter(t => t.id !== 'preferences' && t.id !== 'platform-admin')
            : tabs.filter(t => t.id !== 'billing' && t.id !== 'platform-admin');

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="font-bold text-slate-800 dark:text-white">Settings</h2>
                </div>
                <nav className="flex-1 p-2 space-y-1">
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <tab.icon className="w-4 h-4 mr-3" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-2xl">
                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Profile Settings</h2>

                            {/* Admin-only: Program Name Update */}
                            {user.role === Role.ADMIN && programSettings && organizationId && onUpdateOrganization && (
                                <div className={CARD_CLASS + " mb-6 border-2 border-emerald-200 dark:border-emerald-800"}>
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                                        <Edit2 className="w-5 h-5 mr-2 text-emerald-600" /> Program Name
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Program Name</label>
                                            <input
                                                className={INPUT_CLASS}
                                                value={programSettings.programName}
                                                onChange={async (e) => {
                                                    if (onUpdateOrganization && organizationId) {
                                                        try {
                                                            await onUpdateOrganization(organizationId, {
                                                                programSettings: {
                                                                    ...programSettings,
                                                                    programName: e.target.value
                                                                }
                                                            });
                                                            setShowSuccess(true);
                                                            setTimeout(() => setShowSuccess(false), 3000);
                                                        } catch (error) {
                                                            console.error('Error updating program name:', error);
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            This name appears in the top left corner and throughout the platform.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-6 mb-8">
                                <img src={formData.avatar} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 dark:border-slate-800" />
                                <button className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">Change Photo</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name</label><input className={INPUT_CLASS} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Bio</label><textarea className={INPUT_CLASS} rows={4} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} /></div>
                                <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Title</label><input className={INPUT_CLASS} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                                <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Organization</label><input className={INPUT_CLASS} value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} /></div>
                                <div className="col-span-2">
                                    <SkillsSelector
                                        selectedSkills={formData.skills || []}
                                        onSkillsChange={(skills) => setFormData({ ...formData, skills })}
                                        placeholder="Select or type a skill"
                                        label="Skills"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Current Mood</label>
                                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                        {(['Happy', 'Neutral', 'Stressed', 'Excited', 'Tired', 'Motivated', 'Anxious', 'Grateful'] as Mood[]).map((mood) => {
                                            const isSelected = formData.mood === mood;
                                            const moodIcons: Record<Mood, React.ReactNode> = {
                                                'Happy': <Smile className="w-5 h-5" />,
                                                'Neutral': <Meh className="w-5 h-5" />,
                                                'Stressed': <AlertCircle className="w-5 h-5" />,
                                                'Excited': <Zap className="w-5 h-5" />,
                                                'Tired': <Coffee className="w-5 h-5" />,
                                                'Motivated': <Zap className="w-5 h-5" />,
                                                'Anxious': <Frown className="w-5 h-5" />,
                                                'Grateful': <Heart className="w-5 h-5" />,
                                            };
                                            return (
                                                <button
                                                    key={mood}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, mood })}
                                                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${isSelected
                                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 text-slate-600 dark:text-slate-400'
                                                        }`}
                                                >
                                                    {moodIcons[mood]}
                                                    <span className="text-[10px] font-medium">{mood}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Share how you're feeling today</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Preferences</h2>
                            {user.role === Role.MENTOR && (
                                <div className={CARD_CLASS}>
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-4">Mentorship Capacity</h3>
                                    <div className="space-y-4">
                                        <label className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg"><span className="text-sm font-medium">Accepting New Mentees</span><ToggleRight className="w-6 h-6 text-emerald-500 cursor-pointer" /></label>
                                        <div><label className="block text-xs font-semibold text-slate-500 mb-1">Max Mentees</label><select className={INPUT_CLASS}><option>1</option><option>2</option><option>3</option></select></div>
                                    </div>
                                </div>
                            )}
                            {user.role === Role.MENTEE && (
                                <div className={CARD_CLASS}>
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-4">Learning Visibility</h3>
                                    <div className="space-y-4">
                                        <label className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <span className="text-sm font-medium">Make Goals Public</span>
                                            <button onClick={toggleGoalsPublic} type="button" className="focus:outline-none">
                                                {goalsPublic ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                                            </button>
                                        </label>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 px-3">
                                            {goalsPublic
                                                ? "Your goals are visible to mentors and other participants in your organization."
                                                : "Your goals are private and only visible to you."}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className={CARD_CLASS + " mt-6"}>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4">Appearance</h3>
                                <label className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <span className="text-sm font-medium flex items-center"><Moon className="w-4 h-4 mr-2" /> Dark Mode</span>
                                    <button onClick={toggleDarkMode}>
                                        {darkMode ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                                    </button>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notification Preferences</h2>
                            <div className="space-y-4">
                                {Object.entries(notificationPrefs).map(([category, prefs]) => {
                                    const typedPrefs = prefs as { email: boolean; push: boolean };
                                    return (
                                        <div key={category} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{category}</span>
                                            <div className="flex gap-6">
                                                <label className="flex items-center cursor-pointer space-x-2">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">Email</span>
                                                    <button onClick={() => togglePref(category, 'email')}>
                                                        {typedPrefs.email ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />}
                                                    </button>
                                                </label>
                                                <label className="flex items-center cursor-pointer space-x-2">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">In-App</span>
                                                    <button onClick={() => togglePref(category, 'push')}>
                                                        {typedPrefs.push ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />}
                                                    </button>
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-8 animate-in fade-in">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security & Login</h2>

                            {/* Password Section */}
                            <div className={CARD_CLASS}>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                                    <Key className="w-5 h-5 mr-2 text-emerald-500" /> Change Password
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Current Password</label>
                                        <input type="password" className={INPUT_CLASS} value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">New Password</label>
                                            <input type="password" className={INPUT_CLASS} value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Confirm New Password</label>
                                            <input type="password" className={INPUT_CLASS} value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2FA Section */}
                            <div className={CARD_CLASS}>
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center">
                                            <Shield className="w-5 h-5 mr-2 text-indigo-500" /> Two-Factor Authentication
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">Add an extra layer of security to your account.</p>
                                    </div>
                                    <button onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}>
                                        {twoFactorEnabled ? <ToggleRight className="w-10 h-10 text-emerald-500" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                                    </button>
                                </div>
                                {twoFactorEnabled && (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-3 rounded-lg flex items-center">
                                        <Check className="w-5 h-5 text-emerald-600 mr-2" />
                                        <span className="text-sm text-emerald-800 dark:text-emerald-300">2FA is currently active via SMS to •••-•••-9021</span>
                                    </div>
                                )}
                            </div>

                            {/* Active Sessions */}
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4">Active Sessions</h3>
                                <div className="space-y-3">
                                    <div className="bg-white dark:bg-slate-900 border border-emerald-500 p-4 rounded-xl flex justify-between items-center shadow-sm">
                                        <div className="flex items-center">
                                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg mr-4">
                                                <Globe className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">Chrome on MacOS (This Device)</p>
                                                <p className="text-xs text-slate-500">New York, USA • Active Now</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">Current</span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex justify-between items-center">
                                        <div className="flex items-center">
                                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg mr-4">
                                                <Smartphone className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">iPhone 13 App</p>
                                                <p className="text-xs text-slate-500">New York, USA • 2 hours ago</p>
                                            </div>
                                        </div>
                                        <button className="text-xs text-red-500 font-medium hover:underline">Revoke</button>
                                    </div>
                                </div>
                            </div>

                            {/* Data & Privacy */}
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4">Data & Privacy</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                                        <Download className="w-6 h-6 text-slate-600 dark:text-slate-400 mb-2 group-hover:text-emerald-500" />
                                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">Download Your Data</h4>
                                        <p className="text-xs text-slate-500 mt-1">Get a copy of your messages, goals, and profile data.</p>
                                    </div>
                                    <div className="p-4 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors cursor-pointer group">
                                        <Trash2 className="w-6 h-6 text-red-500 mb-2" />
                                        <h4 className="font-bold text-sm text-red-700 dark:text-red-400">Delete Account</h4>
                                        <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">Permanently remove your account and all data.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'calendar' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sync Calendar</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Connect your calendars to automatically sync meetings and receive reminders. You can connect multiple calendars.
                            </p>
                            <div className="space-y-4">
                                {/* Google Calendar */}
                                <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold mr-4">G</div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white">Google Calendar</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {googleConnected ? 'Connected • Events will sync automatically' : 'Connect your Google Calendar'}
                                            </p>
                                        </div>
                                    </div>
                                    {googleConnected ? (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    clearCalendarCredentials(user.id);
                                                    setGoogleConnected(false);
                                                    setShowSuccess(true);
                                                    setTimeout(() => setShowSuccess(false), 3000);
                                                } catch (error: any) {
                                                    console.error('Error disconnecting Google Calendar:', error);
                                                }
                                            }}
                                            className="text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            Disconnect
                                        </button>
                                    ) : (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    setCalendarSyncing(prev => ({ ...prev, google: true }));
                                                    const credentials = await requestCalendarAccess();
                                                    storeCalendarCredentials(user.id, credentials);
                                                    setGoogleConnected(true);
                                                    setShowSuccess(true);
                                                    setTimeout(() => setShowSuccess(false), 3000);
                                                } catch (error: any) {
                                                    console.error('Error connecting Google Calendar:', error);
                                                    alert(error.message || 'Failed to connect Google Calendar');
                                                } finally {
                                                    setCalendarSyncing(prev => ({ ...prev, google: false }));
                                                }
                                            }}
                                            disabled={calendarSyncing.google}
                                            className="text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {calendarSyncing.google ? 'Connecting...' : 'Connect'}
                                        </button>
                                    )}
                                </div>

                                {/* Outlook Calendar */}
                                <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-500 dark:text-blue-400 font-bold mr-4">O</div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white">Outlook Calendar</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {outlookConnected ? 'Connected • Events will sync automatically' : 'Connect your Outlook Calendar'}
                                            </p>
                                        </div>
                                    </div>
                                    {outlookConnected ? (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    clearOutlookCredentials(user.id);
                                                    setOutlookConnected(false);
                                                    setShowSuccess(true);
                                                    setTimeout(() => setShowSuccess(false), 3000);
                                                } catch (error: any) {
                                                    console.error('Error disconnecting Outlook Calendar:', error);
                                                }
                                            }}
                                            className="text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            Disconnect
                                        </button>
                                    ) : (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    setCalendarSyncing(prev => ({ ...prev, outlook: true }));
                                                    await requestOutlookAccess();
                                                    // The OAuth flow will handle the callback via useEffect
                                                } catch (error: any) {
                                                    console.error('Error connecting Outlook Calendar:', error);
                                                    alert(error.message || 'Failed to connect Outlook Calendar');
                                                    setCalendarSyncing(prev => ({ ...prev, outlook: false }));
                                                }
                                            }}
                                            disabled={calendarSyncing.outlook}
                                            className="text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {calendarSyncing.outlook ? 'Connecting...' : 'Connect'}
                                        </button>
                                    )}
                                </div>

                                {/* Apple Calendar */}
                                <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center text-red-500 dark:text-red-400 font-bold mr-4">A</div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white">Apple Calendar</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {appleConnected ? 'Connected • Events will sync automatically' : 'Connect your iCloud Calendar'}
                                            </p>
                                        </div>
                                    </div>
                                    {appleConnected ? (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    clearAppleCredentials(user.id);
                                                    setAppleConnected(false);
                                                    setShowSuccess(true);
                                                    setTimeout(() => setShowSuccess(false), 3000);
                                                } catch (error: any) {
                                                    console.error('Error disconnecting Apple Calendar:', error);
                                                }
                                            }}
                                            className="text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            Disconnect
                                        </button>
                                    ) : (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    setCalendarSyncing(prev => ({ ...prev, apple: true }));
                                                    const credentials = await requestAppleCalendarAccess();
                                                    storeAppleCredentials(user.id, credentials);
                                                    setAppleConnected(true);
                                                    setShowSuccess(true);
                                                    setTimeout(() => setShowSuccess(false), 3000);
                                                } catch (error: any) {
                                                    console.error('Error connecting Apple Calendar:', error);
                                                    alert(error.message || 'Failed to connect Apple Calendar. Please configure Apple Calendar service or use a third-party integration.');
                                                } finally {
                                                    setCalendarSyncing(prev => ({ ...prev, apple: false }));
                                                }
                                            }}
                                            disabled={calendarSyncing.apple}
                                            className="text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {calendarSyncing.apple ? 'Connecting...' : 'Connect'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            {(googleConnected || outlookConnected || appleConnected) && (
                                <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                                    <p className="text-sm text-emerald-800 dark:text-emerald-200">
                                        <CheckCircle className="w-4 h-4 inline mr-2" />
                                        {[
                                            googleConnected && 'Google Calendar',
                                            outlookConnected && 'Outlook Calendar',
                                            appleConnected && 'Apple Calendar'
                                        ].filter(Boolean).join(', ')} connected. New meetings will automatically sync to all connected calendars.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'billing' && user.role === Role.ADMIN && (
                        <div className="space-y-6 animate-in fade-in">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Billing & Subscription</h2>

                            {/* Current Plan */}
                            <div className={CARD_CLASS}>
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-1">Current Plan</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {currentPlan === 'starter' && 'Starter Plan'}
                                            {currentPlan === 'professional' && 'Professional Plan'}
                                            {currentPlan === 'business' && 'Business Plan'}
                                            {currentPlan === 'enterprise' && 'Enterprise Plan'}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentPlan === 'enterprise'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                        : currentPlan === 'business'
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                            : currentPlan === 'professional'
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                        }`}>
                                        {currentPlan === 'enterprise' ? 'Enterprise' : currentPlan === 'business' ? 'Business' : currentPlan === 'professional' ? 'Professional' : 'Starter'}
                                    </span>
                                </div>

                                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                                    <div className="flex items-baseline justify-between mb-2">
                                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                                            {currentPlan === 'starter' && '$99'}
                                            {currentPlan === 'professional' && '$199'}
                                            {currentPlan === 'business' && '$299'}
                                            {currentPlan === 'enterprise' && 'Custom'}
                                        </span>
                                        {currentPlan !== 'enterprise' && (
                                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                                /month
                                            </span>
                                        )}
                                    </div>
                                    {currentPlan !== 'enterprise' && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {currentPlan === 'starter' && '1-99 participants'}
                                            {currentPlan === 'professional' && '100-399 participants'}
                                            {currentPlan === 'business' && '400-999 participants'}
                                        </p>
                                    )}
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2">
                                        14-day free trial included
                                    </p>
                                </div>
                            </div>

                            {/* Change Plan */}
                            <div className={CARD_CLASS}>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4">Change Plan</h3>
                                <div className="space-y-3">
                                    {currentPlan !== 'starter' && (
                                        <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white">Starter</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">$99/month • 1-99 participants</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setTargetPlan('starter');
                                                    setShowUpgradeModal(true);
                                                }}
                                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${['professional', 'business', 'enterprise'].includes(currentPlan)
                                                    ? 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                    }`}
                                            >
                                                {['professional', 'business', 'enterprise'].includes(currentPlan) ? (
                                                    <>
                                                        <ArrowDown className="w-4 h-4 mr-1" /> Downgrade
                                                    </>
                                                ) : (
                                                    <>
                                                        <ArrowUp className="w-4 h-4 mr-1" /> Upgrade
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                    {currentPlan !== 'professional' && (
                                        <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white">Professional</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">$199/month • 100-399 participants</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setTargetPlan('professional');
                                                    setShowUpgradeModal(true);
                                                }}
                                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentPlan === 'starter'
                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                    : currentPlan === 'business' || currentPlan === 'enterprise'
                                                        ? 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                    }`}
                                            >
                                                {currentPlan === 'starter' ? (
                                                    <>
                                                        <ArrowUp className="w-4 h-4 mr-1" /> Upgrade
                                                    </>
                                                ) : (
                                                    <>
                                                        <ArrowDown className="w-4 h-4 mr-1" /> Downgrade
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                    {currentPlan !== 'business' && (
                                        <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white">Business</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">$299/month • 400-999 participants</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setTargetPlan('business');
                                                    setShowUpgradeModal(true);
                                                }}
                                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${['starter', 'professional'].includes(currentPlan)
                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                    : currentPlan === 'enterprise'
                                                        ? 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                    }`}
                                            >
                                                {['starter', 'professional'].includes(currentPlan) ? (
                                                    <>
                                                        <ArrowUp className="w-4 h-4 mr-1" /> Upgrade
                                                    </>
                                                ) : (
                                                    <>
                                                        <ArrowDown className="w-4 h-4 mr-1" /> Downgrade
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                    {currentPlan !== 'enterprise' && (
                                        <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white">Enterprise</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Custom pricing for 1000+ participants</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setTargetPlan('enterprise');
                                                    setShowUpgradeModal(true);
                                                }}
                                                className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                                            >
                                                <ArrowUp className="w-4 h-4 mr-1" /> Contact Sales
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className={CARD_CLASS}>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                                    <CreditCard className="w-5 h-5 mr-2 text-emerald-500" /> Payment Method
                                </h3>
                                <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mr-4">
                                            <CreditCard className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white text-sm">•••• •••• •••• 4242</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Expires 12/2025</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleManageSubscription}
                                        disabled={isBillingLoading}
                                        className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                                    >
                                        {isBillingLoading ? 'Loading...' : 'Update'}
                                    </button>
                                </div>
                            </div>

                            {/* Billing History */}
                            <div className={CARD_CLASS}>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                                    <History className="w-5 h-5 mr-2 text-emerald-500" /> Billing History
                                </h3>
                                <div className="space-y-3">
                                    {[
                                        { date: 'Jan 15, 2025', amount: '$99.00', status: 'Paid', period: 'Professional - Annual' },
                                        { date: 'Dec 15, 2024', amount: '$99.00', status: 'Paid', period: 'Professional - Annual' },
                                        { date: 'Nov 15, 2024', amount: '$199.00', status: 'Paid', period: 'Professional - Monthly' }
                                    ].map((invoice, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-white text-sm">{invoice.period}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{invoice.date}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-bold text-slate-800 dark:text-white">{invoice.amount}</span>
                                                <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full font-medium">
                                                    {invoice.status}
                                                </span>
                                                <button
                                                    onClick={handleManageSubscription}
                                                    disabled={isBillingLoading}
                                                    className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Cancel Subscription */}
                            {currentPlan !== 'starter' && currentPlan !== 'professional' && currentPlan !== 'business' && currentPlan !== 'enterprise' ? null : currentPlan !== 'enterprise' && (
                                <div className="border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 rounded-xl p-6">
                                    <h3 className="font-bold text-red-700 dark:text-red-400 mb-2">Cancel Subscription</h3>
                                    <p className="text-sm text-red-600/70 dark:text-red-400/70 mb-4">
                                        Your subscription will remain active until the end of your billing period. You can reactivate anytime.
                                    </p>
                                    <button
                                        onClick={() => setShowCancelConfirm(true)}
                                        className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        Cancel Subscription
                                    </button>
                                </div>
                            )}

                            {/* Upgrade Modal */}
                            {showUpgradeModal && targetPlan && (
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Confirm Plan Change</h3>
                                            <button onClick={() => setShowUpgradeModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                                            {targetPlan === 'starter' && 'You\'re changing to the Starter plan at $99/month (1-99 participants).'}
                                            {targetPlan === 'professional' && 'You\'re changing to the Professional plan at $199/month (100-399 participants).'}
                                            {targetPlan === 'business' && 'You\'re changing to the Business plan at $299/month (400-999 participants).'}
                                            {targetPlan === 'enterprise' && 'You\'re upgrading to the Enterprise plan. Our sales team will contact you to discuss custom pricing for 1000+ participants.'}
                                        </p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowUpgradeModal(false)}
                                                disabled={isBillingLoading}
                                                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (targetPlan === 'enterprise') {
                                                        window.location.href = 'mailto:sales@meant2grow.com';
                                                    } else {
                                                        const tier = PRICING_TIERS[targetPlan as keyof typeof PRICING_TIERS];
                                                        if (tier) {
                                                            handleUpgrade(tier.monthlySlug);
                                                        }
                                                    }
                                                    setShowUpgradeModal(false);
                                                }}
                                                disabled={isBillingLoading}
                                                className={BUTTON_PRIMARY + " flex-1" + (isBillingLoading ? " opacity-50" : "")}
                                            >
                                                {isBillingLoading ? 'Processing...' : 'Confirm Upgrade'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cancel Confirmation Modal */}
                            {showCancelConfirm && (
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Cancel Subscription</h3>
                                            <button onClick={() => setShowCancelConfirm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                                            To cancel your subscription, please visit the billing portal.
                                        </p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowCancelConfirm(false)}
                                                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                Close
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleManageSubscription();
                                                    setShowCancelConfirm(false);
                                                }}
                                                disabled={isBillingLoading}
                                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                                            >
                                                {isBillingLoading ? 'Redirecting...' : 'Go to Portal'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'platform-admin' && isPlatformAdmin && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                                    <Crown className="w-5 h-5 mr-2 text-amber-500" /> Platform Admin Management
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                    Create new platform admin users who can manage platform-wide content and resources.
                                </p>
                            </div>

                            <div className={CARD_CLASS}>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                                    <UserPlus className="w-4 h-4 mr-2" /> Create Platform Admin
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
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
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            className={INPUT_CLASS}
                                            placeholder="Platform Admin"
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
                                        onClick={async () => {
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
                                                        role: Role.PLATFORM_ADMIN,
                                                        organizationId: 'platform',
                                                    });
                                                    setAdminMessage({
                                                        type: 'success',
                                                        text: `Updated ${newAdminEmail} to Platform Admin role`
                                                    });
                                                } else {
                                                    // Create new platform admin
                                                    await createUser({
                                                        email: newAdminEmail,
                                                        name: newAdminName,
                                                        role: Role.PLATFORM_ADMIN,
                                                        organizationId: 'platform',
                                                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newAdminName)}&background=10b981&color=fff`,
                                                        title: 'Platform Administrator',
                                                        company: 'Meant2Grow',
                                                        skills: [],
                                                        bio: 'Platform administrator for Meant2Grow',
                                                    });
                                                    setAdminMessage({
                                                        type: 'success',
                                                        text: `Created Platform Admin: ${newAdminName} (${newAdminEmail})`
                                                    });
                                                }

                                                setNewAdminEmail('');
                                                setNewAdminName('');
                                            } catch (error: any) {
                                                console.error('Error creating platform admin:', error);
                                                setAdminMessage({
                                                    type: 'error',
                                                    text: error.message || 'Failed to create platform admin'
                                                });
                                            } finally {
                                                setCreatingAdmin(false);
                                            }
                                        }}
                                        disabled={creatingAdmin || !newAdminEmail || !newAdminName}
                                        className={BUTTON_PRIMARY + (creatingAdmin ? ' opacity-50 cursor-not-allowed' : '')}
                                    >
                                        {creatingAdmin ? (
                                            <>Creating...</>
                                        ) : (
                                            <>
                                                <UserPlus className="w-4 h-4 mr-2" /> Create Platform Admin
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className={CARD_CLASS}>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-4">Important Notes</h4>
                                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                                    <li>Platform admins can manage blog posts and platform-wide resources</li>
                                    <li>They can see all organizations but manage platform content only</li>
                                    <li>New platform admins will need to sign in through the app</li>
                                    <li>If a user already exists, their role will be updated to Platform Admin</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab !== 'platform-admin' && (
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            {showSuccess && <span className="text-emerald-600 text-sm font-medium flex items-center"><CheckCircle className="w-4 h-4 mr-2" /> Changes saved successfully</span>}
                            <button onClick={handleSave} className={BUTTON_PRIMARY + " ml-auto"}>
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsView;