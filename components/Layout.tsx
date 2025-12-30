import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  LayoutDashboard,
  Repeat,
  Target,
  MessageSquare,
  BookOpen,
  Calendar as CalendarIcon,
  LogOut,
  Menu,
  X,
  UserPlus,
  Globe,
  Settings,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Crown,
  LogIn,
  HelpCircle,
} from "lucide-react";
import { Role, User, Notification, ProgramSettings } from "../types";
import { Logo } from "./Logo";
import { PWAInstallBanner } from "./PWAInstallBanner";

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  users?: User[];
  onNavigate: (page: string) => void;
  currentPage: string;
  onLogout: () => void;
  onSwitchUser: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
  toasts?: {
    id: string;
    message: string;
    type: "success" | "error" | "info";
  }[];
  removeToast?: (id: string) => void;
  programSettings?: ProgramSettings | null;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  currentUser,
  users = [],
  onNavigate,
  currentPage,
  onLogout,
  onSwitchUser,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  toasts = [],
  removeToast,
  programSettings,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const firstNavItemRef = useRef<HTMLButtonElement>(null);

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showNotifications) {
          setShowNotifications(false);
          notificationButtonRef.current?.focus();
        }
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showNotifications, isMobileMenuOpen]);

  // Focus management for mobile menu
  useEffect(() => {
    if (isMobileMenuOpen && mobileMenuRef.current) {
      firstNavItemRef.current?.focus();
    }
  }, [isMobileMenuOpen]);

  const formatRole = (role: Role | string) => {
    const roleString = String(role);

    // Handle enum values
    if (role === Role.ADMIN) return "ORG ADMIN";
    if (role === Role.PLATFORM_ADMIN) return "Platform Operator";
    if (role === Role.MENTOR) return "Mentor";
    if (role === Role.MENTEE) return "Mentee";

    // Handle string values
    if (roleString === "ORGANIZATION_ADMIN" || roleString === "ADMIN")
      return "ORG ADMIN";
    if (roleString === "PLATFORM_ADMIN" || roleString === "PLATFORM_OPERATOR")
      return "Platform Operator";
    if (roleString === "MENTOR") return "Mentor";
    if (roleString === "MENTEE") return "Mentee";

    return roleString;
  };

  // Role checks - handle both enum and string values for robustness
  const userRoleString = String(currentUser.role);

  // Check platform admin first (must come before other checks)
  const isPlatformAdmin =
    currentUser.role === Role.PLATFORM_ADMIN ||
    userRoleString === "PLATFORM_ADMIN" ||
    userRoleString === "PLATFORM_OPERATOR";

  // Check organization admin (must come after platform admin check)
  const isAdmin =
    !isPlatformAdmin &&
    (currentUser.role === Role.ADMIN ||
      userRoleString === "ORGANIZATION_ADMIN" ||
      userRoleString === "ADMIN");

  const isMentor =
    !isPlatformAdmin &&
    !isAdmin &&
    (currentUser.role === Role.MENTOR || userRoleString === "MENTOR");

  const isMentee =
    !isPlatformAdmin &&
    !isAdmin &&
    !isMentor &&
    (currentUser.role === Role.MENTEE || userRoleString === "MENTEE");

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const brandColor = programSettings?.accentColor || "#10b981"; // Default Emerald
  const programName = programSettings?.programName || "Meant2Grow";
  const customLogo = programSettings?.logo;

  // Check if impersonating
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalOperatorId, setOriginalOperatorId] = useState<string | null>(null);

  useEffect(() => {
    const impersonating = localStorage.getItem('isImpersonating') === 'true';
    const originalId = localStorage.getItem('originalOperatorId');
    setIsImpersonating(impersonating);
    setOriginalOperatorId(originalId);
  }, []);

  const handleExitImpersonation = () => {
    const originalId = localStorage.getItem('originalOperatorId');
    const originalOrgId = localStorage.getItem('originalOrganizationId');
    
    if (originalId && originalOrgId) {
      // Restore original operator session
      localStorage.setItem('userId', originalId);
      localStorage.setItem('organizationId', originalOrgId);
      localStorage.removeItem('isImpersonating');
      localStorage.removeItem('originalOperatorId');
      localStorage.removeItem('originalOrganizationId');
      
      // Reload app to trigger re-initialization
      window.location.reload();
    }
  };

  // Handle support navigation - find org admin and navigate to their chat
  const handleSupportClick = () => {
    setIsMobileMenuOpen(false);
    
    // Find the first organization admin in the user's organization
    const orgAdmins = users.filter((u) => {
      const roleStr = String(u.role);
      return (
        u.organizationId === currentUser.organizationId &&
        (u.role === Role.ADMIN || roleStr === "ADMIN" || roleStr === "ORGANIZATION_ADMIN") &&
        !(u.role === Role.PLATFORM_ADMIN || roleStr === "PLATFORM_ADMIN" || roleStr === "PLATFORM_OPERATOR") &&
        u.id !== currentUser.id // Don't select self if user is an admin
      );
    });

    if (orgAdmins.length > 0) {
      // Navigate to chat with the first org admin
      onNavigate(`chat:${orgAdmins[0].id}`);
    } else {
      // If no admin found, just navigate to chat page
      onNavigate("chat");
    }
  };

  const NavItem = ({
    page,
    icon: Icon,
    label,
    className = "",
    isFirst = false,
  }: {
    page: string;
    icon: any;
    label: string;
    className?: string;
    isFirst?: boolean;
  }) => {
    const isActive = currentPage === page;
    return (
      <button
        ref={isFirst ? firstNavItemRef : undefined}
        onClick={() => {
          onNavigate(page);
          setIsMobileMenuOpen(false);
        }}
        aria-label={`Navigate to ${label}`}
        aria-current={isActive ? "page" : undefined}
        style={
          isActive
            ? {
                backgroundColor: `${brandColor}15`, // 10% opacity
                color: brandColor,
                fontWeight: 500,
              }
            : {}
        }
        className={`flex items-center w-full px-3 py-2.5 mb-0.5 rounded-md transition-colors text-sm min-h-[44px] touch-manipulation ${
          isActive
            ? "" // Handled by inline style for dynamic color
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${className}`}
      >
        <Icon className="w-4 h-4 mr-2 flex-shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </button>
    );
  };

  const NotificationsPanel = () => (
    <div
      role="dialog"
      aria-label="Notifications"
      aria-modal="true"
      className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 touch-action-pan-y"
    >
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
        <h3 className="font-bold text-sm text-slate-800 dark:text-white">
          Notifications
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            aria-label={`Mark all ${unreadCount} notifications as read`}
            className="text-xs font-medium hover:underline min-h-[32px] min-w-[32px] px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
            style={{ color: brandColor }}
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto touch-action-pan-y">
        {notifications.length === 0 ? (
          <p className="p-4 text-center text-xs text-slate-500" role="status">
            No notifications.
          </p>
        ) : (
          <ul
            role="list"
            className="divide-y divide-slate-100 dark:divide-slate-800"
          >
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative group ${
                  !n.isRead ? "bg-slate-50/80 dark:bg-slate-800/50" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-xs text-slate-800 dark:text-white">
                    {n.title}
                  </span>
                  <time
                    className="text-[10px] text-slate-400"
                    dateTime={n.timestamp}
                  >
                    {n.timestamp}
                  </time>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                  {n.body}
                </p>
                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                  {!n.isRead && (
                    <button
                      onClick={() => onMarkAsRead(n.id)}
                      aria-label={`Mark notification "${n.title}" as read`}
                      className="text-[10px] hover:underline min-h-[32px] px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      style={{ color: brandColor }}
                    >
                      Read
                    </button>
                  )}
                  <button
                    onClick={() => onDismiss(n.id)}
                    aria-label={`Dismiss notification "${n.title}"`}
                    className="text-[10px] text-slate-400 hover:text-red-500 min-h-[32px] px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Dismiss
                  </button>
                </div>
                {!n.isRead && (
                  <span
                    className="absolute top-3 right-3 w-2 h-2 rounded-full"
                    style={{ backgroundColor: brandColor }}
                    aria-label="Unread notification"
                  ></span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-2 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <LogIn className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate">
                You are viewing as <strong>{currentUser.name}</strong> ({formatRole(currentUser.role)})
              </span>
            </div>
            <button
              onClick={handleExitImpersonation}
              className="px-4 py-1.5 bg-white text-amber-600 rounded-lg font-medium text-sm hover:bg-amber-50 transition-colors flex items-center gap-2 flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
              Exit Impersonation
            </button>
          </div>
        </div>
      )}
      
      {/* PWA Installation Banner - Only shows on authenticated dashboard pages */}
      <PWAInstallBanner currentUser={currentUser} />
      
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
      >
        Skip to main content
      </a>

      {/* Mobile Header */}
      <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <Logo className="w-8 h-8 flex-shrink-0" title="Meant2Grow" />
          <span className="font-bold text-sm uppercase text-slate-800 dark:text-white break-words leading-tight">
            Meant2Grow
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            ref={notificationButtonRef}
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label={`Notifications${
              unreadCount > 0 ? `, ${unreadCount} unread` : ""
            }`}
            aria-expanded={showNotifications}
            className="relative p-2.5 text-slate-600 dark:text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation"
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"
                aria-label={`${unreadCount} unread notifications`}
              ></span>
            )}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            className="p-2.5 text-slate-600 dark:text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation"
          >
            {isMobileMenuOpen ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Notification Drawer */}
      {showNotifications && (
        <div
          role="dialog"
          aria-label="Notifications"
          aria-modal="true"
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowNotifications(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-white dark:bg-slate-900 p-4 shadow-xl flex flex-col touch-action-pan-y"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                Notifications
              </h2>
              <button
                onClick={() => setShowNotifications(false)}
                aria-label="Close notifications"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation"
              >
                <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 touch-action-pan-y">
              {notifications.length === 0 ? (
                <p
                  className="text-center text-sm text-slate-500 mt-10"
                  role="status"
                >
                  No notifications.
                </p>
              ) : (
                <ul
                  role="list"
                  className="divide-y divide-slate-100 dark:divide-slate-800"
                >
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`p-4 ${
                        !n.isRead ? "bg-slate-50 dark:bg-slate-800" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm text-slate-800 dark:text-white">
                          {n.title}
                        </span>
                        <time
                          className="text-xs text-slate-400"
                          dateTime={n.timestamp}
                        >
                          {n.timestamp}
                        </time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {n.body}
                      </p>
                      <div className="flex gap-3 justify-end">
                        {!n.isRead && (
                          <button
                            onClick={() => onMarkAsRead(n.id)}
                            aria-label={`Mark notification "${n.title}" as read`}
                            className="text-xs font-medium min-h-[32px] px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation"
                            style={{ color: brandColor }}
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => onDismiss(n.id)}
                          aria-label={`Dismiss notification "${n.title}"`}
                          className="text-xs text-slate-400 min-h-[32px] px-3 py-1 rounded hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 touch-manipulation"
                        >
                          Dismiss
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={mobileMenuRef}
        aria-label="Main navigation"
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out touch-action-pan-y
        md:relative md:translate-x-0 md:z-10
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        ${isImpersonating ? "top-12 md:top-0" : ""}
      `}
      >
        <div className="p-4 h-full flex flex-col touch-action-pan-y">
          <div className="hidden md:flex items-center mb-4">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Logo className="w-7 h-7 flex-shrink-0" title="Meant2Grow" />
              <span className="text-sm font-bold uppercase text-slate-800 dark:text-white tracking-tight break-words leading-tight">
                Meant2Grow
              </span>
            </div>
          </div>

          <div className="mb-4 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <img
                src={currentUser.avatar}
                alt={`${currentUser.name || "User"}'s avatar`}
                className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-slate-600 shadow-sm"
              />
              <div className="overflow-hidden min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {currentUser.name &&
                  currentUser.name.trim() &&
                  currentUser.name !== "Admin"
                    ? currentUser.name
                    : "User Admin"}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {formatRole(currentUser.role)}
                </p>
              </div>
              {/* Desktop Notification Button */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label={`Notifications${
                    unreadCount > 0 ? `, ${unreadCount} unread` : ""
                  }`}
                  aria-expanded={showNotifications}
                  className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors relative min-h-[32px] min-w-[32px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <Bell className="w-4 h-4" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"
                      aria-label={`${unreadCount} unread notifications`}
                    ></span>
                  )}
                </button>
                {showNotifications && <NotificationsPanel />}
              </div>
            </div>

            {!isAdmin && (
              <button
                onClick={() => {
                  onNavigate("referrals");
                  setIsMobileMenuOpen(false);
                }}
                aria-label="Invite users"
                style={{ borderColor: `${brandColor}40` }}
                className="mt-2 w-full flex items-center justify-center px-2 py-2.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border rounded-md hover:text-white transition-all group min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = brandColor;
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "";
                  e.currentTarget.style.color = "";
                }}
              >
                <UserPlus className="w-3 h-3 mr-1" aria-hidden="true" /> Invite
              </button>
            )}
          </div>

          <nav
            aria-label="Main navigation"
            className="flex-1 space-y-0.5 overflow-y-auto touch-action-pan-y"
          >
            <NavItem
              page="dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              isFirst={true}
            />

            {isPlatformAdmin && (
              <>
                <NavItem
                  page="user-management"
                  icon={Users}
                  label="Users"
                  className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                />
                <NavItem
                  page="platform-operator-management"
                  icon={Crown}
                  label="Operators"
                  className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                />
              </>
            )}

            {/* Management Section for Org Admins */}
            {isAdmin && (
              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="px-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Manage
                </p>
                <NavItem page="participants" icon={Users} label="Users" />
                <NavItem page="matching" icon={Repeat} label="Bridges" />
              </div>
            )}

            {isMentee && (
              <NavItem page="my-goals" icon={Target} label="My Goals" />
            )}

            <NavItem page="chat" icon={MessageSquare} label="Messages" />
            <NavItem
              page="resources"
              icon={BookOpen}
              label="Resources"
              className={
                isAdmin
                  ? "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                  : ""
              }
            />
            <NavItem page="calendar" icon={CalendarIcon} label="Calendar" />

            {/* Community Links */}
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="px-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Community
              </p>
              {/* Mentors Circle: visible to mentors and org admins */}
              {(isMentor || isAdmin) && (
                <NavItem
                  page="chat-mentors"
                  icon={Globe}
                  label="Mentors Circle"
                  className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300"
                />
              )}
              {/* Mentees Hub: visible to mentees and org admins */}
              {(isMentee || isAdmin) && (
                <NavItem
                  page="chat-mentees"
                  icon={Users}
                  label="Mentees Hub"
                  className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300"
                />
              )}
              {/* Support: visible to all users except platform admins */}
              {!isPlatformAdmin && (
                <button
                  onClick={handleSupportClick}
                  aria-label="Contact support"
                  className="flex items-center w-full px-3 py-2.5 mb-0.5 rounded-md transition-colors text-sm min-h-[44px] touch-manipulation text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  <HelpCircle className="w-4 h-4 mr-2 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">Support</span>
                </button>
              )}
            </div>
          </nav>

          <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <NavItem page="settings" icon={Settings} label="Settings" />

            <button
              onClick={onLogout}
              aria-label="Log out"
              className="flex items-center w-full px-3 py-2.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors group text-sm min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <LogOut
                className="w-4 h-4 mr-2 flex-shrink-0"
                aria-hidden="true"
              />
              <span className="text-xs font-medium">Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        id="main-content"
        className={`flex-1 overflow-y-auto h-screen p-3 sm:p-4 md:p-8 relative touch-action-pan-y ${
          isImpersonating ? 'pt-16' : ''
        }`}
        role="main"
        style={{ paddingTop: 'var(--pwa-banner-offset, 0px)' }}
      >
        {children}

        {/* Toast Container */}
        <div
          role="region"
          aria-label="Notifications"
          aria-live="polite"
          aria-atomic="false"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)] sm:max-w-none"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto flex items-center p-3 sm:p-4 rounded-lg shadow-lg border animate-in slide-in-from-right-4 fade-in text-sm sm:text-base min-h-[44px] ${
                toast.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                  : toast.type === "error"
                  ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              }`}
            >
              {toast.type === "success" && (
                <CheckCircle
                  className="w-5 h-5 mr-3 text-emerald-500 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              {toast.type === "error" && (
                <AlertTriangle
                  className="w-5 h-5 mr-3 text-red-500 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              {toast.type === "info" && (
                <Info
                  className="w-5 h-5 mr-3 text-blue-500 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast?.(toast.id)}
                aria-label="Close notification"
                className="ml-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[32px] min-w-[32px] flex items-center justify-center rounded focus:outline-none focus:ring-2 focus:ring-slate-500 touch-manipulation"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Layout;
