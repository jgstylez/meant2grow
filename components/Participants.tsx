
import React, { useState } from 'react';
import { User, Role, Match, MatchStatus } from '../types';
import { BUTTON_PRIMARY, INPUT_CLASS, CARD_CLASS } from '../styles/common';
import { Plus, MoreVertical, Mail, Edit2, X, Trash2, Shield, User as UserIcon, Filter, Repeat, CheckCircle, XCircle, Eye } from 'lucide-react';
import { updateUser, deleteUser } from '../services/database';

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
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailingUser, setEmailingUser] = useState<string | null>(null);
  const [roleChangingUser, setRoleChangingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');

  const formatRole = (role: Role) => {
    switch (role) {
      case Role.ADMIN: return "Organization Admin";
      case Role.PLATFORM_ADMIN: return "Platform Operator";
      case Role.MENTOR: return "Mentor";
      case Role.MENTEE: return "Mentee";
      default: return role;
    }
  };
  const isAdmin = currentUser?.role === Role.ADMIN;

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

  const handleUpdateEmail = async (userId: string) => {
    if (!editEmail || !editEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    try {
      await updateUser(userId, { email: editEmail });
      setEditingUser(null);
      setEditEmail('');
    } catch (error) {
      console.error('Error updating email:', error);
      alert('Failed to update email address');
    }
  };

  const handleSendEmail = async (user: User) => {
    if (!emailSubject || !emailBody) {
      alert('Please fill in both subject and body');
      return;
    }
    // In a real implementation, this would call an email service
    // For now, we'll use mailto link
    const mailtoLink = `mailto:${user.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
    setEmailingUser(null);
    setEmailSubject('');
    setEmailBody('');
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
        <button onClick={() => onNavigate('referrals')} className={BUTTON_PRIMARY}>
          <Plus className="w-4 h-4 mr-2" /> Invite Participant
        </button>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Organization</th>
                <th className="px-6 py-4">Skills / Goals</th>
                <th className="px-6 py-4">Bridge Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map(user => {
                const userMatches = getUserMatches(user.id);
                const matchedPartner = getMatchedPartner(user.id);
                return (
                <tr 
                  key={user.id} 
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
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
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                          }}
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEmailingUser(user.id);
                            setEmailSubject('');
                            setEmailBody('');
                          }}
                          className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1"
                          title="Email participant"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(user.id);
                            setEditEmail(user.email);
                          }}
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1"
                          title="Edit email"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRoleChangingUser(user)}
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1"
                          title="Change role"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1"
                          title="Remove participant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><MoreVertical className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Participant Modal */}
      {emailingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Email Participant</h3>
              <button onClick={() => setEmailingUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">To</label>
                <input
                  className={INPUT_CLASS}
                  value={users.find(u => u.id === emailingUser)?.email || ''}
                  disabled
                />
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
                onClick={() => setEmailingUser(null)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const user = users.find(u => u.id === emailingUser);
                  if (user) handleSendEmail(user);
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
                />
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
                className={BUTTON_PRIMARY + " flex-1"}
              >
                <Edit2 className="w-4 h-4 mr-2 inline" /> Update Email
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
