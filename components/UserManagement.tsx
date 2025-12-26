import React, { useState, useEffect } from 'react';
import { User, Organization, Role } from '../types';
import { getAllUsers, getAllOrganizations, updateUser, deleteUser, updateOrganization, deleteOrganization } from '../services/database';
import { CARD_CLASS, INPUT_CLASS, BUTTON_PRIMARY } from '../styles/common';
import {
  Users, Search, Filter, Edit2, Trash2, Building, Mail, User as UserIcon,
  Shield, Crown, GraduationCap, UserCheck, X, Save, AlertTriangle,
  ChevronDown, ChevronUp, Eye, EyeOff, Plus, Globe, CheckCircle
} from 'lucide-react';

interface UserManagementProps {
  currentUser: User;
  onNavigate?: (page: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, onNavigate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [participantTypeFilter, setParticipantTypeFilter] = useState<'MENTOR' | 'MENTEE' | 'ALL'>('ALL');
  const [orgFilter, setOrgFilter] = useState<string>('ALL');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'users' | 'organizations'>('organizations');
  const [stats, setStats] = useState({
    totalUsers: 0,
    platformAdmins: 0,
    orgAdmins: 0,
    mentors: 0,
    mentees: 0,
    totalOrgs: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allUsers, allOrgs] = await Promise.all([
        getAllUsers(),
        getAllOrganizations()
      ]);

      setUsers(allUsers);
      setOrganizations(allOrgs);

      // Calculate stats
      const platformAdmins = allUsers.filter(u => u.role === Role.PLATFORM_ADMIN).length;
      const orgAdmins = allUsers.filter(u => u.role === Role.ADMIN).length;
      const mentors = allUsers.filter(u => u.role === Role.MENTOR).length;
      const mentees = allUsers.filter(u => u.role === Role.MENTEE).length;

      setStats({
        totalUsers: allUsers.length,
        platformAdmins,
        orgAdmins,
        mentors,
        mentees,
        totalOrgs: allOrgs.length,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

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
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case Role.ADMIN:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case Role.MENTOR:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case Role.MENTEE:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
    }
  };

  const getOrganizationName = (orgId: string) => {
    if (orgId === 'platform') return 'Platform';
    const org = organizations.find(o => o.id === orgId);
    return org?.name || 'Unknown Organization';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchesParticipantType =
      participantTypeFilter === 'ALL' ||
      (participantTypeFilter === 'MENTOR' && user.role === Role.MENTOR) ||
      (participantTypeFilter === 'MENTEE' && user.role === Role.MENTEE);
    const matchesOrg = orgFilter === 'ALL' || user.organizationId === orgFilter;

    return matchesSearch && matchesRole && matchesParticipantType && matchesOrg;
  });

  const handleEditUser = async (user: User, updates: Partial<User>) => {
    try {
      await updateUser(user.id, updates);
      await loadData();
      setEditingUser(null);
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert('Failed to update user: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId);
      await loadData();
      setShowDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user: ' + error.message);
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    try {
      await deleteOrganization(orgId);
      await loadData();
      setShowDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      alert('Failed to delete organization: ' + error.message);
    }
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className={CARD_CLASS}>
          <div className="text-sm text-slate-500 dark:text-slate-400">Total Users</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalUsers}</div>
        </div>
        <div className={CARD_CLASS}>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Mentees
          </div>
          <div className="text-2xl font-bold text-purple-600">{stats.mentees}</div>
        </div>
        <div className={CARD_CLASS}>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <GraduationCap className="w-3 h-3" /> Mentors
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.mentors}</div>
        </div>
        <div className={CARD_CLASS}>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Building className="w-3 h-3" /> Organizations
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalOrgs}</div>
        </div>
        <div className={CARD_CLASS}>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Org Admins
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.orgAdmins}</div>
        </div>
        <div className={CARD_CLASS}>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Crown className="w-3 h-3" /> Operators
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.platformAdmins}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'users'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('organizations')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'organizations'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
        >
          <Building className="w-4 h-4 inline mr-2" />
          Organizations ({organizations.length})
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
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
              onChange={(e) => setParticipantTypeFilter(e.target.value as 'MENTOR' | 'MENTEE' | 'ALL')}
              className={INPUT_CLASS + " w-full sm:w-40"}
            >
              <option value="ALL">All Participants</option>
              <option value="MENTOR">Mentors Only</option>
              <option value="MENTEE">Mentees Only</option>
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | 'ALL')}
              className={INPUT_CLASS + " w-full sm:w-48"}
            >
              <option value="ALL">All Roles</option>
              <option value={Role.PLATFORM_ADMIN}>Platform Operator</option>
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
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
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
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  className={CARD_CLASS + " cursor-pointer hover:shadow-md transition-shadow"}
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
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getRoleBadgeColor(user.role)}`}>
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
                          {user.company && (
                            <span>{user.company}</span>
                          )}
                        </div>
                        {expandedUsers.has(user.id) && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 text-sm">
                            <div><strong>Title:</strong> {user.title || 'N/A'}</div>
                            {user.bio && <div><strong>Bio:</strong> {user.bio}</div>}
                            {user.skills.length > 0 && (
                              <div><strong>Skills:</strong> {user.skills.join(', ')}</div>
                            )}
                            <div><strong>Created:</strong> {new Date(user.createdAt).toLocaleDateString()}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleUserExpanded(user.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        title={expandedUsers.has(user.id) ? "Collapse" : "Expand"}
                      >
                        {expandedUsers.has(user.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 text-blue-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
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
              ))
            )}
          </div>
        </>
      )}

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <div className="space-y-3">
          {organizations.length === 0 ? (
            <div className={CARD_CLASS + " text-center py-8"}>
              <Building className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500">No organizations found</p>
            </div>
          ) : (
            organizations.map(org => {
              const orgUsers = users.filter(u => u.organizationId === org.id);
              return (
                <div key={org.id} className={CARD_CLASS}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {org.name}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${org.subscriptionTier === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                            org.subscriptionTier === 'business' ? 'bg-purple-100 text-purple-800' :
                              org.subscriptionTier === 'professional' ? 'bg-blue-100 text-blue-800' :
                                org.subscriptionTier === 'starter' ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-slate-100 text-slate-800'
                          }`}>
                          {org.subscriptionTier.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-2">
                        <span><strong>Code:</strong> {org.organizationCode}</span>
                        <span><strong>Users:</strong> {orgUsers.length}</span>
                        <span><strong>Created:</strong> {new Date(org.createdAt).toLocaleDateString()}</span>
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
            })
          )}
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">User Profile</h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
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
                    <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedUser.name}</h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getRoleBadgeColor(selectedUser.role)}`}>
                      {getRoleIcon(selectedUser.role)}
                      {selectedUser.role}
                    </span>
                  </div>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-1">{selectedUser.title}</p>
                  <p className="text-slate-500 dark:text-slate-500">{selectedUser.company}</p>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Contact Information</h5>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>{getOrganizationName(selectedUser.organizationId)}</span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {selectedUser.bio && (
                <div>
                  <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Bio</h5>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedUser.bio}</p>
                </div>
              )}

              {/* Skills */}
              {selectedUser.skills && selectedUser.skills.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Skills</h5>
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
                  <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Goals</h5>
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
                <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Account Information</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">User ID:</span>
                    <p className="text-slate-700 dark:text-slate-300 font-mono text-xs mt-1">{selectedUser.id}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Created:</span>
                    <p className="text-slate-700 dark:text-slate-300 mt-1">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
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
                  {showDeleteConfirm.startsWith('org-')
                    ? 'Are you sure you want to delete this organization? This action cannot be undone.'
                    : 'Are you sure you want to delete this user? This action cannot be undone.'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (showDeleteConfirm.startsWith('org-')) {
                    handleDeleteOrg(showDeleteConfirm.replace('org-', ''));
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
    </div>
  );
};

interface EditUserFormProps {
  user: User;
  organizations: Organization[];
  onSave: (updates: Partial<User>) => void;
  onCancel: () => void;
}

const EditUserForm: React.FC<EditUserFormProps> = ({ user, organizations, onSave, onCancel }) => {
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
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
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
            onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
            className={INPUT_CLASS}
          >
            <option value="platform">Platform</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
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
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
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
        <button
          type="submit"
          className={BUTTON_PRIMARY + " flex-1"}
        >
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

