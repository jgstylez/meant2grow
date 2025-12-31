import React, { useState, useEffect, useMemo } from 'react';
import { User, Role, Mood, ProgramSettings, Match, MatchStatus } from '../types';
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
import { createCheckoutSession, getBillingData, openBillingPortal, PRICING_TIERS, type BillingData } from '../services/flowglad';
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
import { useDevices } from '../hooks/useDevices';

interface SettingsViewProps {
    user: User;
    onUpdateUser: (u: User) => void;
    initialTab?: string;
    organizationId?: string;
    programSettings?: ProgramSettings | null;
    onUpdateOrganization?: (organizationId: string, updates: Partial<any>) => Promise<void>;
    matches?: Match[]; // Active matches for calculating mentor availability
}

const SettingsView: React.FC<SettingsViewProps> = ({ user, onUpdateUser, initialTab, organizationId, programSettings, onUpdateOrganization, matches = [] }) => {
    const [activeTab, setActiveTab] = useState(initialTab || 'profile');
    
    // Robust role checks - handle both enum values and raw string values from database
    // Use useMemo to ensure proper initialization order
    const { isPlatformAdmin, isOrgAdmin } = useMemo(() => {
        const userRoleString = String(user.role);
        const platformAdmin = user.role === Role.PLATFORM_ADMIN || 
                            userRoleString === "PLATFORM_ADMIN" || 
                            userRoleString === "PLATFORM_OPERATOR";
        
        const orgAdmin = !platformAdmin && (
            user.role === Role.ADMIN || 
            userRoleString === "ORGANIZATION_ADMIN" || 
            userRoleString === "ADMIN"
        );
        
        return { isPlatformAdmin: platformAdmin, isOrgAdmin: orgAdmin };
    }, [user.role]);
    const [formData, setFormData] = useState(user);
    const [showSuccess, setShowSuccess] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    // Sync formData with user prop when it changes (e.g., after onboarding updates)
    useEffect(() => {
        setFormData(user);
    }, [user]);

    // Initialize goalsPublic from user, defaulting to false if not set
    const [goalsPublic, setGoalsPublic] = useState(user.goalsPublic ?? false);

    // Sync goalsPublic with user prop when it changes (only if defined in user)
    useEffect(() => {
        if (user.goalsPublic !== undefined) {
            setGoalsPublic(user.goalsPublic);
        }
    }, [user.goalsPublic]);

    // Calculate mentor's current active matches count
    const mentorActiveMatches = useMemo(() => {
        return user.role === Role.MENTOR 
            ? matches.filter(m => m.mentorId === user.id && m.status === MatchStatus.ACTIVE).length
            : 0;
    }, [user.role, user.id, matches]);
    
    const maxMenteesLimit = user.maxMentees || 2; // Default to 2 if not set
    const hasReachedQuota = mentorActiveMatches >= maxMenteesLimit;
    
    // Simple: use the user prop directly, defaulting to true
    const isAcceptingNewMentees = user.acceptingNewMentees !== false;

    // Initialize maxMentees from user, defaulting to 2 if not set
    const [maxMentees, setMaxMentees] = useState(user.maxMentees || 2);

    // Sync maxMentees with user prop when it changes
    // Only update if the value is explicitly set (not undefined) to avoid resetting during updates
    useEffect(() => {
        if (user.maxMentees !== undefined) {
            setMaxMentees(user.maxMentees);
        }
    }, [user.maxMentees]);

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
    // Calculate trial status: organization is on trial if trialEnd exists and hasn't expired
    const isOnTrial = useMemo(() => {
        if (!organization?.trialEnd) return false;
        const trialEndDate = new Date(organization.trialEnd);
        const now = new Date();
        return trialEndDate > now;
    }, [organization?.trialEnd]);

    // Device tracking
    const { devices, isLoading: devicesLoading, revokeDevice, currentDeviceId } = useDevices(user.id);
    const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);

    // Calculate days remaining in trial
    const trialDaysRemaining = useMemo(() => {
        if (!organization?.trialEnd || !isOnTrial) return 0;
        const trialEndDate = new Date(organization.trialEnd);
        const now = new Date();
        const diffTime = trialEndDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }, [organization?.trialEnd, isOnTrial]);

    // Determine current plan: if on trial or no plan selected, show as 'trial'
    // Otherwise use the actual subscription tier
    const currentPlan = useMemo(() => {
        const tier = organization?.subscriptionTier;
        // If on trial or no tier set, treat as trial (not 'free')
        if (isOnTrial || !tier || tier === 'free') {
            return 'trial';
        }
        return tier;
    }, [organization?.subscriptionTier, isOnTrial]);

    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [isBillingLoading, setIsBillingLoading] = useState(false);
    const [billingData, setBillingData] = useState<BillingData | null>(null);
    const [billingError, setBillingError] = useState<string | null>(null);

    // Fetch billing data from Flowglad when billing tab is active
    useEffect(() => {
        const fetchBillingData = async () => {
            if (activeTab === 'billing' && organizationId && isOrgAdmin) {
                try {
                    setIsBillingLoading(true);
                    setBillingError(null);
                    const data = await getBillingData(organizationId);
                    setBillingData(data);
                } catch (error: any) {
                    console.error('Error fetching billing data:', error);
                    setBillingError(error.message || 'Failed to load billing data');
                } finally {
                    setIsBillingLoading(false);
                }
            }
        };
        fetchBillingData();
    }, [activeTab, organizationId, isOrgAdmin]);

    /**
     * Handle plan upgrade - redirects to Flowglad hosted checkout (PCI compliant)
     */
    const handleUpgrade = async (priceId: string) => {
        if (!organizationId || !organization) return;

        try {
            setIsBillingLoading(true);
            const checkoutUrl = await createCheckoutSession(
                organizationId, 
                priceId,
                organization.name,
                user.email
            );
            // Redirect to Flowglad's hosted checkout page
            window.location.href = checkoutUrl;
        } catch (error: any) {
            console.error('Error starting checkout:', error);
            alert(error.message || 'Failed to start checkout session');
            setIsBillingLoading(false);
        }
    };

    /**
     * Handle subscription management - redirects to Flowglad billing portal (PCI compliant)
     */
    const handleManageSubscription = async () => {
        if (!organizationId) return;

        try {
            setIsBillingLoading(true);
            await openBillingPortal(organizationId);
        } catch (error: any) {
            console.error('Error opening billing portal:', error);
            alert(error.message || 'Failed to open billing portal');
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
        onUpdateUser({ ...formData, goalsPublic, maxMentees });
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

    const toggleAcceptingNewMentees = () => {
        const newValue = !isAcceptingNewMentees;
        onUpdateUser({ ...user, acceptingNewMentees: newValue });
    };

    const handleMaxMenteesChange = (value: number) => {
        setMaxMentees(value);
        // Auto-save the preference - use user prop directly to ensure we have all fields
        onUpdateUser({ ...user, maxMentees: value });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: Users },
        { id: 'preferences', label: 'Preferences', icon: Settings },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'calendar', label: 'Sync Calendar', icon: Calendar },
        { id: 'billing', label: 'Billing', icon: CreditCard }
    ];

    // Tab visibility by role:
    // - Platform Operators: all except billing (they don't manage org billing)
    // - Organization Admins: all tabs (they manage their org's billing)
    // - Mentors/Mentees: all except billing
    const visibleTabs = isPlatformAdmin
        ? tabs.filter(t => t.id !== 'billing')
        : isOrgAdmin
            ? tabs
            : tabs.filter(t => t.id !== 'billing');

    // Redirect platform operators away from billing tab if they somehow land on it
    useEffect(() => {
        if (isPlatformAdmin && activeTab === 'billing') {
            setActiveTab('profile');
        }
        // Redirect away from platform-admin tab (now a separate page)
        if (activeTab === 'platform-admin') {
            setActiveTab('profile');
        }
    }, [isPlatformAdmin, activeTab]);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const activeTabData = visibleTabs.find(t => t.id === activeTab);
    const ActiveTabIcon = activeTabData?.icon;

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Mobile Tab Selector */}
            <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Open settings menu"
                    aria-expanded={isMobileMenuOpen}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-800 dark:text-white bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <span className="flex items-center">
                        {ActiveTabIcon && (
                            <ActiveTabIcon className="w-4 h-4 mr-2" aria-hidden="true" />
                        )}
                        {activeTabData?.label || 'Settings'}
                    </span>
                    <Settings className={`w-4 h-4 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {isMobileMenuOpen && (
                    <div className="mt-2 space-y-1 max-h-[60vh] overflow-y-auto touch-action-pan-y">
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setIsMobileMenuOpen(false);
                                }}
                                aria-label={`${tab.label} settings`}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                    activeTab === tab.id
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'
                                }`}
                            >
                                <tab.icon className="w-4 h-4 mr-3 flex-shrink-0" aria-hidden="true" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="font-bold text-slate-800 dark:text-white">Settings</h2>
                </div>
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto touch-action-pan-y" aria-label="Settings navigation">
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            aria-label={`${tab.label} settings`}
                            aria-current={activeTab === tab.id ? 'page' : undefined}
                            className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                activeTab === tab.id
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <tab.icon className="w-4 h-4 mr-3 flex-shrink-0" aria-hidden="true" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </aside>

            <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto touch-action-pan-y">
                <div className="max-w-2xl mx-auto">
                    {activeTab === 'profile' && (
                        <div className="space-y-4 sm:space-y-6 animate-in fade-in">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4 sm:mb-6">Profile Settings</h2>

                            {/* Admin-only: Program Name Update */}
                            {isOrgAdmin && programSettings && organizationId && onUpdateOrganization && (
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

                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
                                <img src={formData.avatar} alt={`${formData.name || 'User'}'s avatar`} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-slate-100 dark:border-slate-800 flex-shrink-0" />
                                <button 
                                    aria-label="Change profile photo"
                                    className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline min-h-[44px] px-4 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    Change Photo
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="col-span-2">
                                    <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name</label>
                                    <input 
                                        id="profile-name"
                                        className={INPUT_CLASS} 
                                        value={formData.name} 
                                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                        aria-describedby="profile-name-description"
                                    />
                                    <span id="profile-name-description" className="sr-only">Enter your full name</span>
                                </div>
                                <div className="col-span-2">
                                    <label htmlFor="profile-bio" className="block text-xs font-semibold text-slate-500 uppercase mb-1">Bio</label>
                                    <textarea 
                                        id="profile-bio"
                                        className={INPUT_CLASS} 
                                        rows={4} 
                                        value={formData.bio} 
                                        onChange={e => setFormData({ ...formData, bio: e.target.value })} 
                                        aria-describedby="profile-bio-description"
                                    />
                                    <span id="profile-bio-description" className="sr-only">Enter a brief biography</span>
                                </div>
                                <div>
                                    <label htmlFor="profile-title" className="block text-xs font-semibold text-slate-500 uppercase mb-1">Title</label>
                                    <input 
                                        id="profile-title"
                                        className={INPUT_CLASS} 
                                        value={formData.title} 
                                        onChange={e => setFormData({ ...formData, title: e.target.value })} 
                                        aria-describedby="profile-title-description"
                                    />
                                    <span id="profile-title-description" className="sr-only">Enter your job title</span>
                                </div>
                                <div>
                                    <label htmlFor="profile-company" className="block text-xs font-semibold text-slate-500 uppercase mb-1">Organization</label>
                                    <input 
                                        id="profile-company"
                                        className={INPUT_CLASS} 
                                        value={formData.company} 
                                        onChange={e => setFormData({ ...formData, company: e.target.value })} 
                                        aria-describedby="profile-company-description"
                                    />
                                    <span id="profile-company-description" className="sr-only">Enter your organization name</span>
                                </div>
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
                                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2" role="group" aria-label="Select your current mood">
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
                                                    aria-label={`Set mood to ${mood}`}
                                                    aria-pressed={isSelected}
                                                    className={`p-2 sm:p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 min-h-[60px] sm:min-h-[80px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isSelected
                                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 text-slate-600 dark:text-slate-400'
                                                        }`}
                                                >
                                                    <span aria-hidden="true">{moodIcons[mood]}</span>
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
                        <div className="space-y-4 sm:space-y-6 animate-in fade-in">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Preferences</h2>
                            {user.role === Role.MENTOR && (
                                <div className={CARD_CLASS}>
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-4">Mentorship Capacity</h3>
                                    <div className="space-y-4">
                                        <label 
                                            onClick={toggleAcceptingNewMentees}
                                            className="flex items-center justify-between p-3 sm:p-4 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <div className="flex-1">
                                                <span className="text-sm font-medium">Accepting New Mentees</span>
                                                {hasReachedQuota && (
                                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                        ⚠️ Quota reached ({mentorActiveMatches}/{maxMenteesLimit} mentees)
                                                    </p>
                                                )}
                                            </div>
                                            <span aria-hidden="true">
                                            {isAcceptingNewMentees ? (
                                                    <ToggleRight className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                                            ) : (
                                                    <ToggleLeft className="w-6 h-6 text-slate-400 flex-shrink-0" />
                                            )}
                                            </span>
                                        </label>
                                        <div>
                                            <label htmlFor="max-mentees" className="block text-xs font-semibold text-slate-500 mb-1">Max Mentees</label>
                                            <select 
                                                id="max-mentees"
                                                className={INPUT_CLASS}
                                                value={maxMentees}
                                                onChange={(e) => handleMaxMenteesChange(parseInt(e.target.value, 10))}
                                                aria-describedby="max-mentees-description"
                                            >
                                                <option value={1}>1</option>
                                                <option value={2}>2</option>
                                                <option value={3}>3</option>
                                                <option value={4}>4</option>
                                                <option value={5}>5</option>
                                            </select>
                                            <span id="max-mentees-description" className="sr-only">Select maximum number of mentees you can mentor</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {user.role === Role.MENTEE && (
                                <div className={CARD_CLASS}>
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-4">Learning Visibility</h3>
                                    <div className="space-y-4">
                                        <label className="flex items-center justify-between p-3 sm:p-4 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500">
                                            <span className="text-sm font-medium">Make Goals Public</span>
                                            <button onClick={toggleGoalsPublic} type="button" aria-label={goalsPublic ? "Make goals private" : "Make goals public"} className="focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded">
                                                <span aria-hidden="true">
                                                    {goalsPublic ? <ToggleRight className="w-6 h-6 text-emerald-500 flex-shrink-0" /> : <ToggleLeft className="w-6 h-6 text-slate-400 flex-shrink-0" />}
                                                </span>
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
                                <label className="flex items-center justify-between p-3 sm:p-4 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500">
                                    <span className="text-sm font-medium flex items-center"><Moon className="w-4 h-4 mr-2" aria-hidden="true" /> Dark Mode</span>
                                    <button onClick={toggleDarkMode} aria-label={darkMode ? "Disable dark mode" : "Enable dark mode"} className="focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded">
                                        <span aria-hidden="true">
                                            {darkMode ? <ToggleRight className="w-6 h-6 text-emerald-500 flex-shrink-0" /> : <ToggleLeft className="w-6 h-6 text-slate-400 flex-shrink-0" />}
                                        </span>
                                    </button>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-4 sm:space-y-6 animate-in fade-in">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Notification Preferences</h2>
                            <div className="space-y-3 sm:space-y-4">
                                {Object.entries(notificationPrefs).map(([category, prefs]) => {
                                    const typedPrefs = prefs as { email: boolean; push: boolean };
                                    return (
                                        <div key={category} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg gap-3 sm:gap-0">
                                            <span className="font-medium text-slate-700 dark:text-slate-200 text-sm sm:text-base">{category}</span>
                                            <div className="flex gap-4 sm:gap-6">
                                                <label className="flex items-center cursor-pointer space-x-2 min-h-[44px] touch-manipulation">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">Email</span>
                                                    <button 
                                                        onClick={() => togglePref(category, 'email')}
                                                        aria-label={`${typedPrefs.email ? 'Disable' : 'Enable'} email notifications for ${category}`}
                                                        className="focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
                                                    >
                                                        <span aria-hidden="true">
                                                        {typedPrefs.email ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />}
                                                        </span>
                                                    </button>
                                                </label>
                                                <label className="flex items-center cursor-pointer space-x-2 min-h-[44px] touch-manipulation">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">In-App</span>
                                                    <button 
                                                        onClick={() => togglePref(category, 'push')}
                                                        aria-label={`${typedPrefs.push ? 'Disable' : 'Enable'} in-app notifications for ${category}`}
                                                        className="focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
                                                    >
                                                        <span aria-hidden="true">
                                                        {typedPrefs.push ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />}
                                                        </span>
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
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Security & Login</h2>

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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="new-password" className="block text-xs font-semibold text-slate-500 uppercase mb-1">New Password</label>
                                            <input 
                                                id="new-password"
                                                type="password" 
                                                className={INPUT_CLASS} 
                                                value={passwordForm.new} 
                                                onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} 
                                                aria-describedby="new-password-description"
                                            />
                                            <span id="new-password-description" className="sr-only">Enter your new password</span>
                                        </div>
                                        <div>
                                            <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-500 uppercase mb-1">Confirm New Password</label>
                                            <input 
                                                id="confirm-password"
                                                type="password" 
                                                className={INPUT_CLASS} 
                                                value={passwordForm.confirm} 
                                                onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} 
                                                aria-describedby="confirm-password-description"
                                            />
                                            <span id="confirm-password-description" className="sr-only">Confirm your new password</span>
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
                                    <button 
                                        onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                                        aria-label={twoFactorEnabled ? "Disable two-factor authentication" : "Enable two-factor authentication"}
                                        className="min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded touch-manipulation"
                                    >
                                        <span aria-hidden="true">
                                        {twoFactorEnabled ? <ToggleRight className="w-10 h-10 text-emerald-500" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                                        </span>
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
                                {devicesLoading ? (
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Loading devices...</div>
                                ) : devices.length === 0 ? (
                                    <div className="text-sm text-slate-500 dark:text-slate-400">No active sessions</div>
                                ) : (
                                    <div className="space-y-3">
                                        {devices.map((device) => {
                                            const isCurrent = device.deviceId === currentDeviceId || device.isCurrentDevice;
                                            const lastActive = new Date(device.lastActiveAt);
                                            const now = new Date();
                                            const diffMs = now.getTime() - lastActive.getTime();
                                            const diffMins = Math.floor(diffMs / 60000);
                                            const diffHours = Math.floor(diffMins / 60);
                                            const diffDays = Math.floor(diffHours / 24);
                                            
                                            let timeAgo = 'Active Now';
                                            if (diffMins < 1) {
                                                timeAgo = 'Active Now';
                                            } else if (diffMins < 60) {
                                                timeAgo = `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
                                            } else if (diffHours < 24) {
                                                timeAgo = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
                                            } else {
                                                timeAgo = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
                                            }

                                            const Icon = device.platform === 'ios' || device.platform === 'android' ? Smartphone : Globe;
                                            const platformColor = device.platform === 'ios' ? 'text-blue-500' : 
                                                                  device.platform === 'android' ? 'text-green-500' : 
                                                                  'text-slate-600 dark:text-slate-400';

                                            return (
                                                <div 
                                                    key={device.deviceId}
                                                    className={`bg-white dark:bg-slate-900 border ${isCurrent ? 'border-emerald-500' : 'border-slate-200 dark:border-slate-800'} p-4 rounded-xl flex justify-between items-center ${isCurrent ? 'shadow-sm' : ''}`}
                                                >
                                                    <div className="flex items-center flex-1 min-w-0">
                                                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg mr-4 flex-shrink-0">
                                                            <Icon className={`w-6 h-6 ${platformColor}`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-slate-800 dark:text-white text-sm truncate">
                                                                {device.deviceName}
                                                                {isCurrent && ' (This Device)'}
                                                            </p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                {device.location ? `${device.location} • ` : ''}
                                                                {timeAgo}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 ml-4">
                                                        {isCurrent && (
                                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded flex-shrink-0">
                                                                Current
                                                            </span>
                                                        )}
                                                        {!isCurrent && (
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm(`Are you sure you want to revoke access for ${device.deviceName}?`)) {
                                                                        setRevokingDeviceId(device.deviceId);
                                                                        try {
                                                                            await revokeDevice(device.deviceId);
                                                                        } catch (error) {
                                                                            console.error('Error revoking device:', error);
                                                                            alert('Failed to revoke device. Please try again.');
                                                                        } finally {
                                                                            setRevokingDeviceId(null);
                                                                        }
                                                                    }
                                                                }}
                                                                disabled={revokingDeviceId === device.deviceId}
                                                                className="text-xs text-red-500 font-medium hover:underline disabled:opacity-50 flex-shrink-0"
                                                            >
                                                                {revokingDeviceId === device.deviceId ? 'Revoking...' : 'Revoke'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
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
                        <div className="space-y-4 sm:space-y-6 animate-in fade-in">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Sync Calendar</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Connect your calendars to automatically sync meetings and receive reminders. You can connect multiple calendars.
                            </p>
                            <div className="space-y-4">
                                {/* Google Calendar */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl gap-3 sm:gap-0">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold mr-4 flex-shrink-0" aria-hidden="true">G</div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">Google Calendar</p>
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
                                            aria-label="Disconnect Google Calendar"
                                            className="text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 px-4 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-auto"
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
                                            aria-label="Connect Google Calendar"
                                            className="text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-4 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto"
                                        >
                                            {calendarSyncing.google ? 'Connecting...' : 'Connect'}
                                        </button>
                                    )}
                                </div>

                                {/* Outlook Calendar */}
                                <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl opacity-60">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-500 dark:text-blue-400 font-bold mr-4">O</div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white">Outlook Calendar</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Coming soon
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                                        Coming Soon
                                    </span>
                                </div>

                                {/* Apple Calendar */}
                                <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl opacity-60">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center text-red-500 dark:text-red-400 font-bold mr-4">A</div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white">Apple Calendar</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Coming soon
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                                        Coming Soon
                                    </span>
                                </div>
                            </div>
                            {googleConnected && (
                                <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                                    <p className="text-sm text-emerald-800 dark:text-emerald-200">
                                        <CheckCircle className="w-4 h-4 inline mr-2" />
                                        Google Calendar connected. New meetings will automatically sync to your calendar.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'billing' && isOrgAdmin && (
                        <div className="space-y-4 sm:space-y-6 animate-in fade-in">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Billing & Subscription</h2>

                            {/* Current Plan */}
                            <div className={CARD_CLASS}>
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-1">Current Plan</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {currentPlan === 'trial' && (isOnTrial 
                                                ? `Free Trial (${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} remaining)`
                                                : 'Trial Expired - Please Select a Plan'
                                            )}
                                            {currentPlan === 'starter' && 'Starter Plan'}
                                            {currentPlan === 'professional' && 'Professional Plan'}
                                            {currentPlan === 'business' && 'Business Plan'}
                                            {currentPlan === 'enterprise' && 'Enterprise Plan'}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        currentPlan === 'trial'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                            : currentPlan === 'enterprise'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                : currentPlan === 'business'
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                    : currentPlan === 'professional'
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}>
                                        {currentPlan === 'trial' 
                                            ? (isOnTrial ? 'Free Trial' : 'Trial Expired')
                                            : currentPlan === 'enterprise' 
                                                ? 'Enterprise' 
                                                : currentPlan === 'business' 
                                                    ? 'Business' 
                                                    : currentPlan === 'professional' 
                                                        ? 'Professional' 
                                                        : 'Starter'}
                                    </span>
                                </div>

                                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                                    {currentPlan === 'trial' ? (
                                        <>
                                            {isOnTrial ? (
                                                <>
                                                    <div className="flex items-baseline justify-between mb-2">
                                                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                                                            Free
                                                        </span>
                                                        <span className="text-sm text-slate-500 dark:text-slate-400">
                                                            for {trialDaysRemaining} more day{trialDaysRemaining !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                        Full access to all features during your 14-day trial
                                                    </p>
                                                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-2">
                                                        ⚠️ Select a plan before trial ends to continue service
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-baseline justify-between mb-2">
                                                        <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                            Trial Expired
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                                                        ⚠️ Please select a paid plan to continue using Meant2Grow
                                                    </p>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Change Plan */}
                            <div className={CARD_CLASS}>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4">
                                    {currentPlan === 'trial' ? 'Select a Plan' : 'Change Plan'}
                                </h3>
                                <div className="space-y-3">
                                    {currentPlan !== 'starter' && currentPlan !== 'trial' && (
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl gap-3 sm:gap-0">
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">Starter</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">$99/month • 1-99 participants</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setTargetPlan('starter');
                                                    setShowUpgradeModal(true);
                                                }}
                                                aria-label={`${['professional', 'business', 'enterprise'].includes(currentPlan) ? 'Downgrade' : 'Upgrade'} to Starter plan`}
                                                className={`flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto ${['professional', 'business', 'enterprise'].includes(currentPlan)
                                                    ? 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                    }`}
                                            >
                                                {['professional', 'business', 'enterprise'].includes(currentPlan) ? (
                                                    <>
                                                        <ArrowDown className="w-4 h-4 mr-1" aria-hidden="true" /> Downgrade
                                                    </>
                                                ) : (
                                                    <>
                                                        <ArrowUp className="w-4 h-4 mr-1" aria-hidden="true" /> Upgrade
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
                                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    currentPlan === 'trial' || currentPlan === 'starter'
                                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                        : currentPlan === 'business' || currentPlan === 'enterprise'
                                                            ? 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                }`}
                                            >
                                                {currentPlan === 'trial' ? (
                                                    <>
                                                        <ArrowUp className="w-4 h-4 mr-1" /> Select Plan
                                                    </>
                                                ) : currentPlan === 'starter' ? (
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
                                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    currentPlan === 'trial' || ['starter', 'professional'].includes(currentPlan)
                                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                        : currentPlan === 'enterprise'
                                                            ? 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                }`}
                                            >
                                                {currentPlan === 'trial' ? (
                                                    <>
                                                        <ArrowUp className="w-4 h-4 mr-1" /> Select Plan
                                                    </>
                                                ) : ['starter', 'professional'].includes(currentPlan) ? (
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
                                                <ArrowUp className="w-4 h-4 mr-1" /> {currentPlan === 'trial' ? 'Contact Sales' : 'Contact Sales'}
                                            </button>
                                        </div>
                                    )}
                                    {currentPlan === 'trial' && (
                                        <div className="flex items-center justify-between p-4 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white">Starter</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">$99/month • 1-99 participants</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setTargetPlan('starter');
                                                    setShowUpgradeModal(true);
                                                }}
                                                className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                                            >
                                                <ArrowUp className="w-4 h-4 mr-1" /> Select Plan
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment Method - PCI Compliant: Only showing last 4 digits from Flowglad */}
                            <div className={CARD_CLASS}>
                                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                                    <CreditCard className="w-5 h-5 mr-2 text-emerald-500" /> Payment Method
                                </h3>
                                {billingData?.paymentMethods && billingData.paymentMethods.length > 0 ? (
                                    <div className="space-y-3">
                                        {billingData.paymentMethods.map((pm) => (
                                            <div key={pm.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mr-4">
                                                        <CreditCard className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-white text-sm">
                                                            {pm.brand ? pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1) : 'Card'} •••• {pm.last4 || '****'}
                                                        </p>
                                                        {pm.expMonth && pm.expYear && (
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                Expires {pm.expMonth}/{pm.expYear}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleManageSubscription}
                                                    disabled={isBillingLoading}
                                                    className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                                                >
                                                    Manage
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mr-4">
                                                <CreditCard className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-slate-600 dark:text-slate-400 text-sm">No payment method on file</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Add one when you upgrade your plan</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Billing History - Fetched from Flowglad */}
                            <div className={CARD_CLASS}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center">
                                        <History className="w-5 h-5 mr-2 text-emerald-500" /> Billing History
                                    </h3>
                                    {billingData?.portalUrl && (
                                        <button
                                            onClick={handleManageSubscription}
                                            disabled={isBillingLoading}
                                            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                                        >
                                            View all in portal
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {billingData?.invoices && billingData.invoices.length > 0 ? (
                                        billingData.invoices.slice(0, 5).map((inv) => {
                                            const invoice = inv.invoice;
                                            const date = new Date(invoice.invoiceDate).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            });
                                            const statusColors: Record<string, string> = {
                                                paid: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
                                                open: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                                                draft: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
                                                void: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                                                uncollectible: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                                            };
                                            return (
                                                <div key={invoice.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                    <div>
                                                        <p className="font-medium text-slate-800 dark:text-white text-sm">
                                                            {invoice.invoiceNumber || 'Invoice'}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{date}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[invoice.status] || statusColors.draft}`}>
                                                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                        </span>
                                                        {invoice.pdfURL && (
                                                            <a
                                                                href={invoice.pdfURL}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                                            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No billing history yet</p>
                                            <p className="text-xs mt-1">Invoices will appear here after your first payment</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cancel Subscription */}
                            {currentPlan !== 'trial' && currentPlan !== 'enterprise' && (
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
                                <div 
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="upgrade-modal-title"
                                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4"
                                    onClick={(e) => {
                                        if (e.target === e.currentTarget) {
                                            setShowUpgradeModal(false);
                                        }
                                    }}
                                >
                                    <div className="bg-white dark:bg-slate-900 rounded-none sm:rounded-xl shadow-xl max-w-md w-full h-full sm:h-auto p-4 sm:p-6 border-0 sm:border border-slate-200 dark:border-slate-800 touch-action-pan-y max-h-[100vh] sm:max-h-[90vh] overflow-y-auto flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 id="upgrade-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Confirm Plan Change</h3>
                                            <button 
                                                onClick={() => setShowUpgradeModal(false)}
                                                aria-label="Close modal"
                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation"
                                            >
                                                <X className="w-5 h-5" aria-hidden="true" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                                            {targetPlan === 'starter' && 'You\'re changing to the Starter plan at $99/month (1-99 participants).'}
                                            {targetPlan === 'professional' && 'You\'re changing to the Professional plan at $199/month (100-399 participants).'}
                                            {targetPlan === 'business' && 'You\'re changing to the Business plan at $299/month (400-999 participants).'}
                                            {targetPlan === 'enterprise' && 'You\'re upgrading to the Enterprise plan. Our sales team will contact you to discuss custom pricing for 1000+ participants.'}
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button
                                                onClick={() => setShowUpgradeModal(false)}
                                                disabled={isBillingLoading}
                                                aria-label="Cancel plan change"
                                                className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-slate-500"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (targetPlan === 'enterprise') {
                                                        window.location.href = 'mailto:sales@meant2grow.com';
                                                        setShowUpgradeModal(false);
                                                    } else {
                                                        const tier = PRICING_TIERS[targetPlan as keyof typeof PRICING_TIERS];
                                                        if (tier && tier.monthlyPriceId) {
                                                            // Use the actual Flowglad price ID for checkout
                                                            handleUpgrade(tier.monthlyPriceId);
                                                            setShowUpgradeModal(false);
                                                        }
                                                    }
                                                }}
                                                disabled={isBillingLoading}
                                                aria-label="Continue to checkout"
                                                className={`${BUTTON_PRIMARY} flex-1 min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${isBillingLoading ? " opacity-50" : ""}`}
                                            >
                                                {isBillingLoading ? 'Redirecting to checkout...' : 'Continue to Checkout'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cancel Confirmation Modal */}
                            {showCancelConfirm && (
                                <div 
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="cancel-modal-title"
                                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4"
                                    onClick={(e) => {
                                        if (e.target === e.currentTarget) {
                                            setShowCancelConfirm(false);
                                        }
                                    }}
                                >
                                    <div className="bg-white dark:bg-slate-900 rounded-none sm:rounded-xl shadow-xl max-w-md w-full h-full sm:h-auto p-4 sm:p-6 border-0 sm:border border-slate-200 dark:border-slate-800 touch-action-pan-y max-h-[100vh] sm:max-h-[90vh] overflow-y-auto flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 id="cancel-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Cancel Subscription</h3>
                                            <button 
                                                onClick={() => setShowCancelConfirm(false)}
                                                aria-label="Close modal"
                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation"
                                            >
                                                <X className="w-5 h-5" aria-hidden="true" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                                            To cancel your subscription, please visit the billing portal.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button
                                                onClick={() => setShowCancelConfirm(false)}
                                                aria-label="Close cancel subscription modal"
                                                className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-slate-500"
                                            >
                                                Close
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleManageSubscription();
                                                    setShowCancelConfirm(false);
                                                }}
                                                disabled={isBillingLoading}
                                                aria-label="Go to billing portal"
                                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                            >
                                                {isBillingLoading ? 'Redirecting...' : 'Go to Portal'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(
                        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                            {showSuccess && (
                                <span className="text-emerald-600 text-sm font-medium flex items-center" role="status" aria-live="polite">
                                    <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" aria-hidden="true" /> 
                                    Changes saved successfully
                                </span>
                            )}
                            <button 
                                onClick={handleSave} 
                                aria-label="Save changes"
                                className={`${BUTTON_PRIMARY} min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 w-full sm:w-auto sm:ml-auto`}
                            >
                                <Save className="w-4 h-4 mr-2" aria-hidden="true" /> 
                                Save Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsView;