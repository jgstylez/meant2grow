
import React, { useState, useEffect } from 'react';
import { User, Role, Match, MatchStatus } from '../types';
import { BUTTON_PRIMARY, INPUT_CLASS, CARD_CLASS } from '../styles/common';
import { Plus, MoreVertical, Mail, Edit2, X, Trash2, Shield, User as UserIcon, Filter, Repeat, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { updateUser, deleteUser } from '../services/database';
import { emailService } from '../services/emailService';

interface ParticipantsProps {
  users: User[];
  matches: Match[];
  onNavigate: (page: string) => void;
  currentUser?: User | null;
  organizationId?: string | null;
}

const Participants: React.FC<ParticipantsProps> = ({ users, matches, onNavigate, currentUser, organizationId }) => {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailingUser, setEmailingUser] = useState<string | null>(null);
  const [emailingUsers, setEmailingUsers] = useState<string[]>([]); // For bulk email
  const [isBulkEmail, setIsBulkEmail] = useState(false);
  const [roleChangingUser, setRoleChangingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const formatRole = (role: Role) => {
    switch (role) {
      case Role.ADMIN: return "Organization Admin";
      case Role.PLATFORM_ADMIN: return "Platform Operator";
      case Role.MENTOR: return "Mentor";
      case Role.MENTEE: return "Mentee";
      default: return role;
    }
  };
  
  // Check if user is admin (organization admin or platform admin)
  const userRoleString = currentUser ? String(currentUser.role) : '';
  const isPlatformAdmin = currentUser?.role === Role.PLATFORM_ADMIN || 
                         userRoleString === "PLATFORM_ADMIN" || 
                         userRoleString === "PLATFORM_OPERATOR";
  const isOrgAdmin = !isPlatformAdmin && (
    currentUser?.role === Role.ADMIN || 
    userRoleString === "ORGANIZATION_ADMIN" || 
    userRoleString === "ADMIN"
  );
  const isAdmin = isOrgAdmin || isPlatformAdmin;

  // Get active matches for a user
  const getUserMatches = (userId: string): Match[] => {
    return matches.filter(m => 
      m.status === MatchStatus.ACTIVE && 
      (m.mentorId === userId || m.menteeId === userId)
    );
  };

  // Get matched partner for a user
  const getMatchedPartner = (userId: string): User | null => {
    const userMatch = getUserMatches(userId)[0];
    if (!userMatch) return null;
    const partnerId = userMatch.mentorId === userId ? userMatch.menteeId : userMatch.mentorId;
    return users.find(u => u.id === partnerId) || null;
  };

  // Filter users by role
  const filteredUsers = users.filter(u => {
    if (u.role === Role.ADMIN) return false; // Always exclude admins from list
    if (roleFilter === 'ALL') return true;
    return u.role === roleFilter;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter]);

  // Reset to page 1 when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleUpdateEmail = async (userId: string) => {
    // Trim whitespace and convert to lowercase
    const trimmedEmail = editEmail.trim().toLowerCase();
    
    if (!trimmedEmail) {
      alert('Please enter an email address');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      alert('Please enter a valid email address (e.g., user@example.com)');
      return;
    }

    // Check if email is the same as current
    const user = users.find(u => u.id === userId);
    if (user && user.email.toLowerCase() === trimmedEmail) {
      alert('This is already the current email address');
      return;
    }

    // Verify admin permissions
    if (!isAdmin) {
      alert('Only admins can update email addresses');
      return;
    }

    // Verify user belongs to same organization (for organization admins only, platform admins can update any)
    if (!isPlatformAdmin && user && organizationId && user.organizationId !== organizationId) {
      alert('You can only update email addresses for users in your organization');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      await updateUser(userId, { email: trimmedEmail });
      alert(`Email address updated successfully to ${trimmedEmail}`);
      setEditingUser(null);
      setEditEmail('');
      
      // The useOrganizationData hook uses real-time Firestore listeners,
      // so the users array should update automatically when the document changes
    } catch (error: any) {
      console.error('Error updating email:', error);
      const errorMessage = error?.message || 'Failed to update email address';
      alert(`Failed to update email address: ${errorMessage}`);
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleSendEmail = async (user?: User) => {
    if (!emailSubject || !emailBody) {
      alert('Please fill in both subject and body');
      return;
    }

    if (!currentUser || !organizationId) {
      alert('Unable to send email: Missing user or organization information');
      return;
    }

    try {
      // Show loading state
      const sendButton = document.querySelector('[data-email-send-button]') as HTMLButtonElement;
      if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';
      }

      let recipients: { email: string; name?: string; userId?: string }[];

      if (isBulkEmail && emailingUsers.length > 0) {
        // Bulk email to multiple users
        recipients = emailingUsers
          .map(userId => {
            const u = users.find(usr => usr.id === userId);
            return u ? { email: u.email, name: u.name, userId: u.id } : null;
          })
          .filter((r): r is { email: string; name?: string; userId?: string } => r !== null);
      } else if (user) {
        // Single user email
        recipients = [{ email: user.email, name: user.name, userId: user.id }];
      } else {
        alert('No recipients selected');
        return;
      }

      if (recipients.length === 0) {
        alert('No valid recipients found');
        return;
      }

      await emailService.sendCustomEmail(
        recipients,
        emailSubject,
        emailBody,
        { name: currentUser.name, email: currentUser.email },
        currentUser.id,
        organizationId || undefined
      );

      alert(`Email sent successfully to ${recipients.length} recipient(s)!`);
    setEmailingUser(null);
      setEmailingUsers([]);
      setIsBulkEmail(false);
      setSelectedUserIds(new Set());
      setEmailSubject('');
      setEmailBody('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      alert(`Failed to send email: ${error.message || 'Unknown error'}`);
    } finally {
      const sendButton = document.querySelector('[data-email-send-button]') as HTMLButtonElement;
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.innerHTML = '<Mail className="w-4 h-4 mr-2 inline" /> Send Email';
      }
    }
  };

  const handleBulkEmailClick = () => {
    if (selectedUserIds.size === 0) {
      alert('Please select at least one participant to email');
      return;
    }
    setEmailingUsers(Array.from(selectedUserIds));
    setIsBulkEmail(true);
    setEmailSubject('');
    setEmailBody('');
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await updateUser(userId, { role: newRole });
      setRoleChangingUser(null);
    } catch (error) {
      console.error('Error changing role:', error);
      alert('Failed to update role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this participant? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteUser(userId);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to remove participant');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Member Management</h1>
        <div className="flex gap-2">
          {isAdmin && selectedUserIds.size > 0 && (
            <button onClick={handleBulkEmailClick} className={BUTTON_PRIMARY}>
              <Mail className="w-4 h-4 mr-2" /> Email Selected ({selectedUserIds.size})
            </button>
          )}
        <button onClick={() => onNavigate('referrals')} className={BUTTON_PRIMARY}>
          <Plus className="w-4 h-4 mr-2" /> Invite Participant
        </button>
        </div>
      </div>

      {/* Role Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <div className="flex gap-2">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              roleFilter === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setRoleFilter(Role.MENTOR)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              roleFilter === Role.MENTOR
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Mentors
          </button>
          <button
            onClick={() => setRoleFilter(Role.MENTEE)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              roleFilter === Role.MENTEE
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Mentees
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                {isAdmin && (
                  <th className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.size === paginatedUsers.length && paginatedUsers.length > 0 && selectedUserIds.size > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserIds(new Set(paginatedUsers.map(u => u.id)));
                        } else {
                          // Only deselect current page users
                          const pageIds = new Set(paginatedUsers.map(u => u.id));
                          setSelectedUserIds(prev => {
                            const newSet = new Set(prev);
                            pageIds.forEach(id => newSet.delete(id));
                            return newSet;
                          });
                        }
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Organization</th>
                <th className="px-6 py-4">Skills / Goals</th>
                <th className="px-6 py-4">Bridge Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedUsers.map(user => {
                const userMatches = getUserMatches(user.id);
                const matchedPartner = getMatchedPartner(user.id);
                return (
                <tr 
                  key={user.id} 
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  {isAdmin && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img src={user.avatar} alt="" className="w-8 h-8 rounded-full mr-3" />
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{user.name}</div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === Role.MENTOR
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
                      }`}>
                      {formatRole(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900 dark:text-white">{user.company}</div>
                    <div className="text-xs text-slate-400">{user.title}</div>
                    {user.role === Role.MENTEE && user.goals && user.goals.length > 0 && (user.goalsPublic !== false) && (
                      <div className="mt-2">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Goals:</div>
                        <div className="flex flex-wrap gap-1">
                          {user.goals.slice(0, 3).map((goal, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded"
                            >
                              {goal}
                            </span>
                          ))}
                          {user.goals.length > 3 && (
                            <span className="text-xs px-2 py-0.5 text-slate-500 dark:text-slate-400">
                              +{user.goals.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {user.role === Role.MENTEE && user.goalsPublic === false && (
                      <div className="mt-2">
                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">Goals are private</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    {user.role === Role.MENTOR ? (
                      <div className="flex flex-wrap gap-1">
                        {user.skills?.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {user.skills && user.skills.length > 3 && (
                          <span className="text-xs px-2 py-0.5 text-slate-500 dark:text-slate-400">
                            +{user.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {userMatches.length > 0 && matchedPartner ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <div className="text-xs">
                          <div className="font-medium text-slate-900 dark:text-white">Matched</div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {user.role === Role.MENTOR ? 'Mentee: ' : 'Mentor: '}{matchedPartner.name}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">Not matched</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          if (openMenuUserId === user.id) {
                            setOpenMenuUserId(null);
                            setMenuPosition(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPosition({
                              top: rect.bottom + window.scrollY + 4,
                              right: window.innerWidth - rect.right,
                            });
                            setOpenMenuUserId(user.id);
                          }
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        title="Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuUserId === user.id && menuPosition && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => {
                              setOpenMenuUserId(null);
                              setMenuPosition(null);
                            }}
                          />
                          <div 
                            className="fixed w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 py-1"
                            style={{
                              top: `${menuPosition.top}px`,
                              right: `${menuPosition.right}px`,
                            }}
                          >
                    {isAdmin ? (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setOpenMenuUserId(null);
                                    setMenuPosition(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                <button
                                  onClick={() => {
                                    setEmailingUser(user.id);
                                    setEmailSubject('');
                                    setEmailBody('');
                                    setOpenMenuUserId(null);
                                    setMenuPosition(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <Mail className="w-4 h-4" />
                                  Email Participant
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUser(user.id);
                                    setEditEmail(user.email);
                                    setOpenMenuUserId(null);
                                    setMenuPosition(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Update Email
                                </button>
                                <button
                                  onClick={() => {
                                    setRoleChangingUser(user);
                                    setOpenMenuUserId(null);
                                    setMenuPosition(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <Shield className="w-4 h-4" />
                                  Change Role
                                </button>
                                <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                                <button
                                  onClick={() => {
                                    handleDeleteUser(user.id);
                                    setOpenMenuUserId(null);
                                    setMenuPosition(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Remove Participant
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setOpenMenuUserId(null);
                                  setMenuPosition(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {filteredUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} participants
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="ml-2 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-800 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-800 flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Participant Modal */}
      {(emailingUser || (isBulkEmail && emailingUsers.length > 0)) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {isBulkEmail ? `Email ${emailingUsers.length} Participant(s)` : 'Email Participant'}
              </h3>
              <button onClick={() => {
                setEmailingUser(null);
                setEmailingUsers([]);
                setIsBulkEmail(false);
              }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">To</label>
                {isBulkEmail ? (
                  <div className={INPUT_CLASS + " max-h-32 overflow-y-auto"}>
                    {emailingUsers.map(userId => {
                      const u = users.find(usr => usr.id === userId);
                      return u ? (
                        <div key={userId} className="text-sm py-1">{u.name} ({u.email})</div>
                      ) : null;
                    })}
                  </div>
                ) : (
                <input
                  className={INPUT_CLASS}
                  value={users.find(u => u.id === emailingUser)?.email || ''}
                  disabled
                />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Subject</label>
                <input
                  className={INPUT_CLASS}
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Message</label>
                <textarea
                  className={INPUT_CLASS}
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Email message"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEmailingUser(null);
                  setEmailingUsers([]);
                  setIsBulkEmail(false);
                  setEmailSubject('');
                  setEmailBody('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                data-email-send-button
                onClick={() => {
                  if (isBulkEmail) {
                    handleSendEmail();
                  } else {
                  const user = users.find(u => u.id === emailingUser);
                  if (user) handleSendEmail(user);
                  }
                }}
                className={BUTTON_PRIMARY + " flex-1"}
              >
                <Mail className="w-4 h-4 mr-2 inline" /> Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Email Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Update Email Address</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Participant</label>
                <input
                  className={INPUT_CLASS}
                  value={users.find(u => u.id === editingUser)?.name || ''}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  className={INPUT_CLASS}
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="new@email.com"
                  disabled={isUpdatingEmail}
                />
                {editEmail && !isValidEmail(editEmail.trim()) && (
                  <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateEmail(editingUser)}
                disabled={isUpdatingEmail || !editEmail.trim() || !isValidEmail(editEmail.trim())}
                className={BUTTON_PRIMARY + " flex-1 disabled:opacity-50 disabled:cursor-not-allowed"}
              >
                {isUpdatingEmail ? (
                  <>
                    <Repeat className="w-4 h-4 mr-2 inline animate-spin" /> Updating...
                  </>
                ) : (
                  <>
                <Edit2 className="w-4 h-4 mr-2 inline" /> Update Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {roleChangingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Change Role</h3>
              <button onClick={() => setRoleChangingUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Change the role for <span className="font-semibold text-slate-900 dark:text-white">{roleChangingUser.name}</span>.
              Note: This may require them to re-complete onboarding for their new role.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleRoleChange(roleChangingUser.id, Role.MENTOR)}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${roleChangingUser.role === Role.MENTOR
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
              >
                <Shield className={`w-8 h-8 mb-2 ${roleChangingUser.role === Role.MENTOR ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="font-bold text-slate-900 dark:text-white">Mentor</span>
              </button>
              <button
                onClick={() => handleRoleChange(roleChangingUser.id, Role.MENTEE)}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${roleChangingUser.role === Role.MENTEE
                  ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
              >
                <UserIcon className={`w-8 h-8 mb-2 ${roleChangingUser.role === Role.MENTEE ? 'text-teal-600' : 'text-slate-400'}`} />
                <span className="font-bold text-slate-900 dark:text-white">Mentee</span>
              </button>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setRoleChangingUser(null)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* User Profile Section */}
              <div className="flex items-start gap-4">
                <img src={selectedUser.avatar} alt={selectedUser.name} className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700" />
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{selectedUser.name}</h4>
                  <p className="text-slate-600 dark:text-slate-400 mb-2">{selectedUser.email}</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedUser.role === Role.MENTOR
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
                  }`}>
                    {formatRole(selectedUser.role)}
                  </span>
                </div>
              </div>

              {/* Company & Title */}
              <div className={CARD_CLASS}>
                <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Company & Title</h5>
                <p className="text-lg font-medium text-slate-900 dark:text-white">{selectedUser.company}</p>
                <p className="text-slate-600 dark:text-slate-400">{selectedUser.title}</p>
              </div>

              {/* Bio */}
              {selectedUser.bio && (
                <div className={CARD_CLASS}>
                  <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Bio</h5>
                  <p className="text-slate-700 dark:text-slate-300">{selectedUser.bio}</p>
                </div>
              )}

              {/* Skills or Goals */}
              {selectedUser.role === Role.MENTOR ? (
                <div className={CARD_CLASS}>
                  <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Skills</h5>
                  {selectedUser.skills && selectedUser.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 italic">No skills listed</p>
                  )}
                </div>
              ) : (
                <div className={CARD_CLASS}>
                  <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Goals</h5>
                  {selectedUser.goalsPublic === false ? (
                    <p className="text-slate-400 dark:text-slate-500 italic">Goals are private</p>
                  ) : selectedUser.goals && selectedUser.goals.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.goals.map((goal, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm"
                        >
                          {goal}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 italic">No goals listed</p>
                  )}
                </div>
              )}

              {/* Bridge Status */}
              <div className={CARD_CLASS}>
                <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <Repeat className="w-4 h-4" /> Bridge Status
                </h5>
                {getUserMatches(selectedUser.id).length > 0 ? (
                  <div className="space-y-3">
                    {getUserMatches(selectedUser.id).map(match => {
                      const partnerId = match.mentorId === selectedUser.id ? match.menteeId : match.mentorId;
                      const partner = users.find(u => u.id === partnerId);
                      return (
                        <div key={match.id} className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-center gap-3 mb-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-semibold text-slate-900 dark:text-white">Active Bridge</span>
                          </div>
                          {partner && (
                            <div className="mt-2">
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {selectedUser.role === Role.MENTOR ? 'Mentee' : 'Mentor'}: <span className="font-medium text-slate-900 dark:text-white">{partner.name}</span>
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                Started: {new Date(match.startDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-600 dark:text-slate-400">Not currently matched</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        onNavigate('matching');
                      }}
                      className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Create a bridge →
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              {isAdmin && (
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      onNavigate('matching');
                    }}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Repeat className="w-4 h-4" /> Manage Bridges
                  </button>
                  <button
                    onClick={() => {
                      setEmailingUser(selectedUser.id);
                      setEmailSubject('');
                      setEmailBody('');
                      setSelectedUser(null);
                    }}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Participants;
