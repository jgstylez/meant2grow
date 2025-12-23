import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { Role, User, Notification, ProgramSettings } from "../types";
import { Logo } from "./Logo";

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
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
  const [logoError, setLogoError] = useState(false);

  const formatRole = (role: Role) => {
    switch (role) {
      case Role.ADMIN: return "Organization Admin";
      case Role.PLATFORM_ADMIN: return "Platform Operator";
      case Role.MENTOR: return "Mentor";
      case Role.MENTEE: return "Mentee";
      default: return role;
    }
  };

  // Reset logo error when logo URL changes
  useEffect(() => {
    setLogoError(false);
  }, [programSettings?.logo]);

  // Role checks - handle both enum and string values for robustness
  const userRoleString = String(currentUser.role);
  
  // Check platform admin first (must come before other checks)
  const isPlatformAdmin = currentUser.role === Role.PLATFORM_ADMIN || 
                         userRoleString === "PLATFORM_ADMIN" || 
                         userRoleString === "PLATFORM_OPERATOR";
  
  // Check organization admin (must come after platform admin check)
  const isAdmin = !isPlatformAdmin && (
    currentUser.role === Role.ADMIN || 
    userRoleString === "ORGANIZATION_ADMIN" || 
    userRoleString === "ADMIN"
  );
  
  const isMentor = !isPlatformAdmin && !isAdmin && (
    currentUser.role === Role.MENTOR || 
    userRoleString === "MENTOR"
  );
  
  const isMentee = !isPlatformAdmin && !isAdmin && !isMentor && (
    currentUser.role === Role.MENTEE || 
    userRoleString === "MENTEE"
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const brandColor = programSettings?.accentColor || "#10b981"; // Default Emerald
  const programName = programSettings?.programName || "Meant2Grow";

  const NavItem = ({
    page,
    icon: Icon,
    label,
    className = "",
  }: {
    page: string;
    icon: any;
    label: string;
    className?: string;
  }) => {
    const isActive = currentPage === page;
    return (
      <button
        onClick={() => {
          onNavigate(page);
          setIsMobileMenuOpen(false);
        }}
        style={
          isActive
            ? {
              backgroundColor: `${brandColor}15`, // 10% opacity
              color: brandColor,
              fontWeight: 500,
            }
            : {}
        }
        className={`flex items-center w-full px-3 py-2 mb-0.5 rounded-md transition-colors text-sm ${isActive
          ? "" // Handled by inline style for dynamic color
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
          } ${className}`}
      >
        <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </button>
    );
  };

  const NotificationsPanel = () => (
    <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
        <h3 className="font-bold text-sm text-slate-800 dark:text-white">
          Notifications
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-xs font-medium hover:underline"
            style={{ color: brandColor }}
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="p-4 text-center text-xs text-slate-500">
            No notifications.
          </p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative group ${!n.isRead ? "bg-slate-50/80 dark:bg-slate-800/50" : ""
                }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-xs text-slate-800 dark:text-white">
                  {n.title}
                </span>
                <span className="text-[10px] text-slate-400">
                  {n.timestamp}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                {n.body}
              </p>
              <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                {!n.isRead && (
                  <button
                    onClick={() => onMarkAsRead(n.id)}
                    className="text-[10px] hover:underline"
                    style={{ color: brandColor }}
                  >
                    Read
                  </button>
                )}
                <button
                  onClick={() => onDismiss(n.id)}
                  className="text-[10px] text-slate-400 hover:text-red-500"
                >
                  Dismiss
                </button>
              </div>
              {!n.isRead && (
                <span
                  className="absolute top-3 right-3 w-2 h-2 rounded-full"
                  style={{ backgroundColor: brandColor }}
                ></span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {programSettings?.logo && !logoError ? (
            <img
              src={programSettings.logo}
              alt="Logo"
              className="w-8 h-8 object-contain flex-shrink-0"
              onError={() => setLogoError(true)}
            />
          ) : (
            <Logo className="w-8 h-8 flex-shrink-0" />
          )}
          <span className="font-bold text-sm uppercase text-slate-800 dark:text-white break-words leading-tight" title={programName}>
            {programName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 dark:text-slate-400"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            )}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-400"
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Notification Drawer */}
      {showNotifications && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowNotifications(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-white dark:bg-slate-900 p-4 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Notifications
              </h3>
              <button onClick={() => setShowNotifications(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <p className="text-center text-sm text-slate-500 mt-10">
                  No notifications.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 border-b border-slate-100 dark:border-slate-800 ${!n.isRead ? "bg-slate-50 dark:bg-slate-800" : ""
                      }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm text-slate-800 dark:text-white">
                        {n.title}
                      </span>
                      <span className="text-xs text-slate-400">
                        {n.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {n.body}
                    </p>
                    <div className="flex gap-3 justify-end">
                      {!n.isRead && (
                        <button
                          onClick={() => onMarkAsRead(n.id)}
                          className="text-xs font-medium"
                          style={{ color: brandColor }}
                        >
                          Mark Read
                        </button>
                      )}
                      <button
                        onClick={() => onDismiss(n.id)}
                        className="text-xs text-slate-400"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
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
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 md:z-10
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="p-4 h-full flex flex-col">
          <div className="hidden md:flex items-center mb-4">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              {programSettings?.logo && !logoError ? (
                <img
                  src={programSettings.logo}
                  alt="Logo"
                  className="w-7 h-7 object-contain flex-shrink-0"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Logo className="w-7 h-7 flex-shrink-0" />
              )}
              <span
                className="text-sm font-bold uppercase text-slate-800 dark:text-white tracking-tight break-words leading-tight"
                title={programName}
              >
                {programName}
              </span>
            </div>
          </div>

          <div className="mb-4 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <img
                src={currentUser.avatar}
                alt="User"
                className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-slate-600 shadow-sm"
              />
              <div className="overflow-hidden min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {formatRole(currentUser.role)}
                </p>
              </div>
              {/* Desktop Notification Button */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors relative"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
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
                style={{ borderColor: `${brandColor}40` }}
                className="mt-2 w-full flex items-center justify-center px-2 py-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border rounded-md hover:text-white transition-all group"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = brandColor;
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "";
                  e.currentTarget.style.color = "";
                }}
              >
                <UserPlus className="w-3 h-3 mr-1" /> Invite
              </button>
            )}
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto">
            <NavItem
              page="dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
            />

            {isPlatformAdmin && (
              <>
                <NavItem
                  page="user-management"
                  icon={Users}
                  label="User Management"
                  className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                />
                <NavItem
                  page="settings:platform-admin"
                  icon={Crown}
                  label="Platform Operator"
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
                <NavItem
                  page="participants"
                  icon={Users}
                  label="Users"
                />
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
              className={isAdmin ? "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30" : ""}
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
            </div>
          </nav>

          <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <NavItem page="settings" icon={Settings} label="Settings" />

            <button
              onClick={onLogout}
              className="flex items-center w-full px-3 py-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors group text-sm"
            >
              <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-xs font-medium">Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen p-3 sm:p-4 md:p-8 relative">
        {children}

        {/* Toast Container */}
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)] sm:max-w-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center p-3 sm:p-4 rounded-lg shadow-lg border animate-in slide-in-from-right-4 fade-in text-sm sm:text-base ${toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : toast.type === "error"
                  ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                }`}
            >
              {toast.type === "success" && (
                <CheckCircle className="w-5 h-5 mr-3 text-emerald-500" />
              )}
              {toast.type === "error" && (
                <AlertTriangle className="w-5 h-5 mr-3 text-red-500" />
              )}
              {toast.type === "info" && (
                <Info className="w-5 h-5 mr-3 text-blue-500" />
              )}
              <p className="text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => removeToast?.(toast.id)}
                className="ml-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Layout;
