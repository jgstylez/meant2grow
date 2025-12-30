import React, { useState, useEffect, useCallback, useRef } from "react";
import { User, Organization, Role } from "../types";
import {
  getAllUsers,
  getAllOrganizations,
  updateUser,
  deleteUser,
  updateOrganization,
  deleteOrganization,
} from "../services/database";
import { emailService } from "../services/emailService";
import { CARD_CLASS, INPUT_CLASS, BUTTON_PRIMARY } from "../styles/common";
import {
  Users,
  Search,
  Filter,
  Edit2,
  Trash2,
  Building,
  Mail,
  User as UserIcon,
  Shield,
  Crown,
  GraduationCap,
  UserCheck,
  X,
  Save,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  Globe,
  CheckCircle,
  Send,
  LogIn,
} from "lucide-react";

interface UserManagementProps {
  currentUser: User;
  onNavigate?: (page: string) => void;
  initialTab?: "users" | "organizations";
}

const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  onNavigate,
  initialTab = "users",
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [participantTypeFilter, setParticipantTypeFilter] = useState<
    "MENTOR" | "MENTEE" | "ALL"
  >("ALL");
  const [orgFilter, setOrgFilter] = useState<string>("ALL");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"users" | "organizations">(
    initialTab
  );

  // Pagination state
  const [usersPage, setUsersPage] = useState(1);
  const [orgsPage, setOrgsPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [orgsPerPage, setOrgsPerPage] = useState(10);

  const [stats, setStats] = useState({
    totalUsers: 0,
    platformAdmins: 0,
    orgAdmins: 0,
    mentors: 0,
    mentees: 0,
    totalOrgs: 0,
  });
  
  // Email functionality for platform operators
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedOrgAdmins, setSelectedOrgAdmins] = useState<Set<string>>(
    new Set()
  );
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Impersonation functionality
  const [impersonateUser, setImpersonateUser] = useState<User | null>(null);
  
  // Check if current user is platform admin
  const userRoleString = String(currentUser.role);
  const isPlatformAdmin =
    currentUser.role === Role.PLATFORM_ADMIN ||
                         userRoleString === "PLATFORM_ADMIN" || 
                         userRoleString === "PLATFORM_OPERATOR";

  // Use ref to track if data is currently loading to prevent concurrent loads
  const isLoadingRef = useRef(false);

  // Memoize loadData to prevent unnecessary re-creations
  const loadData = useCallback(async () => {
    // Prevent concurrent loads
    if (isLoadingRef.current) {
      console.log("[UserManagement] Already loading, skipping...");
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      console.log("[UserManagement] Loading data...");
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Data loading timeout")), 30000)
      );
      
      // Load data with individual error handling
      let allUsers: User[] = [];
      let allOrgs: Organization[] = [];
      
      try {
        allUsers = await Promise.race([
          getAllUsers(),
          new Promise<User[]>((_, reject) => 
            setTimeout(() => reject(new Error("getAllUsers timeout")), 15000)
          ),
        ]);
      } catch (error: any) {
        console.error("[UserManagement] Error loading users:", error);
        // Continue with empty array if users fail
        allUsers = [];
      }
      
      try {
        allOrgs = await Promise.race([
          getAllOrganizations(),
          new Promise<Organization[]>((_, reject) => 
            setTimeout(
              () => reject(new Error("getAllOrganizations timeout")),
              15000
          )
          ),
        ]);
      } catch (error: any) {
        console.error("[UserManagement] Error loading organizations:", error);
        // Continue with empty array if orgs fail
        allOrgs = [];
      }

      console.log("[UserManagement] Data loaded:", {
        users: allUsers.length,
        orgs: allOrgs.length,
      });

      // Filter out platform operators from users list
      const nonPlatformAdminUsers = allUsers.filter((u) => {
        const userRoleString = String(u.role);
        return u.role !== Role.PLATFORM_ADMIN && 
               userRoleString !== "PLATFORM_ADMIN" && 
               userRoleString !== "PLATFORM_OPERATOR";
      });

      setUsers(nonPlatformAdminUsers);
      setOrganizations(allOrgs);

      // Calculate stats (excluding platform operators)
      const orgAdmins = nonPlatformAdminUsers.filter((u) => u.role === Role.ADMIN).length;
      const mentors = nonPlatformAdminUsers.filter((u) => u.role === Role.MENTOR).length;
      const mentees = nonPlatformAdminUsers.filter((u) => u.role === Role.MENTEE).length;

      setStats({
        totalUsers: nonPlatformAdminUsers.length,
        platformAdmins: 0, // Not shown in this page
        orgAdmins,
        mentors,
        mentees,
        totalOrgs: allOrgs.length,
      });
    } catch (error) {
      console.error("[UserManagement] Error loading data:", error);
      // Set empty arrays on error to prevent undefined state
      setUsers([]);
      setOrganizations([]);
      setStats({
        totalUsers: 0,
        platformAdmins: 0,
        orgAdmins: 0,
        mentors: 0,
        mentees: 0,
        totalOrgs: 0,
      });
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    // Reset loading ref when component mounts
    isLoadingRef.current = false;
    
    // Set a safety timeout to ensure loading doesn't hang forever
    const safetyTimeout = setTimeout(() => {
      if (isLoadingRef.current) {
        console.warn(
          "[UserManagement] Loading timeout after 10s - forcing loading to stop"
        );
        setLoading(false);
        isLoadingRef.current = false;
        // Set empty data to prevent undefined state
        setUsers([]);
        setOrganizations([]);
        setStats({
          totalUsers: 0,
          platformAdmins: 0,
          orgAdmins: 0,
          mentors: 0,
          mentees: 0,
          totalOrgs: 0,
        });
      }
    }, 10000); // 10 second timeout
    
    loadData();
    
    // Cleanup: clear timeout and reset loading state when component unmounts
    return () => {
      clearTimeout(safetyTimeout);
      isLoadingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Update activeTab when initialTab prop changes (but only if it's actually different)
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]); // Only depend on initialTab, not activeTab, to prevent resetting when user clicks tabs

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case Role.PLATFORM_ADMIN:
        return <Crown className="w-4 h-4 text-amber-500" />;
      case Role.ADMIN:
        return <Shield className="w-4 h-4 text-blue-500" />;
      case Role.MENTOR:
        return <GraduationCap className="w-4 h-4 text-emerald-500" />;
      case Role.MENTEE:
        return <UserCheck className="w-4 h-4 text-purple-500" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case Role.PLATFORM_ADMIN:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case Role.ADMIN:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case Role.MENTOR:
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      case Role.MENTEE:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200";
    }
  };

  const getOrganizationName = (orgId: string) => {
    if (orgId === "platform") return "Platform";
    const org = organizations.find((o) => o.id === orgId);
    return org?.name || "Unknown Organization";
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    const matchesParticipantType =
      participantTypeFilter === "ALL" ||
      (participantTypeFilter === "MENTOR" && user.role === Role.MENTOR) ||
      (participantTypeFilter === "MENTEE" && user.role === Role.MENTEE);
    const matchesOrg = orgFilter === "ALL" || user.organizationId === orgFilter;

    return matchesSearch && matchesRole && matchesParticipantType && matchesOrg;
  });

  // Pagination calculations
  const totalUsersPages = Math.ceil(filteredUsers.length / usersPerPage);
  const totalOrgsPages = Math.ceil(organizations.length / orgsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (usersPage - 1) * usersPerPage,
    usersPage * usersPerPage
  );
  const paginatedOrgs = organizations.slice(
    (orgsPage - 1) * orgsPerPage,
    orgsPage * orgsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setUsersPage(1);
  }, [searchQuery, roleFilter, participantTypeFilter, orgFilter]);

  // Reset to page 1 when switching tabs
  useEffect(() => {
    setUsersPage(1);
    setOrgsPage(1);
  }, [activeTab]);

  // Refresh data function that can be called after mutations
  const refreshData = useCallback(async () => {
    isLoadingRef.current = false;
    await loadData();
  }, [loadData]);

  const handleEditUser = async (user: User, updates: Partial<User>) => {
    try {
      await updateUser(user.id, updates);
      await refreshData();
      setEditingUser(null);
    } catch (error: any) {
      console.error("Error updating user:", error);
      alert("Failed to update user: " + error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId);
      await refreshData();
      setShowDeleteConfirm(null);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user: " + error.message);
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    try {
      await deleteOrganization(orgId);
      await refreshData();
      setShowDeleteConfirm(null);
    } catch (error: any) {
      console.error("Error deleting organization:", error);
      alert("Failed to delete organization: " + error.message);
    }
  };

  const handleImpersonateUser = (user: User) => {
    // Security check: Only platform operators can impersonate
    if (!isPlatformAdmin) {
      alert("Only platform operators can impersonate users.");
      return;
    }
    
    // Prevent impersonating yourself
    if (user.id === currentUser.id) {
      alert("You cannot impersonate yourself.");
      return;
    }
    
    // Store original operator context
    localStorage.setItem("originalOperatorId", currentUser.id);
    localStorage.setItem("originalOrganizationId", currentUser.organizationId);
    localStorage.setItem("isImpersonating", "true");
    
    // Switch to target user
    localStorage.setItem("userId", user.id);
    localStorage.setItem("organizationId", user.organizationId);
    
    // Reload the app to trigger re-initialization with new user context
    window.location.reload();
  };

  const toggleUserExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  // Get all organization admins
  const orgAdmins = users.filter((u) => u.role === Role.ADMIN);

  // Toggle org admin selection for email
  const toggleOrgAdminSelection = (userId: string) => {
    const newSelected = new Set(selectedOrgAdmins);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedOrgAdmins(newSelected);
  };

  // Select all org admins
  const selectAllOrgAdmins = () => {
    setSelectedOrgAdmins(new Set(orgAdmins.map((admin) => admin.id)));
  };

  // Deselect all org admins
  const deselectAllOrgAdmins = () => {
    setSelectedOrgAdmins(new Set());
  };

  // Handle sending email to org admins
  const handleSendEmailToAdmins = async () => {
    if (selectedOrgAdmins.size === 0) {
      alert("Please select at least one organization admin to email");
      return;
    }

    if (!emailSubject.trim()) {
      alert("Please enter an email subject");
      return;
    }

    if (!emailBody.trim()) {
      alert("Please enter an email message");
      return;
    }

    try {
      setSendingEmail(true);
      
      const recipients = Array.from(selectedOrgAdmins)
        .map((userId) => {
          const admin = orgAdmins.find((a) => a.id === userId);
          return admin
            ? { email: admin.email, name: admin.name, userId: admin.id }
            : null;
        })
        .filter(
          (r): r is { email: string; name?: string; userId?: string } =>
            r !== null
        );

      await emailService.sendCustomEmail(
        recipients,
        emailSubject,
        emailBody,
        { name: currentUser.name, email: currentUser.email },
        currentUser.id,
        undefined // No organizationId restriction for platform admins
      );

      alert(
        `Email sent successfully to ${recipients.length} organization admin(s)!`
      );
      
      // Reset form
      setShowEmailModal(false);
      setSelectedOrgAdmins(new Set());
      setEmailSubject("");
      setEmailBody("");
    } catch (error: any) {
      console.error("Error sending email:", error);
      alert(`Failed to send email: ${error.message || "Unknown error"}`);
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            User Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage all users and organizations across the platform
          </p>
        </div>
        {isPlatformAdmin && (
          <button
            onClick={() => setShowEmailModal(true)}
            className={`${BUTTON_PRIMARY} flex items-center gap-2`}
          >
            <Mail className="w-4 h-4" />
            Email Org Admins
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className={CARD_CLASS}>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Total Users
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.totalUsers}
          </div>
        </div>
        <div className={CARD_CLASS}>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Mentees
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {stats.mentees}
          </div>
        </div>
        <div className={CARD_CLASS}>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <GraduationCap className="w-3 h-3" /> Mentors
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {stats.mentors}
          </div>
        </div>
        <div className={CARD_CLASS}>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Building className="w-3 h-3" /> Organizations
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.totalOrgs}
          </div>
        </div>
        <div className={CARD_CLASS}>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Org Admins
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {stats.orgAdmins}
        </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 font-medium transition-colors cursor-pointer ${
            activeTab === "users"
              ? "text-emerald-600 border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Users ({users.length})
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveTab("organizations");
          }}
          className={`px-4 py-2 font-medium transition-colors cursor-pointer ${
            activeTab === "organizations"
              ? "text-emerald-600 border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
        >
          <Building className="w-4 h-4 inline mr-2" />
          Organizations ({organizations.length})
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={INPUT_CLASS + " pl-10"}
              />
            </div>
            <select
              value={participantTypeFilter}
              onChange={(e) =>
                setParticipantTypeFilter(
                  e.target.value as "MENTOR" | "MENTEE" | "ALL"
                )
              }
              className={INPUT_CLASS + " w-full sm:w-40"}
            >
              <option value="ALL">All Participants</option>
              <option value="MENTOR">Mentors Only</option>
              <option value="MENTEE">Mentees Only</option>
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | "ALL")}
              className={INPUT_CLASS + " w-full sm:w-48"}
            >
              <option value="ALL">All Roles</option>
              <option value={Role.ADMIN}>Organization Admin</option>
              <option value={Role.MENTOR}>Mentor</option>
              <option value={Role.MENTEE}>Mentee</option>
            </select>
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className={INPUT_CLASS + " w-full sm:w-64"}
            >
              <option value="ALL">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
              <option value="platform">Platform</option>
            </select>
          </div>

          {/* Users List */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className={CARD_CLASS + " text-center py-8"}>
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500">No users found</p>
              </div>
            ) : (
              <>
                {paginatedUsers.map((user) => (
                <div
                  key={user.id}
                    className={
                      CARD_CLASS +
                      " cursor-pointer hover:shadow-md transition-shadow"
                    }
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {user.name}
                          </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getRoleBadgeColor(
                                user.role
                              )}`}
                            >
                            {getRoleIcon(user.role)}
                            {user.role}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {getOrganizationName(user.organizationId)}
                          </span>
                            {user.company && <span>{user.company}</span>}
                        </div>
                        {expandedUsers.has(user.id) && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 text-sm">
                              <div>
                                <strong>Title:</strong> {user.title || "N/A"}
                              </div>
                              {user.bio && (
                                <div>
                                  <strong>Bio:</strong> {user.bio}
                                </div>
                              )}
                            {user.skills.length > 0 && (
                                <div>
                                  <strong>Skills:</strong>{" "}
                                  {user.skills.join(", ")}
                                </div>
                            )}
                              <div>
                                <strong>Created:</strong>{" "}
                                {new Date(user.createdAt).toLocaleDateString()}
                              </div>
                          </div>
                        )}
                      </div>
                    </div>
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                      <button
                        onClick={() => toggleUserExpanded(user.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          title={
                            expandedUsers.has(user.id) ? "Collapse" : "Expand"
                          }
                        >
                          {expandedUsers.has(user.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                      </button>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 text-blue-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isPlatformAdmin && user.id !== currentUser.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setImpersonateUser(user);
                          }}
                          className="p-2 text-emerald-400 hover:text-emerald-600"
                          title="Login as this user"
                        >
                          <LogIn className="w-4 h-4" />
                        </button>
                      )}
                      {user.id !== currentUser.id && (
                        <button
                          onClick={() => setShowDeleteConfirm(user.id)}
                          className="p-2 text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                ))}

                {/* Users Pagination */}
                {filteredUsers.length > usersPerPage && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Items per page:
                      </span>
                      <select
                        value={usersPerPage}
                        onChange={(e) => {
                          setUsersPerPage(Number(e.target.value));
                          setUsersPage(1);
                        }}
                        className={INPUT_CLASS + " w-20 text-sm"}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Showing {(usersPage - 1) * usersPerPage + 1} to{" "}
                        {Math.min(
                          usersPage * usersPerPage,
                          filteredUsers.length
                        )}{" "}
                        of {filteredUsers.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setUsersPage((p) => Math.max(1, p - 1))
                          }
                          disabled={usersPage === 1}
                          className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Previous page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(5, totalUsersPages) },
                            (_, i) => {
                              let pageNum;
                              if (totalUsersPages <= 5) {
                                pageNum = i + 1;
                              } else if (usersPage <= 3) {
                                pageNum = i + 1;
                              } else if (usersPage >= totalUsersPages - 2) {
                                pageNum = totalUsersPages - 4 + i;
                              } else {
                                pageNum = usersPage - 2 + i;
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setUsersPage(pageNum)}
                                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                    usersPage === pageNum
                                      ? "bg-emerald-600 text-white"
                                      : "border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            }
                          )}
                        </div>
                        <button
                          onClick={() =>
                            setUsersPage((p) =>
                              Math.min(totalUsersPages, p + 1)
                            )
                          }
                          disabled={usersPage === totalUsersPages}
                          className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Next page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Organizations Tab */}
      {activeTab === "organizations" && (
        <div className="space-y-3">
          {organizations.length === 0 ? (
            <div className={CARD_CLASS + " text-center py-8"}>
              <Building className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500">No organizations found</p>
            </div>
          ) : (
            <>
              {paginatedOrgs.map((org) => {
                const orgUsers = users.filter(
                  (u) => u.organizationId === org.id
                );
              return (
                <div key={org.id} className={CARD_CLASS}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {org.name}
                        </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              org.subscriptionTier === "enterprise"
                                ? "bg-purple-100 text-purple-800"
                                : org.subscriptionTier === "business"
                                ? "bg-purple-100 text-purple-800"
                                : org.subscriptionTier === "professional"
                                ? "bg-blue-100 text-blue-800"
                                : org.subscriptionTier === "starter"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                          {org.subscriptionTier.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-2">
                          <span>
                            <strong>Code:</strong> {org.organizationCode}
                          </span>
                          <span>
                            <strong>Users:</strong> {orgUsers.length}
                          </span>
                          <span>
                            <strong>Created:</strong>{" "}
                            {new Date(org.createdAt).toLocaleDateString()}
                          </span>
                      </div>
                      {org.domain && (
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <strong>Domain:</strong> {org.domain}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(`org-${org.id}`)}
                      className="p-2 text-red-400 hover:text-red-600"
                      title="Delete Organization"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
              })}

              {/* Organizations Pagination */}
              {organizations.length > orgsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Items per page:
                    </span>
                    <select
                      value={orgsPerPage}
                      onChange={(e) => {
                        setOrgsPerPage(Number(e.target.value));
                        setOrgsPage(1);
                      }}
                      className={INPUT_CLASS + " w-20 text-sm"}
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Showing {(orgsPage - 1) * orgsPerPage + 1} to{" "}
                      {Math.min(orgsPage * orgsPerPage, organizations.length)}{" "}
                      of {organizations.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setOrgsPage((p) => Math.max(1, p - 1))}
                        disabled={orgsPage === 1}
                        className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: Math.min(5, totalOrgsPages) },
                          (_, i) => {
                            let pageNum;
                            if (totalOrgsPages <= 5) {
                              pageNum = i + 1;
                            } else if (orgsPage <= 3) {
                              pageNum = i + 1;
                            } else if (orgsPage >= totalOrgsPages - 2) {
                              pageNum = totalOrgsPages - 4 + i;
                            } else {
                              pageNum = orgsPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setOrgsPage(pageNum)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                  orgsPage === pageNum
                                    ? "bg-emerald-600 text-white"
                                    : "border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                      </div>
                      <button
                        onClick={() =>
                          setOrgsPage((p) => Math.min(totalOrgsPages, p + 1))
                        }
                        disabled={orgsPage === totalOrgsPages}
                        className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Edit User
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <EditUserForm
              user={editingUser}
              organizations={organizations}
              onSave={(updates) => handleEditUser(editingUser, updates)}
              onCancel={() => setEditingUser(null)}
            />
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                User Profile
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Header Section */}
              <div className="flex items-start gap-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-24 h-24 rounded-full border-4 border-slate-200 dark:border-slate-700"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {selectedUser.name}
                    </h4>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getRoleBadgeColor(
                        selectedUser.role
                      )}`}
                    >
                      {getRoleIcon(selectedUser.role)}
                      {selectedUser.role}
                    </span>
                  </div>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-1">
                    {selectedUser.title}
                  </p>
                  <p className="text-slate-500 dark:text-slate-500">
                    {selectedUser.company}
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Contact Information
                </h5>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>
                      {getOrganizationName(selectedUser.organizationId)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {selectedUser.bio && (
                <div>
                  <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    Bio
                  </h5>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedUser.bio}
                  </p>
                </div>
              )}

              {/* Skills */}
              {selectedUser.skills && selectedUser.skills.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    Skills
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Goals (for mentees) */}
              {selectedUser.goals && selectedUser.goals.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    Goals
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.goals.map((goal, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm"
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Information */}
              <div>
                <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Account Information
                </h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">
                      User ID:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 font-mono text-xs mt-1">
                      {selectedUser.id}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">
                      Created:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 mt-1">
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setEditingUser(selectedUser);
                    setSelectedUser(null);
                  }}
                  className={BUTTON_PRIMARY + " flex-1"}
                >
                  <Edit2 className="w-4 h-4 inline mr-2" />
                  Edit User
                </button>
                {isPlatformAdmin && selectedUser.id !== currentUser.id && (
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setImpersonateUser(selectedUser);
                    }}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Login as User
                  </button>
                )}
                {selectedUser.id !== currentUser.id && (
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(selectedUser.id);
                      setSelectedUser(null);
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    Delete User
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-4 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Confirm Deletion
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {showDeleteConfirm.startsWith("org-")
                    ? "Are you sure you want to delete this organization? This action cannot be undone."
                    : "Are you sure you want to delete this user? This action cannot be undone."}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (showDeleteConfirm.startsWith("org-")) {
                    handleDeleteOrg(showDeleteConfirm.replace("org-", ""));
                  } else {
                    handleDeleteUser(showDeleteConfirm);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impersonation Confirmation Modal */}
      {impersonateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-4 mb-4">
              <LogIn className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Impersonate User
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  You are about to login as{" "}
                  <strong>{impersonateUser.name}</strong> (
                  {impersonateUser.role}).
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  You will see the dashboard exactly as this user sees it. You
                  can exit impersonation at any time using the banner at the
                  top.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleImpersonateUser(impersonateUser)}
                className={`${BUTTON_PRIMARY} flex-1 flex items-center justify-center gap-2`}
              >
                <LogIn className="w-4 h-4" />
                Login as {impersonateUser.name}
              </button>
              <button
                onClick={() => setImpersonateUser(null)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Org Admins Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-6 h-6 text-emerald-600" />
                  Email Organization Admins
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Send an email to one or more organization administrators
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setSelectedOrgAdmins(new Set());
                  setEmailSubject("");
                  setEmailBody("");
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Recipients Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Select Recipients ({selectedOrgAdmins.size} selected)
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllOrgAdmins}
                      className="text-xs px-2 py-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllOrgAdmins}
                      className="text-xs px-2 py-1 text-slate-600 hover:text-slate-700 dark:text-slate-400"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className={`${CARD_CLASS} max-h-64 overflow-y-auto`}>
                  {orgAdmins.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No organization admins found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orgAdmins.map((admin) => {
                        const org = organizations.find(
                          (o) => o.id === admin.organizationId
                        );
                        return (
                          <label
                            key={admin.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                              selectedOrgAdmins.has(admin.id)
                                ? "bg-emerald-50 dark:bg-emerald-900/20"
                                : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedOrgAdmins.has(admin.id)}
                              onChange={() => toggleOrgAdminSelection(admin.id)}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                            <img
                              src={admin.avatar}
                              alt={admin.name}
                              className="w-10 h-10 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 dark:text-white">
                                {admin.name}
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-400">
                                {admin.email}
                              </div>
                              {org && (
                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                  {org.name}
                                </div>
                              )}
                            </div>
                            {selectedOrgAdmins.has(admin.id) && (
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Email Subject */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className={INPUT_CLASS}
                  required
                />
              </div>

              {/* Email Body */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Message *
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Enter your message... (Line breaks will be preserved)"
                  className={INPUT_CLASS}
                  rows={8}
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  The message will be sent from {currentUser.name} (
                  {currentUser.email})
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={handleSendEmailToAdmins}
                  disabled={
                    sendingEmail ||
                    selectedOrgAdmins.size === 0 ||
                    !emailSubject.trim() ||
                    !emailBody.trim()
                  }
                  className={`${BUTTON_PRIMARY} flex-1 flex items-center justify-center gap-2 ${
                    sendingEmail ||
                    selectedOrgAdmins.size === 0 ||
                    !emailSubject.trim() ||
                    !emailBody.trim()
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {sendingEmail ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Email to {selectedOrgAdmins.size} Admin
                      {selectedOrgAdmins.size !== 1 ? "s" : ""}
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setSelectedOrgAdmins(new Set());
                    setEmailSubject("");
                    setEmailBody("");
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface EditUserFormProps {
  user: User;
  organizations: Organization[];
  onSave: (updates: Partial<User>) => void;
  onCancel: () => void;
}

const EditUserForm: React.FC<EditUserFormProps> = ({
  user,
  organizations,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    title: user.title,
    company: user.company,
    bio: user.bio,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={INPUT_CLASS}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className={INPUT_CLASS}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Role
          </label>
          <select
            value={formData.role}
            onChange={(e) =>
              setFormData({ ...formData, role: e.target.value as Role })
            }
            className={INPUT_CLASS}
          >
            <option value={Role.PLATFORM_ADMIN}>Platform Admin</option>
            <option value={Role.ADMIN}>Organization Admin</option>
            <option value={Role.MENTOR}>Mentor</option>
            <option value={Role.MENTEE}>Mentee</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Organization
          </label>
          <select
            value={formData.organizationId}
            onChange={(e) =>
              setFormData({ ...formData, organizationId: e.target.value })
            }
            className={INPUT_CLASS}
          >
            <option value="platform">Platform</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Company
          </label>
          <input
            type="text"
            value={formData.company}
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Bio
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          className={INPUT_CLASS}
          rows={3}
        />
      </div>
      <div className="flex gap-3 pt-4">
        <button type="submit" className={BUTTON_PRIMARY + " flex-1"}>
          <Save className="w-4 h-4 inline mr-2" />
          Save Changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default UserManagement;
