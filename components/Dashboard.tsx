
import React, { useState, useEffect, useMemo } from 'react';
import { User, Match, Goal, Rating, Role, MatchStatus, ProgramSettings, CalendarEvent, Organization } from '../types';
import { INPUT_CLASS, CARD_CLASS } from '../styles/common';
import { getAllUsers, getAllOrganizations, getAllCalendarEvents, getAllMatches, getAllGoals, getAllRatings } from '../services/database';
import { logger } from '../services/logger';
import {
  Users, Search, Plus, AlertCircle, Star, Check, X, CheckCircle,
  Target, MessageSquare, Calendar, Globe, Repeat, ArrowRight, Settings, Layout, Edit, Copy,
  Crown, Shield, GraduationCap, UserCheck, Building, Mail, ChevronRight, TrendingUp, Award, Trophy, Medal, Clock, BookOpen
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface DashboardProps {
  user: User;
  users: User[];
  matches: Match[];
  goals: Goal[];
  ratings: Rating[];
  calendarEvents?: CalendarEvent[];
  programSettings?: ProgramSettings | null;
  organizationCode?: string;
  organization?: Organization | null;
  onApproveRating: (id: string) => void;
  onRejectRating?: (id: string) => void;
  onAddRating: (rating: Omit<Rating, 'id'>) => void;
  onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, users, matches, goals, ratings, calendarEvents = [], programSettings, organizationCode, organization, onApproveRating, onRejectRating, onAddRating, onNavigate }) => {
  // Role checks - handle both enum and string values for robustness
  const userRoleString = String(user.role);
  
  // Check both enum and string value for platform operator (database stores as string "PLATFORM_ADMIN")
  // Also check for legacy "PLATFORM_OPERATOR" value for backwards compatibility
  // THIS CHECK MUST COME FIRST before admin/mentor checks
  const isPlatformAdmin = user.role === Role.PLATFORM_ADMIN || 
                         userRoleString === "PLATFORM_ADMIN" || 
                         userRoleString === "PLATFORM_OPERATOR";
  
  // Check for organization admin - handle both "ORGANIZATION_ADMIN" and "ADMIN" values
  // Must check AFTER platform operator to avoid conflicts
  const isAdmin = !isPlatformAdmin && (
    user.role === Role.ADMIN || 
    userRoleString === "ORGANIZATION_ADMIN" || 
    userRoleString === "ADMIN"
  );
  
  const isMentor = !isPlatformAdmin && !isAdmin && (
    user.role === Role.MENTOR || 
    userRoleString === "MENTOR"
  );

  // Rating Modal State
  const [ratingTarget, setRatingTarget] = useState<User | null>(null);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [showRatingSuccess, setShowRatingSuccess] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Participants Modal State
  const [showParticipantsModal, setShowParticipantsModal] = useState<'mentors' | 'mentees' | null>(null);
  const [orgLogoError, setOrgLogoError] = useState(false);

  // Reset logo error when organization changes
  useEffect(() => {
    setOrgLogoError(false);
  }, [organization?.id, organization?.logo]);

  // Platform Operator State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [allCalendarEvents, setAllCalendarEvents] = useState<CalendarEvent[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [allRatings, setAllRatings] = useState<Rating[]>([]);
  const [platformAdminLoading, setPlatformAdminLoading] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleSubmitRating = () => {
    if (ratingTarget && ratingScore > 0) {
      const newRating: Omit<Rating, 'id'> = {
        organizationId: user.organizationId,
        fromUserId: user.id,
        toUserId: ratingTarget.id,
        score: ratingScore,
        comment: ratingComment,
        isApproved: false,
        date: new Date().toISOString().split('T')[0]
      };
      onAddRating(newRating);
      setRatingTarget(null);
      setRatingScore(0);
      setRatingComment('');
      setShowRatingSuccess(true);
      setTimeout(() => setShowRatingSuccess(false), 3000);
    }
  };

  const handleCopyCode = () => {
    if (organizationCode) {
      navigator.clipboard.writeText(organizationCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const renderRatingModal = () => (
    <>
      {ratingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-none sm:rounded-xl shadow-2xl p-4 sm:p-6 max-w-sm w-full h-full sm:h-auto mx-0 sm:mx-4 border-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Rate Experience</h3>
              <button onClick={() => setRatingTarget(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              How is your mentorship going with <span className="font-semibold text-slate-800 dark:text-white">{ratingTarget.name}</span>?
              Your feedback helps us improve matches.
            </p>

            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingScore(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${star <= ratingScore ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
                  />
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Comments (Optional)</label>
              <textarea
                className={INPUT_CLASS}
                rows={3}
                placeholder="Share your thoughts..."
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
              />
            </div>

            <button
              onClick={handleSubmitRating}
              disabled={ratingScore === 0}
              className="w-full py-3 sm:py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
            >
              Submit Review
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-3">Reviews are pending until approved by an admin.</p>
          </div>
        </div>
      )}

      {showRatingSuccess && (
        <div className="fixed bottom-6 right-6 bg-emerald-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center animate-in slide-in-from-bottom-4 fade-in z-50">
          <CheckCircle className="w-5 h-5 mr-2" />
          <div>
            <p className="font-bold text-sm">Rating Submitted</p>
            <p className="text-xs text-emerald-200">Thanks for your feedback!</p>
          </div>
        </div>
      )}
    </>
  );

  const renderParticipantsModal = () => {
    if (!showParticipantsModal) return null;

    const participants = showParticipantsModal === 'mentors'
      ? users.filter(u => u.role === Role.MENTOR)
      : users.filter(u => u.role === Role.MENTEE);

    const title = showParticipantsModal === 'mentors' ? 'Mentors' : 'Mentees';
    const roleColor = showParticipantsModal === 'mentors'
      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
      : 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-0 sm:p-4">
        <div className="bg-white dark:bg-slate-900 rounded-none sm:rounded-xl shadow-2xl max-w-4xl w-full h-full sm:h-auto mx-0 sm:mx-4 max-h-[100vh] sm:max-h-[90vh] flex flex-col border-0 sm:border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {title} ({participants.length})
            </h3>
            <button
              onClick={() => setShowParticipantsModal(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {participants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No {title.toLowerCase()} found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {participants.map(participant => {
                  const participantMatches = matches.filter(m =>
                    (m.mentorId === participant.id || m.menteeId === participant.id) &&
                    m.status === MatchStatus.ACTIVE
                  ).length;

                  return (
                    <div
                      key={participant.id}
                      className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={participant.avatar}
                          alt={participant.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                                {participant.name}
                              </h4>
                              <p className="text-sm text-slate-500 dark:text-slate-400">{participant.email}</p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColor} shrink-0`}>
                              {participant.role}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Company & Title</p>
                              <p className="text-sm text-slate-900 dark:text-white font-medium">{participant.company}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{participant.title}</p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                {showParticipantsModal === 'mentors' ? 'Skills' : 'Goals'}
                              </p>
                              {showParticipantsModal === 'mentees' && participant.goalsPublic === false ? (
                                <p className="text-xs text-slate-400 dark:text-slate-500 italic">Goals are private</p>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {(showParticipantsModal === 'mentors' ? participant.skills : participant.goals)?.slice(0, 3).map((item, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                  {(showParticipantsModal === 'mentors' ? participant.skills : participant.goals)?.length > 3 && (
                                    <span className="text-xs px-2 py-0.5 text-slate-500 dark:text-slate-400">
                                      +{(showParticipantsModal === 'mentors' ? participant.skills : participant.goals)!.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {showParticipantsModal === 'mentors' && (
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Active Bridges: <span className="font-medium text-slate-900 dark:text-white">{participantMatches}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setShowParticipantsModal(null);
                onNavigate('participants');
              }}
              className="w-full py-3 sm:py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation"
            >
              View All Participants
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Utility function to parse duration string and convert to hours
  const parseDurationToHours = (duration: string): number => {
    if (!duration) return 0;

    // Handle formats like "30 min", "1h", "1.5h", "2h", etc.
    const normalized = duration.toLowerCase().trim();

    if (normalized.includes('min')) {
      const minutes = parseFloat(normalized.replace(/[^0-9.]/g, ''));
      return minutes / 60;
    } else if (normalized.includes('h')) {
      return parseFloat(normalized.replace(/[^0-9.]/g, '')) || 0;
    }

    return 0;
  };

  // Calculate meeting hours for a mentor
  const calculateMentorHours = (mentorId: string, events: CalendarEvent[]): number => {
    const mentorEvents = events.filter(e => e.mentorId === mentorId);
    return mentorEvents.reduce((total, event) => {
      return total + parseDurationToHours(event.duration);
    }, 0);
  };

  // Get award/badge based on hours
  const getMentorAward = (hours: number): { badge: string; icon: React.ReactNode; color: string } => {
    if (hours >= 100) {
      return {
        badge: 'Platinum Mentor',
        icon: <Trophy className="w-5 h-5" />,
        color: 'text-purple-600 dark:text-purple-400'
      };
    } else if (hours >= 50) {
      return {
        badge: 'Gold Mentor',
        icon: <Award className="w-5 h-5" />,
        color: 'text-amber-600 dark:text-amber-400'
      };
    } else if (hours >= 25) {
      return {
        badge: 'Silver Mentor',
        icon: <Medal className="w-5 h-5" />,
        color: 'text-slate-600 dark:text-slate-400'
      };
    } else if (hours >= 10) {
      return {
        badge: 'Bronze Mentor',
        icon: <Star className="w-5 h-5" />,
        color: 'text-orange-600 dark:text-orange-400'
      };
    } else if (hours >= 5) {
      return {
        badge: 'Rising Mentor',
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'text-emerald-600 dark:text-emerald-400'
      };
    }
    return {
      badge: 'New Mentor',
      icon: <GraduationCap className="w-5 h-5" />,
      color: 'text-blue-600 dark:text-blue-400'
    };
  };

  // --- PLATFORM OPERATOR VIEW ---
  // Load platform operator data
  // Memoize isPlatformAdmin to prevent unnecessary re-renders
  const isPlatformAdminMemo = useMemo(() => isPlatformAdmin, [
    user.role,
    userRoleString
  ]);

  useEffect(() => {
    if (isPlatformAdminMemo) {
      let cancelled = false;
      const loadPlatformData = async () => {
        try {
          setPlatformAdminLoading(true);
          logger.debug('Loading platform operator data...');
          
          const [usersData, orgsData, eventsData, matchesData, goalsData, ratingsData] = await Promise.all([
            getAllUsers(),
            getAllOrganizations(),
            getAllCalendarEvents(),
            getAllMatches(),
            getAllGoals(),
            getAllRatings()
          ]);
          
          // Check if component was unmounted or effect was cancelled
          if (cancelled) return;
          
          logger.debug('Platform operator data loaded', {
            users: usersData.length,
            organizations: orgsData.length,
            events: eventsData.length,
            matches: matchesData.length,
            goals: goalsData.length,
            ratings: ratingsData.length
          });
          
          setAllUsers(usersData);
          setAllOrganizations(orgsData);
          setAllCalendarEvents(eventsData);
          setAllMatches(matchesData);
          setAllGoals(goalsData);
          setAllRatings(ratingsData);
        } catch (error) {
          if (cancelled) return;
          console.error('Error loading platform operator data:', error);
          // Log more details about the error
          if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
          // Set empty arrays on error to prevent undefined state
          setAllUsers([]);
          setAllOrganizations([]);
          setAllCalendarEvents([]);
          setAllMatches([]);
          setAllGoals([]);
          setAllRatings([]);
        } finally {
          if (!cancelled) {
            setPlatformAdminLoading(false);
          }
        }
      };
      loadPlatformData();
      
      return () => {
        cancelled = true;
      };
    }
  }, [isPlatformAdminMemo]);

  // Check both the role enum and string comparison for safety - Platform Operator should see platform dashboard
  // This check MUST come first before admin/mentor/mentee checks
  if (isPlatformAdmin) {
    // Calculate platform-wide metrics
    const activeMatches = allMatches.filter(m => m.status === MatchStatus.ACTIVE).length;
    const completedMatches = allMatches.filter(m => m.status === MatchStatus.COMPLETED).length;
    const totalGoals = allGoals.length;
    const completedGoals = allGoals.filter(g => g.status === 'Completed').length;
    const inProgressGoals = allGoals.filter(g => g.status === 'In Progress').length;
    const totalRatings = allRatings.length;
    const approvedRatings = allRatings.filter(r => r.isApproved).length;
    const avgRating = approvedRatings > 0 
      ? allRatings.filter(r => r.isApproved).reduce((sum, r) => sum + r.score, 0) / approvedRatings 
      : 0;
    
    // User growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = allUsers.filter(u => new Date(u.createdAt) >= thirtyDaysAgo).length;

    const platformStats = {
      totalUsers: allUsers.length,
      platformAdmins: allUsers.filter(u => u.role === Role.PLATFORM_ADMIN).length,
      orgAdmins: allUsers.filter(u => u.role === Role.ADMIN).length,
      mentors: allUsers.filter(u => u.role === Role.MENTOR).length,
      mentees: allUsers.filter(u => u.role === Role.MENTEE).length,
      totalOrgs: allOrganizations.length,
      activeMatches,
      completedMatches,
      totalMatches: allMatches.length,
      totalGoals,
      completedGoals,
      inProgressGoals,
      totalRatings,
      approvedRatings,
      avgRating,
      recentUsers,
    };

    const recentUsersList = allUsers
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const filteredUsers = userSearchQuery
      ? allUsers.filter(u =>
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.company.toLowerCase().includes(userSearchQuery.toLowerCase())
      ).slice(0, 10)
      : recentUsersList;

    const getRoleIcon = (role: Role) => {
      switch (role) {
        case Role.PLATFORM_ADMIN: return <Crown className="w-3 h-3 text-amber-500" />;
        case Role.ADMIN: return <Shield className="w-3 h-3 text-blue-500" />;
        case Role.MENTOR: return <GraduationCap className="w-3 h-3 text-emerald-500" />;
        case Role.MENTEE: return <UserCheck className="w-3 h-3 text-purple-500" />;
        default: return <Users className="w-3 h-3" />;
      }
    };

    const getRoleBadgeColor = (role: Role) => {
      switch (role) {
        case Role.PLATFORM_ADMIN: return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
        case Role.ADMIN: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case Role.MENTOR: return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
        case Role.MENTEE: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        default: return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
      }
    };

    const getOrganizationName = (orgId: string) => {
      if (orgId === 'platform') return 'Platform';
      const org = allOrganizations.find(o => o.id === orgId);
      return org?.name || 'Unknown';
    };

    // Get active matches for a user
    const getUserMatches = (userId: string): Match[] => {
      return allMatches.filter(m => 
        m.status === MatchStatus.ACTIVE && 
        (m.mentorId === userId || m.menteeId === userId)
      );
    };

    // Get matched partner for a user
    const getMatchedPartner = (userId: string): User | null => {
      const userMatch = getUserMatches(userId)[0];
      if (!userMatch) return null;
      const partnerId = userMatch.mentorId === userId ? userMatch.menteeId : userMatch.mentorId;
      return allUsers.find(u => u.id === partnerId) || null;
    };

    // Format role for display
    const formatRole = (role: Role) => {
      switch (role) {
        case Role.ADMIN: return "Organization Admin";
        case Role.PLATFORM_ADMIN: return "Platform Operator";
        case Role.MENTOR: return "Mentor";
        case Role.MENTEE: return "Mentee";
        default: return role;
      }
    };

    return (
      <>
        <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-amber-500" />
              Platform Operator Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Overview and management of all users and organizations
            </p>
          </div>
        </div>

        {/* Additional Platform Metrics */}
        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Platform Growth Metrics
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Key indicators of platform health and growth
              </p>
            </div>
          </div>

          {platformAdminLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase">New Users (30d)</span>
                </div>
                <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{platformStats.recentUsers}</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {platformStats.totalUsers > 0 ? `${((platformStats.recentUsers / platformStats.totalUsers) * 100).toFixed(1)}% of total` : 'No users yet'}
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase">Avg Users/Org</span>
                </div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {platformStats.totalOrgs > 0 ? (platformStats.totalUsers / platformStats.totalOrgs).toFixed(1) : '0'}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Across {platformStats.totalOrgs} organizations</div>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Repeat className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase">Match Rate</span>
                </div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {platformStats.mentors > 0 && platformStats.mentees > 0
                    ? `${((platformStats.activeMatches * 2) / (platformStats.mentors + platformStats.mentees) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Participants matched</div>
              </div>

              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase">Goal Completion</span>
                </div>
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {platformStats.totalGoals > 0
                    ? `${((platformStats.completedGoals / platformStats.totalGoals) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {platformStats.completedGoals} of {platformStats.totalGoals} goals
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className={CARD_CLASS + " p-3 sm:p-4"}>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Users</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{platformAdminLoading ? '...' : platformStats.totalUsers}</div>
          </div>
          <div className={CARD_CLASS + " p-3 sm:p-4"}>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> Mentees
            </div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{platformAdminLoading ? '...' : platformStats.mentees}</div>
          </div>
          <div className={CARD_CLASS + " p-3 sm:p-4"}>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> Mentors
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600">{platformAdminLoading ? '...' : platformStats.mentors}</div>
          </div>
          <div className={CARD_CLASS + " p-3 sm:p-4"}>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Building className="w-3 h-3" /> Organizations
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{platformAdminLoading ? '...' : platformStats.totalOrgs}</div>
          </div>
          <div className={CARD_CLASS + " p-3 sm:p-4"}>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Org Admins
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{platformAdminLoading ? '...' : platformStats.orgAdmins}</div>
          </div>
          <div className={CARD_CLASS + " p-3 sm:p-4"}>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Crown className="w-3 h-3" /> Operators
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-600">{platformAdminLoading ? '...' : platformStats.platformAdmins}</div>
          </div>
        </div>

        {/* Quick Actions & Organizations - Side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className={CARD_CLASS}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Layout className="w-5 h-5 text-indigo-600" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate('user-management')}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">Manage All Users</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
                <button
                  onClick={() => onNavigate('platform-operator-management')}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">Create Platform Operator</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              <button
                onClick={() => onNavigate('resources')}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">Manage Content</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Organizations */}
          <div className={CARD_CLASS}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                Organizations
              </h3>
              <button
                onClick={() => onNavigate('user-management:organizations')}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {platformAdminLoading ? (
              <div className="text-center py-3 text-slate-500 text-xs">Loading...</div>
            ) : allOrganizations.length === 0 ? (
              <div className="text-center py-3 text-slate-500 text-xs">No organizations</div>
            ) : (
              <div className="space-y-1">
                {allOrganizations.slice(0, 5).map((org) => {
                  const orgUsers = allUsers.filter(u => u.organizationId === org.id);
                  return (
                    <div
                      key={org.id}
                      className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      onClick={() => onNavigate('user-management')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{org.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{orgUsers.length} users</div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-xs shrink-0 ${org.subscriptionTier === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                          org.subscriptionTier === 'business' ? 'bg-purple-100 text-purple-800' :
                            org.subscriptionTier === 'professional' ? 'bg-blue-100 text-blue-800' :
                              org.subscriptionTier === 'starter' ? 'bg-emerald-100 text-emerald-800' :
                                'bg-slate-100 text-slate-800'
                          }`}>
                          {org.subscriptionTier}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Users Section - Full width */}
        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Users
            </h2>
            <button
              onClick={() => onNavigate('user-management:users')}
              className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search users by name, email, or company..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className={INPUT_CLASS + " pl-10 text-sm"}
            />
          </div>

          {/* Users List */}
          {platformAdminLoading ? (
            <div className="text-center py-8 text-slate-500">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No users found</div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedUser(u);
                  }}
                >
                  <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 dark:text-white truncate">{u.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getRoleBadgeColor(u.role)}`}>
                        {getRoleIcon(u.role)}
                        {u.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3" />
                        {u.email}
                      </span>
                      <span className="flex items-center gap-1 truncate">
                        <Building className="w-3 h-3" />
                        {getOrganizationName(u.organizationId)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Matches Analytics */}
          <div className={CARD_CLASS}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-emerald-600" />
                  Matches Overview
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Platform-wide mentorship bridges
                </p>
              </div>
            </div>

            {platformAdminLoading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{platformStats.activeMatches}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Active</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{platformStats.completedMatches}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Completed</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{platformStats.totalMatches}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Total</div>
                  </div>
                </div>
                {platformStats.totalMatches > 0 && (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Active', value: platformStats.activeMatches, color: '#10b981' },
                            { name: 'Completed', value: platformStats.completedMatches, color: '#3b82f6' },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={40}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell key="cell-0" fill="#10b981" />
                          <Cell key="cell-1" fill="#3b82f6" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Goals Analytics */}
          <div className={CARD_CLASS}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Goals Overview
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Goal tracking across all organizations
                </p>
              </div>
            </div>

            {platformAdminLoading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{platformStats.completedGoals}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Completed</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{platformStats.inProgressGoals}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">In Progress</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{platformStats.totalGoals}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Total</div>
                  </div>
                </div>
                {platformStats.totalGoals > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Completion Rate</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {((platformStats.completedGoals / platformStats.totalGoals) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full transition-all"
                        style={{ width: `${(platformStats.completedGoals / platformStats.totalGoals) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ratings & Reviews - Combined - Full Width */}
        <div className={CARD_CLASS}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    Ratings & Reviews
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Platform-wide feedback metrics and approval management
                  </p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                  Platform Operator
                </span>
              </div>
              {allRatings.filter(r => !r.isApproved).length > 0 && (
                <span className="px-3 py-1 text-sm font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                  {allRatings.filter(r => !r.isApproved).length} Pending
                </span>
              )}
            </div>

            {platformAdminLoading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : (
              <div className="space-y-6">
                {/* Metrics Section */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="text-center p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{platformStats.approvedRatings}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Approved</div>
                    </div>
                    <div className="text-center p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{platformStats.totalRatings}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Total</div>
                    </div>
                  </div>
                  {platformStats.approvedRatings > 0 && (
                    <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                        <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                          {platformStats.avgRating.toFixed(1)}
                        </div>
                      </div>
                      <div className="text-sm text-amber-700 dark:text-amber-300">Average Rating</div>
                    </div>
                  )}
                </div>

                {/* Pending Reviews Section */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">Pending Reviews Approval</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Review and approve or reject ratings from all organizations across the platform
                  </p>
                  {allRatings.filter(r => !r.isApproved).length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
                      <p className="text-slate-400 text-sm">No pending reviews across all organizations</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {allRatings.filter(r => !r.isApproved).map(rating => {
                        const fromUser = allUsers.find(u => u.id === rating.fromUserId);
                        const toUser = allUsers.find(u => u.id === rating.toUserId);
                        const ratingOrg = allOrganizations.find(o => o.id === rating.organizationId);
                        return (
                          <div key={rating.id} className="p-4 border-2 border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-900/10">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Building className="w-4 h-4 text-blue-500" />
                                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                                    {ratingOrg?.name || 'Unknown Organization'}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                                  <span className="font-semibold">{fromUser?.name || 'Unknown User'}</span>
                                  <span className="text-slate-400 mx-1">reviewed</span>
                                  <span className="font-semibold">{toUser?.name || 'Unknown User'}</span>
                                </p>
                                <div className="flex items-center gap-1 mt-1 mb-2">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-4 h-4 ${i < rating.score ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                                  ))}
                                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">({rating.score}/5)</span>
                                </div>
                                {rating.comment && (
                                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 italic line-clamp-3 bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700">
                                    "{rating.comment}"
                                  </p>
                                )}
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                                  Submitted: {new Date(rating.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2 shrink-0">
                                <button
                                  onClick={() => onApproveRating(rating.id)}
                                  className="p-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-600 transition-colors shadow-sm flex items-center justify-center gap-1"
                                  title="Approve Review"
                                >
                                  <Check className="w-4 h-4" />
                                  <span className="text-xs font-medium">Approve</span>
                                </button>
                                {onRejectRating && (
                                  <button
                                    onClick={() => onRejectRating(rating.id)}
                                    className="p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-600 transition-colors shadow-sm flex items-center justify-center gap-1"
                                    title="Reject Review"
                                  >
                                    <X className="w-4 h-4" />
                                    <span className="text-xs font-medium">Reject</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-none sm:rounded-xl shadow-xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto border-0 sm:border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* User Profile Section */}
              <div className="flex items-start gap-3 sm:gap-4">
                <img src={selectedUser.avatar} alt={selectedUser.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-1 truncate">{selectedUser.name}</h4>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-2 break-all">{selectedUser.email}</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedUser.role === Role.MENTOR
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : selectedUser.role === Role.MENTEE
                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
                      : selectedUser.role === Role.ADMIN
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
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

              {/* Organization */}
              <div className={CARD_CLASS}>
                <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Organization</h5>
                <p className="text-slate-900 dark:text-white">{getOrganizationName(selectedUser.organizationId)}</p>
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
                      const partner = allUsers.find(u => u.id === partnerId);
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
                      <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-600 dark:text-slate-400">Not currently matched</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    onNavigate('user-management:users');
                  }}
                  className="flex-1 px-4 py-3 sm:py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
                >
                  <Edit className="w-4 h-4" /> Manage User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  // --- ORGANIZATION ADMIN VIEW ---
  if (isAdmin) {
    // Filter out admins from participant count (handle both enum and string values)
    const totalParticipants = users.filter(u => {
      const uRoleString = String(u.role);
      return u.role !== Role.ADMIN && 
             uRoleString !== "ORGANIZATION_ADMIN" && 
             uRoleString !== "ADMIN";
    }).length;
    const mentorCount = users.filter(u => u.role === Role.MENTOR || String(u.role) === "MENTOR").length;
    const menteeCount = users.filter(u => u.role === Role.MENTEE || String(u.role) === "MENTEE").length;
    const activeMatches = matches.filter(m => m.status === MatchStatus.ACTIVE).length;
    const pendingReviews = ratings.filter(r => !r.isApproved).length;

    // Calculate matched vs unmatched participants
    const matchedParticipants = activeMatches * 2; // Each match has 2 participants
    const unmatchedParticipants = Math.max(0, totalParticipants - matchedParticipants);

    return (
      <>
        {renderParticipantsModal()}
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div>
              {programSettings?.programName && (
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                  {programSettings.programName}
                </div>
              )}
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {organization?.logo && !orgLogoError ? (
                  <img
                    src={organization.logo}
                    alt={organization.name}
                    className="w-6 h-6 object-contain"
                    onError={() => {
                      setOrgLogoError(true);
                    }}
                  />
                ) : (
                  <Building className="w-6 h-6 text-blue-500" />
                )}
                {organization?.name || 'Organization Dashboard'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage your organization, users, bridges, and resources
              </p>
            </div>
            {programSettings && (
              <button
                type="button"
                onClick={() => onNavigate('setup')}
                className="flex items-center justify-center text-xs font-medium text-slate-500 hover:text-emerald-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors w-full sm:w-auto shrink-0"
              >
                <Edit className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Edit Program Config</span>
                <span className="sm:hidden ml-1.5">Edit Config</span>
              </button>
            )}
          </div>

          {/* Organization Overview Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className={CARD_CLASS}>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Total Participants</h3>
                <Users className="text-emerald-500 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">{totalParticipants}</p>
              <div className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 flex items-center gap-2">
                <button
                  onClick={() => setShowParticipantsModal('mentors')}
                  className={`transition-colors ${mentorCount === 0
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer'
                    }`}
                  disabled={mentorCount === 0}
                >
                  {mentorCount} {mentorCount === 1 ? 'mentor' : 'mentors'}
                </button>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <button
                  onClick={() => setShowParticipantsModal('mentees')}
                  className={`transition-colors ${menteeCount === 0
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer'
                    }`}
                  disabled={menteeCount === 0}
                >
                  {menteeCount} {menteeCount === 1 ? 'mentee' : 'mentees'}
                </button>
              </div>
            </div>

            <div className={CARD_CLASS}>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Active Bridges</h3>
                <Repeat className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">{activeMatches}</p>
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1 sm:mt-2">
                {activeMatches > 0 ? `${matchedParticipants} participants matched` : 'No active matches'}
              </p>
            </div>

            <div className={CARD_CLASS}>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Pending Reviews</h3>
                <AlertCircle className="text-amber-500 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">{pendingReviews}</p>
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1 sm:mt-2">Requires approval</p>
            </div>

            {!programSettings ? (
              <div className={`${CARD_CLASS} border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-bold">Program Setup</h3>
                  <Layout className="text-emerald-500 w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 sm:mb-3">Configure branding and signup forms.</p>
                <button
                  onClick={() => onNavigate('setup')}
                  className="w-full py-1.5 sm:py-2 bg-emerald-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center"
                >
                  Configure <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              </div>
            ) : (
              <div className={CARD_CLASS}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Program Status</h3>
                  <CheckCircle className="text-emerald-500 w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">Active</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 flex items-center truncate">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 mr-1.5 sm:mr-2 shrink-0"></span>
                  <span className="truncate">{programSettings.programName}</span>
                </p>
              </div>
            )}
          </div>

          {/* Management Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Manage Users */}
            {(isPlatformAdmin || isAdmin) && (
              <button
                type="button"
                onClick={() => {
                  if (isPlatformAdmin) {
                    onNavigate('user-management:users');
                  } else if (isAdmin) {
                    onNavigate('participants');
                  }
                }}
                className={`${CARD_CLASS} text-left hover:shadow-lg transition-all cursor-pointer group`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Manage Users</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Add, edit, or remove users from your organization. Manage roles and permissions.
                </p>
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-sm">
                  Go to User Management <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )}

            {/* Manage Bridges & Matches */}
            <button
              onClick={() => onNavigate('matching')}
              className={`${CARD_CLASS} text-left hover:shadow-lg transition-all cursor-pointer group`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                  <Repeat className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Manage Bridges</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Create and manage mentorship bridges between mentors and mentees. View active matches.
              </p>
              <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                Go to Matching <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Manage Resources */}
            <button
              onClick={() => onNavigate('resources')}
              className={`${CARD_CLASS} text-left hover:shadow-lg transition-all cursor-pointer group`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                  <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Manage Resources</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Create and manage articles, guides, templates, and videos for your organization.
              </p>
              <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium text-sm">
                Go to Resources <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          {/* Communities Section */}
          <div className={CARD_CLASS}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              Community Groups
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Access and monitor the main communities for mentors and mentees
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mentors Circle */}
              <button
                onClick={() => onNavigate('chat-mentors')}
                className="p-6 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mentors Circle</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  View and participate in the mentors community group chat
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {mentorCount} {mentorCount === 1 ? 'mentor' : 'mentors'} in group
                  </span>
                  <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Mentees Hub */}
              <button
                onClick={() => onNavigate('chat-mentees')}
                className="p-6 border-2 border-teal-200 dark:border-teal-800 rounded-xl hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                    <UserCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mentees Hub</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  View and participate in the mentees community group chat
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {menteeCount} {menteeCount === 1 ? 'mentee' : 'mentees'} in group
                  </span>
                  <ChevronRight className="w-5 h-5 text-teal-600 dark:text-teal-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>

          {/* Quick Info Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Pending Reviews - Organization Admin View */}
            <div className={CARD_CLASS}>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                  Pending Reviews
                </h3>
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                  Org Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Approve or reject reviews from your organization participants
              </p>
              {ratings.filter(r => !r.isApproved).length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                  <p className="text-slate-400 text-xs sm:text-sm">No pending reviews</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4 max-h-64 sm:max-h-80 overflow-y-auto">
                  {ratings.filter(r => !r.isApproved).map(rating => {
                    const fromUser = users.find(u => u.id === rating.fromUserId);
                    const toUser = users.find(u => u.id === rating.toUserId);
                    return (
                      <div key={rating.id} className="p-3 sm:p-4 border-2 border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-900/10">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white mb-1">
                              <span className="font-semibold">{fromUser?.name || 'Unknown'}</span>
                              <span className="text-slate-400 mx-1">reviewed</span>
                              <span className="font-semibold">{toUser?.name || 'Unknown'}</span>
                            </p>
                            <div className="flex items-center gap-1 mt-1 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3 h-3 sm:w-4 sm:h-4 ${i < rating.score ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                              ))}
                              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">({rating.score}/5)</span>
                            </div>
                            {rating.comment && (
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 italic line-clamp-3 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                                "{rating.comment}"
                              </p>
                            )}
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                              {new Date(rating.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() => onApproveRating(rating.id)}
                              className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-600 transition-colors shadow-sm"
                              title="Approve Review"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            {onRejectRating && (
                              <button
                                onClick={() => onRejectRating(rating.id)}
                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-600 transition-colors shadow-sm"
                                title="Reject Review"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Organization Code Card */}
            {organizationCode && (
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 sm:p-5 text-white shadow-md">
                <h3 className="font-bold text-xs sm:text-sm mb-2 flex items-center">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" /> Invite Code
                </h3>
                <p className="text-indigo-100 text-xs mb-2 sm:mb-3">
                  Share this code to add participants
                </p>
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 backdrop-blur-sm rounded px-2 sm:px-3 py-1.5 sm:py-2 font-mono text-sm sm:text-lg font-bold tracking-wider flex-1 overflow-x-auto overflow-y-hidden break-all">
                    {organizationCode}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-1.5 sm:p-2 rounded transition-colors shrink-0"
                    title="Copy code"
                  >
                    {codeCopied ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // --- MENTOR VIEW ---
  if (isMentor) {
    const myActiveMatches = matches.filter(m => m.mentorId === user.id && m.status === MatchStatus.ACTIVE);
    const myMentees = myActiveMatches.map(m => users.find(u => u.id === m.menteeId)).filter(Boolean) as User[];

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {renderRatingModal()}
        <div className="bg-indigo-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Hello, {user.name.split(' ')[0]}!</h1>
            <p className="text-indigo-200">Thanks for guiding the next generation of leaders.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold">{myMentees.length}</div>
                <div className="text-xs text-indigo-200 uppercase tracking-wider font-semibold">Active Mentees</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold flex items-center">
                  {(() => {
                    const mentorRatings = ratings.filter(r => r.toUserId === user.id && r.isApproved);
                    if (mentorRatings.length === 0) return 'N/A';
                    const avgRating = mentorRatings.reduce((sum, r) => sum + r.score, 0) / mentorRatings.length;
                    return avgRating.toFixed(1);
                  })()}
                  {(() => {
                    const mentorRatings = ratings.filter(r => r.toUserId === user.id && r.isApproved);
                    if (mentorRatings.length > 0) {
                      return <Star className="w-4 h-4 text-amber-400 fill-amber-400 ml-1" />;
                    }
                    return null;
                  })()}
                </div>
                <div className="text-xs text-indigo-200 uppercase tracking-wider font-semibold">Avg. Rating</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold">
                  {calendarEvents.filter(e => e.mentorId === user.id || e.menteeId === user.id).length}
                </div>
                <div className="text-xs text-indigo-200 uppercase tracking-wider font-semibold">Scheduled Events</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Mentorship Bridges</h2>
            </div>

            {myMentees.map(mentee => {
              const menteeGoals = goals.filter(g => g.userId === mentee.id);
              const activeGoal = menteeGoals.find(g => g.status === 'In Progress') || menteeGoals[0];

              return (
                <div key={mentee.id} className={CARD_CLASS}>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex items-center md:items-start gap-4 min-w-0 md:min-w-[200px]">
                      <img src={mentee.avatar} className="w-16 h-16 rounded-full object-cover" alt="" />
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg">{mentee.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{mentee.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{mentee.company}</p>
                      </div>
                    </div>
                    <div className="flex-1 border-l border-slate-100 dark:border-slate-800 md:pl-6 space-y-3">
                      <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center">
                        <Target className="w-3.5 h-3.5 mr-1" /> Current Focus
                      </h4>
                      {activeGoal ? (
                        <div>
                          <p className="font-medium text-slate-700 dark:text-slate-300">{activeGoal.title}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-2 flex-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${activeGoal.progress}%` }}></div>
                            </div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{activeGoal.progress}%</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No active goals set yet.</p>
                      )}
                      <div className="flex gap-2 mt-4 pt-2">
                        <button
                          onClick={() => onNavigate('chat')}
                          className="text-sm bg-slate-900 dark:bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 flex items-center"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Message
                        </button>
                        <button
                          onClick={() => onNavigate('calendar')}
                          className="text-sm border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center"
                        >
                          <Calendar className="w-3.5 h-3.5 mr-1.5" /> Schedule
                        </button>
                        <button
                          onClick={() => setRatingTarget(mentee)}
                          className="text-sm border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-200 flex items-center ml-auto"
                          title="Rate Mentee"
                        >
                          <Star className="w-3.5 h-3.5 mr-1.5" /> Rate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {myMentees.length === 0 && (
              <div className="text-center py-12 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <Users className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Waiting for Your First Mentee</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-md mx-auto">
                  Your profile is live! Mentees can now discover you and request mentorship. You'll be notified when someone wants to connect.
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  <div className="bg-white dark:bg-slate-800 rounded-lg px-4 py-2 border border-emerald-200 dark:border-emerald-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">💡 Tip</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Check your notifications regularly</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-lg px-4 py-2 border border-emerald-200 dark:border-emerald-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">📚 Explore</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Browse resources while you wait</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className={CARD_CLASS}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white mb-1">Upcoming Events</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Don't miss out on scheduled sessions.</p>
                </div>
                <Calendar className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="mt-4 space-y-3">
                {calendarEvents
                  .filter(e => {
                    // Show events where user is a participant (mentor or mentee)
                    const isParticipant = e.mentorId === user.id || e.menteeId === user.id || 
                                         (e.participants && e.participants.includes(user.id));
                    if (!isParticipant) return false;
                    
                    const eventDate = new Date(e.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return eventDate >= today;
                  })
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 3)
                  .map(event => {
                    const eventDate = new Date(event.date);
                    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                    return (
                      <div key={event.id} className="flex gap-3 items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="bg-white dark:bg-slate-700 rounded p-2 text-center min-w-[50px] shadow-sm">
                          <div className="text-xs text-slate-500 dark:text-slate-300 font-bold">{monthNames[eventDate.getMonth()]}</div>
                          <div className="text-lg font-bold text-slate-900 dark:text-white">{eventDate.getDate()}</div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{event.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{event.startTime} • {event.type}</p>
                        </div>
                      </div>
                    );
                  })}
                {calendarEvents.filter(e => {
                  const isParticipant = e.mentorId === user.id || e.menteeId === user.id || 
                                       (e.participants && e.participants.includes(user.id));
                  if (!isParticipant) return false;
                  
                  const eventDate = new Date(e.date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return eventDate >= today;
                }).length === 0 && (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4 italic">No upcoming events</p>
                )}
              </div>
              <button
                onClick={() => onNavigate('calendar')}
                className="w-full mt-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
              >
                View Calendar <ArrowRight className="w-4 h-4 inline ml-1" />
              </button>
            </div>

            <div className={CARD_CLASS}>
              <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                <Globe className="w-5 h-5 text-indigo-500 mr-2" /> Mentors Circle
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Connect with other mentors to share experiences and advice.</p>
              <button onClick={() => onNavigate('chat-mentors')} className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                Open Group Chat
              </button>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 border border-emerald-100 dark:border-emerald-800">
              <h3 className="font-bold text-emerald-900 dark:text-emerald-300 mb-2">Resource Library</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-4">Find articles and guides to share with your mentees.</p>
              <button onClick={() => onNavigate('resources')} className="text-sm font-medium text-emerald-700 dark:text-emerald-400 underline hover:text-emerald-800">
                Browse Library &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MENTEE VIEW ---
  else {
    const myMatch = matches.find(m => (m.menteeId === user.id || m.mentorId === user.id) && m.status === MatchStatus.ACTIVE);
    const partnerId = myMatch ? (myMatch.menteeId === user.id ? myMatch.mentorId : myMatch.menteeId) : null;
    const partner = users.find(u => u.id === partnerId);

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {renderRatingModal()}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back, {user.name.split(' ')[0]}!</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Ready to grow today?</p>
        </header>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <Repeat className="w-5 h-5 mr-2 opacity-80" />
            My Bridge (Mentor)
          </h2>

          {partner ? (
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <img src={partner.avatar} alt={partner.name} className="w-20 h-20 rounded-full border-4 border-white/20" />
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold">{partner.name}</h3>
                <p className="text-emerald-100 mb-4">{partner.title} at {partner.company}</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {partner.skills.slice(0, 3).map(skill => (
                    <span key={skill} className="bg-white/20 px-3 py-1 rounded-full text-xs backdrop-blur-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <button onClick={() => onNavigate('chat')} className="bg-white text-emerald-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-emerald-50 transition-colors flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 mr-2" /> Chat
                </button>
                <button onClick={() => onNavigate('calendar')} className="bg-emerald-800/50 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-emerald-800/70 transition-colors flex items-center justify-center">
                  <Calendar className="w-4 h-4 mr-2" /> Schedule
                </button>
                <button
                  onClick={() => setRatingTarget(partner)}
                  className="bg-emerald-800/50 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-emerald-800/70 transition-colors flex items-center justify-center"
                >
                  <Star className="w-4 h-4 mr-2" /> Rate Mentor
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-emerald-100">You are currently not matched with a mentor.</p>
              <p className="text-sm opacity-75 mt-2">Admin is working on your bridge!</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 dark:from-cyan-700 dark:to-blue-800 rounded-xl p-6 shadow-md text-white border border-transparent dark:border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="font-bold text-white text-lg">My Focus</h3>
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Target className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="space-y-5 relative z-10">
              {goals.filter(g => g.userId === user.id).slice(0, 3).map(goal => (
                <div key={goal.id} className="group">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-indigo-50 group-hover:text-white transition-colors">{goal.title}</span>
                    <span className="text-indigo-200 font-mono text-xs">{goal.progress}%</span>
                  </div>
                  <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white/80 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${goal.progress}%` }}></div>
                  </div>
                </div>
              ))}
              {goals.filter(g => g.userId === user.id).length === 0 && (
                <p className="text-indigo-200 text-sm text-center py-4 italic">No active goals yet.</p>
              )}
            </div>

            <button
              onClick={() => onNavigate('my-goals')}
              className="w-full mt-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium text-white transition-all flex items-center justify-center relative z-10"
            >
              View All Goals <ArrowRight className="w-4 h-4 ml-2 opacity-70" />
            </button>
          </div>

          <div className={CARD_CLASS}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Upcoming Events</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Don't miss out on community growth.</p>
              </div>
              <Calendar className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="mt-4 space-y-3">
              {calendarEvents
                .filter(e => {
                  // Show events where user is a participant (mentor or mentee)
                  const isParticipant = e.mentorId === user.id || e.menteeId === user.id || 
                                       (e.participants && e.participants.includes(user.id));
                  if (!isParticipant) return false;
                  
                  const eventDate = new Date(e.date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return eventDate >= today;
                })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 3)
                .map(event => {
                  const eventDate = new Date(event.date);
                  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                  return (
                    <div key={event.id} className="flex gap-3 items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <div className="bg-white dark:bg-slate-700 rounded p-2 text-center min-w-[50px] shadow-sm">
                        <div className="text-xs text-slate-500 dark:text-slate-300 font-bold">{monthNames[eventDate.getMonth()]}</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">{eventDate.getDate()}</div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{event.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{event.startTime} • {event.type}</p>
                      </div>
                    </div>
                  );
                })}
              {calendarEvents.filter(e => {
                const isParticipant = e.mentorId === user.id || e.menteeId === user.id || 
                                     (e.participants && e.participants.includes(user.id));
                if (!isParticipant) return false;
                
                const eventDate = new Date(e.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return eventDate >= today;
              }).length === 0 && (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4 italic">No upcoming events</p>
                )}
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="w-full mt-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              View Calendar <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>

          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white relative overflow-hidden shadow-sm">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Join the Community</h3>
              <p className="text-indigo-100 text-sm mb-4">Connect with fellow professionals.</p>
              <button onClick={() => onNavigate('chat-mentees')} className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-50">
                Enter Mentees Hub
              </button>
            </div>
            <Users className="absolute bottom-[-10px] right-[-10px] w-24 h-24 text-white opacity-10" />
          </div>
        </div>
      </div>
    );
  }
};

export default Dashboard;
