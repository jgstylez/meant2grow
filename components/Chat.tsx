import React, { useState, useEffect, useRef } from 'react';
import { User, Role, ChatMessage as ChatMessageType, ChatGroup, Mood, CalendarEvent } from '../types';
import { INPUT_CLASS, BUTTON_PRIMARY } from '../styles/common';
import {
  SmilePlus, Video, Phone, MoreVertical, Users, Edit, UserPlus, Calendar,
  BellOff, Trash, LogOut, Pin, Share2, Ban, Flag, ArrowLeft,
  Paperclip, ImageIcon, Smile, Send, FileText, Download, X, Mic, Plus,
  Meh, Frown, Activity, ChevronDown, MessageSquare
} from 'lucide-react';
import {
  createChatMessage,
  subscribeToChatMessages,
  updateChatMessage,
  createChatGroup,
  subscribeToChatGroups,
  getChatGroupsByOrganization,
  createCalendarEvent,
  updateChatGroup,
  createNotification,
} from '../services/database';
import { Unsubscribe } from '../services/database';
import { logger } from '../services/logger';

// Using ChatMessage and ChatGroup from types.ts

// Helper function to format timestamp for chat list
const formatChatTime = (timestamp?: string): string => {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Just now (< 1 min)
  if (diffMins < 1) return 'now';

  // Minutes ago (< 60 min)
  if (diffMins < 60) return `${diffMins}m`;

  // Hours ago (< 24 hours)
  if (diffHours < 24) return `${diffHours}h`;

  // Yesterday
  if (diffDays === 1) return 'Yesterday';

  // This week (< 7 days) - show day name
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // This year - show month/day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Older - show full date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
};

// Helper function to get mood display info
const getMoodDisplay = (mood?: Mood): { emoji: string; label: string; color: string } => {
  const moodMap: Record<Mood, { emoji: string; label: string; color: string }> = {
    'Happy': { emoji: '😊', label: 'Happy', color: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800' },
    'Neutral': { emoji: '😐', label: 'Neutral', color: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
    'Stressed': { emoji: '😓', label: 'Stressed', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800' },
    'Excited': { emoji: '🤩', label: 'Excited', color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800' },
    'Tired': { emoji: '😴', label: 'Tired', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' },
    'Motivated': { emoji: '💪', label: 'Motivated', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' },
    'Anxious': { emoji: '😰', label: 'Anxious', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' },
    'Grateful': { emoji: '🙏', label: 'Grateful', color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800' },
  };

  if (!mood || !moodMap[mood]) {
    return { emoji: '😐', label: 'No mood set', color: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' };
  }

  return moodMap[mood];
};

const AvatarCluster: React.FC<{ users: User[], chatType: 'group' | 'dm', max: number }> = ({ users, chatType, max = 3 }) => {
  if (chatType === 'dm') {
    const u = users[0];
    return (
      <div className="relative inline-block">
        <img src={u?.avatar || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800" alt={u?.name} />
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
      </div>
    )
  }

  const visibleUsers = users.slice(0, max);
  const extraCount = users.length - max;

  return (
    <div className="flex items-center -space-x-4">
      {visibleUsers.map((u, i) => (
        <div key={i} className="relative z-0 hover:z-10 transition-all duration-200 group">
          <img
            src={u.avatar}
            className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
            alt={u.name}
            title={u.name}
          />
        </div>
      ))}
      {extraCount > 0 && (
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 z-0 relative">
          +{extraCount}
        </div>
      )}
    </div>
  );
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👀', '🤝', '🙌', '👏', '💪', '🙏', '💯', '✨'];
const MOCK_GIFS = [
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDN4eWwxZnB4eWx4ZnB4eWwxZnB4eWx4ZnB4eWwxZnB4eWx4ZnB4eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnAiaMCws8nOsE/giphy.gif',
  'https://media.giphy.com/media/l0HlHJGHe3yAMhdQY/giphy.gif',
  'https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif',
];

interface ChatProps {
  currentUser: User;
  users: User[];
  organizationId: string;
  initialChatId?: string;
}

const Chat: React.FC<ChatProps> = ({ currentUser, users, organizationId, initialChatId }) => {
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const unsubscribeMessagesRef = useRef<Record<string, Unsubscribe>>({});
  const unsubscribeGroupsRef = useRef<Unsubscribe | null>(null);

  // Initialize and maintain default groups
  useEffect(() => {
    const syncGroupMembership = async () => {
      try {
        const existingGroups = await getChatGroupsByOrganization(organizationId);

        // Find existing groups
        const mentorGroup = existingGroups.find(g => g.id === 'g-mentors' || g.name === 'Mentors Circle');
        const menteeGroup = existingGroups.find(g => g.id === 'g-mentees' || g.name === 'Mentees Hub');

        const mentorUsers = users.filter(u => u.role === Role.MENTOR);
        const menteeUsers = users.filter(u => u.role === Role.MENTEE);
        // Admins and platform operators should have access to both groups
        const adminUsers = users.filter(u => u.role === Role.ADMIN || u.role === Role.PLATFORM_ADMIN);

        // Create Mentors Circle if it doesn't exist
        if (!mentorGroup) {
          // Include mentors + admins/platform admins
          const mentorGroupMembers = [
            ...mentorUsers.map(u => u.id),
            ...adminUsers.map(u => u.id)
          ];
          await createChatGroup({
            organizationId,
            name: 'Mentors Circle',
            avatar: 'https://ui-avatars.com/api/?name=Mentors+Circle&background=0D9488&color=fff',
            type: 'group',
            members: mentorGroupMembers,
            createdBy: currentUser.id,
          }, 'g-mentors');
          logger.info('Created Mentors Circle group');
        } else {
          // Update membership to include all current mentors + admins/platform admins
          const currentMembers = mentorGroup.members || [];
          const mentorIds = mentorUsers.map(u => u.id);
          const adminIds = adminUsers.map(u => u.id);
          const expectedMembers = [...mentorIds, ...adminIds];
          // Check if membership needs updating (arrays differ)
          const needsUpdate = expectedMembers.length !== currentMembers.length ||
            expectedMembers.some(id => !currentMembers.includes(id)) ||
            currentMembers.some(id => !expectedMembers.includes(id));

          if (needsUpdate) {
            await updateChatGroup('g-mentors', { members: expectedMembers });
            logger.info('Updated Mentors Circle membership', { mentors: mentorIds.length, admins: adminIds.length });
          }
        }

        // Create Mentees Hub if it doesn't exist
        if (!menteeGroup) {
          // Include mentees + admins/platform admins
          const menteeGroupMembers = [
            ...menteeUsers.map(u => u.id),
            ...adminUsers.map(u => u.id)
          ];
          await createChatGroup({
            organizationId,
            name: 'Mentees Hub',
            avatar: 'https://ui-avatars.com/api/?name=Mentees+Hub&background=4F46E5&color=fff',
            type: 'group',
            members: menteeGroupMembers,
            createdBy: currentUser.id,
          }, 'g-mentees');
          logger.info('Created Mentees Hub group');
        } else {
          // Update membership to include all current mentees + admins/platform admins
          const currentMembers = menteeGroup.members || [];
          const menteeIds = menteeUsers.map(u => u.id);
          const adminIds = adminUsers.map(u => u.id);
          const expectedMembers = [...menteeIds, ...adminIds];
          // Check if membership needs updating (arrays differ)
          const needsUpdate = expectedMembers.length !== currentMembers.length ||
            expectedMembers.some(id => !currentMembers.includes(id)) ||
            currentMembers.some(id => !expectedMembers.includes(id));

          if (needsUpdate) {
            await updateChatGroup('g-mentees', { members: expectedMembers });
            logger.info('Updated Mentees Hub membership', { mentees: menteeIds.length, admins: adminIds.length });
          }
        }
      } catch (error) {
        logger.error('Error syncing chat groups', error);
      }
    };

    if (organizationId && users.length > 0) {
      syncGroupMembership();
    }
  }, [organizationId, users, currentUser.id]); // Re-run when users change

  // Subscribe to chat groups
  useEffect(() => {
    if (!organizationId) return;

    unsubscribeGroupsRef.current = subscribeToChatGroups(organizationId, (groups) => {
      setChatGroups(groups);
    });

    return () => {
      if (unsubscribeGroupsRef.current) {
        unsubscribeGroupsRef.current();
      }
    };
  }, [organizationId]);

  // Use Firestore groups if available, otherwise use fallback
  // Also ensure requested groups are always included (for direct navigation)
  const availableGroupsList = (() => {
    const groups = chatGroups.length > 0 ? chatGroups : [];
    const fallback: ChatGroup[] = [];

    // Always include fallback groups if they're requested or if no groups exist
    const needsMentors = initialChatId === 'g-mentors' ||
      (chatGroups.length === 0 && users.some(u => u.role === Role.MENTOR));
    const needsMentees = initialChatId === 'g-mentees' ||
      (chatGroups.length === 0 && users.some(u => u.role === Role.MENTEE));

    // Check if groups already exist in Firestore groups
    const hasMentorsGroup = groups.some(g => g.id === 'g-mentors');
    const hasMenteesGroup = groups.some(g => g.id === 'g-mentees');

    if (needsMentors && !hasMentorsGroup) {
      // Include mentors + admins/platform admins
      const mentorGroupMembers = [
        ...users.filter(u => u.role === Role.MENTOR).map(u => u.id),
        ...users.filter(u => u.role === Role.ADMIN || u.role === Role.PLATFORM_ADMIN).map(u => u.id)
      ];
      fallback.push({
        id: 'g-mentors',
        name: 'Mentors Circle',
        avatar: 'https://ui-avatars.com/api/?name=Mentors+Circle&background=0D9488&color=fff',
        type: 'group',
        members: mentorGroupMembers,
        organizationId,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
      });
    }
    if (needsMentees && !hasMenteesGroup) {
      // Include mentees + admins/platform admins
      const menteeGroupMembers = [
        ...users.filter(u => u.role === Role.MENTEE).map(u => u.id),
        ...users.filter(u => u.role === Role.ADMIN || u.role === Role.PLATFORM_ADMIN).map(u => u.id)
      ];
      fallback.push({
        id: 'g-mentees',
        name: 'Mentees Hub',
        avatar: 'https://ui-avatars.com/api/?name=Mentees+Hub&background=4F46E5&color=fff',
        type: 'group',
        members: menteeGroupMembers,
        organizationId,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
      });
    }

    // Merge Firestore groups with fallback, avoiding duplicates
    const merged = [...groups];
    fallback.forEach(fb => {
      if (!merged.some(g => g.id === fb.id)) {
        merged.push(fb);
      }
    });
    return merged;
  })();

  const MOCK_GROUPS: ChatGroup[] = availableGroupsList;

  // Filter groups based on role, membership, and organization
  const isPlatformAdmin = currentUser.role === Role.PLATFORM_ADMIN;
  const availableGroups = MOCK_GROUPS.filter(g => {
    // Platform admins can see groups from all organizations
    // Other users can only see groups from their organization
    if (!isPlatformAdmin && g.organizationId !== organizationId) {
      return false;
    }

    // Check if user is a member of the group
    const isMember = g.members && g.members.includes(currentUser.id);

    // Org admins and platform operators can see both Mentees Hub and Mentors Circle
    if (currentUser.role === Role.ADMIN || isPlatformAdmin) {
      // They should see both groups if they're members (they're automatically added)
      return (g.id === 'g-mentors' || g.id === 'g-mentees') && isMember;
    }

    // All mentors should see Mentors Circle (they're automatically members)
    if (currentUser.role === Role.MENTOR) {
      return g.id === 'g-mentors' && isMember;
    }

    // All mentees should see Mentees Hub (they're automatically members)
    if (currentUser.role === Role.MENTEE) {
      return g.id === 'g-mentees' && isMember;
    }

    return false;
  });

  // Filter DMs based on role and organization: 
  // - Platform admins can see everyone across all organizations
  // - Admins can see everyone in their organization
  // - Mentees can see Mentees Hub and messages directly sent to them
  // - Mentors can see Mentors Circle and messages directly sent to them
  const availableDMs = users.filter(u => {
    if (u.id === currentUser.id) return false;

    // Platform admins can see users from all organizations
    if (isPlatformAdmin) {
      return true;
    }

    // Ensure users are in the same organization
    if (u.organizationId !== currentUser.organizationId) return false;

    // Regular admins can see everyone in their organization
    if (currentUser.role === Role.ADMIN) {
      return true;
    }

    // Regular users can only see admins in their organization
    return u.role === Role.ADMIN || u.role === Role.PLATFORM_ADMIN;
  });
  const allChats = [...availableGroups, ...availableDMs];

  const [activeChatId, setActiveChatId] = useState<string>(() => {
    if (initialChatId) return initialChatId;
    // Don't auto-select a chat on initial render to show the list
    return '';
  });

  // Update activeChatId when initialChatId changes
  useEffect(() => {
    if (initialChatId) {
      setActiveChatId(initialChatId);
    } else if (initialChatId === undefined) {
      // Clear selection when navigating back to general chat page
      setActiveChatId('');
    }
  }, [initialChatId]);

  // Auto-select the chat once it's loaded (for group chats)
  useEffect(() => {
    if (initialChatId && allChats.length > 0) {
      // If we're waiting for a specific group chat, check if it's now available
      const foundChat = allChats.find(c => c.id === initialChatId);
      if (foundChat) {
        // Group chat is now available, select it if not already selected
        if (activeChatId !== initialChatId) {
          setActiveChatId(initialChatId);
        }
      }
    }
  }, [initialChatId, allChats, activeChatId]);
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeModal, setActiveModal] = useState<null | 'video' | 'phone' | 'groupInfo' | 'mute' | 'schedule' | 'userProfile' | 'block' | 'report' | 'clearHistory' | 'shareContact'>(null);

  // New States for Actions
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [mutedChats, setMutedChats] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<Record<string, ChatMessageType[]>>({});
  const [reactionMenuMessageId, setReactionMenuMessageId] = useState<string | null>(null);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [sentiment, setSentiment] = useState<'Positive' | 'Neutral' | 'Negative'>('Neutral');
  const [showSentimentMenu, setShowSentimentMenu] = useState(false);
  const [sentimentManuallySet, setSentimentManuallySet] = useState(false); // Track if user manually overrode sentiment

  // Meeting scheduling state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [meetingDuration, setMeetingDuration] = useState('1h');
  const [meetingParticipants, setMeetingParticipants] = useState<string[]>([]);
  const [showMeetingParticipantDropdown, setShowMeetingParticipantDropdown] = useState(false);

  // Subscribe to messages for active chat
  useEffect(() => {
    if (!activeChatId || !organizationId) return;

    // Find the chat group if it's a group chat
    const activeGroup = MOCK_GROUPS.find(g => g.id === activeChatId);
    const isGroupChat = !!activeGroup;

    // Verify user has access to this chat
    if (isGroupChat) {
      // For group chats, verify user is a member
      const isMember = activeGroup.members && activeGroup.members.includes(currentUser.id);
      if (!isMember) {
        // User is not a member of this group - don't subscribe to messages
        setMessages(prev => ({
          ...prev,
          [activeChatId]: [],
        }));
        return;
      }
    } else {
      // This is a DM - verify current user has permission
      const chatPartnerId = activeChatId;
      const chatPartner = users.find(u => u.id === chatPartnerId);

      // Verify organization match (Platform Admins can chat with anyone)
      if (!isPlatformAdmin && chatPartner && chatPartner.organizationId !== currentUser.organizationId) {
        setMessages(prev => ({
          ...prev,
          [activeChatId]: [],
        }));
        return;
      }

      // Only allow if:
      // 1. Current user is admin/platform admin (can see all)
      // 2. Chat partner is admin/platform admin (regular users can message admins)
      if (currentUser.role !== Role.ADMIN &&
        currentUser.role !== Role.PLATFORM_ADMIN &&
        chatPartner &&
        chatPartner.role !== Role.ADMIN &&
        chatPartner.role !== Role.PLATFORM_ADMIN) {
        // Regular user trying to chat with another regular user - not allowed
        setMessages(prev => ({
          ...prev,
          [activeChatId]: [],
        }));
        return;
      }
    }

    // Cleanup previous subscription
    if (unsubscribeMessagesRef.current[activeChatId]) {
      unsubscribeMessagesRef.current[activeChatId]();
    }

    // Get the timestamp when user joined the group (for group chats)
    // For new users joining groups, only show messages after they joined
    const userJoinedTimestamp = isGroupChat && activeGroup
      ? (() => {
        // Check if there's a way to track when user joined
        // For now, we'll use a timestamp stored in user's profile or group metadata
        // If not available, we'll only show messages from now onwards for new members
        // This prevents new users from seeing old messages
        const userCreatedAt = new Date(currentUser.createdAt || Date.now()).getTime();
        const groupCreatedAt = new Date(activeGroup.createdAt || Date.now()).getTime();
        // Use the later of the two - when user was created or when group was created
        return Math.max(userCreatedAt, groupCreatedAt);
      })()
      : null;

    // Subscribe to messages for this chat
    unsubscribeMessagesRef.current[activeChatId] = subscribeToChatMessages(
      activeChatId,
      organizationId,
      (newMessages) => {
        // Filter messages to ensure user only sees messages they're allowed to see
        const filteredMessages = newMessages.filter(msg => {
          // Ensure message is from the same organization
          if (msg.organizationId !== organizationId) {
            return false;
          }

          // Group messages: only members can see, and only messages after they joined
          if (isGroupChat) {
            // For group chats, filter out messages from before user joined (if timestamp available)
            if (userJoinedTimestamp) {
              const messageTimestamp = new Date(msg.timestamp).getTime();
              if (messageTimestamp < userJoinedTimestamp) {
                return false; // Don't show old messages to new members
              }
            }
            return true; // All group members can see messages after they joined
          }

          // DM messages: only sender and recipient can see
          // For DMs, activeChatId is the chat partner's ID
          const isSender = msg.senderId === currentUser.id;
          const isRecipient = msg.senderId === activeChatId; // Chat partner sent the message

          // Admins can see all messages in their organization
          if (currentUser.role === Role.ADMIN || currentUser.role === Role.PLATFORM_ADMIN) {
            return isSender || isRecipient;
          }

          return isSender || isRecipient;
        });

        setMessages(prev => ({
          ...prev,
          [activeChatId]: filteredMessages,
        }));
      }
    );

    return () => {
      if (unsubscribeMessagesRef.current[activeChatId]) {
        unsubscribeMessagesRef.current[activeChatId]();
      }
    };
  }, [activeChatId, organizationId, currentUser, users, MOCK_GROUPS]);

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      Object.values(unsubscribeMessagesRef.current).forEach(unsub => unsub());
      if (unsubscribeGroupsRef.current) {
        unsubscribeGroupsRef.current();
      }
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  // Sorting Logic: Pinned first
  const sortedChats = [...allChats]
    .filter(chat => chat.name.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    .sort((a, b) => {
      const aPinned = pinnedChats.includes(a.id);
      const bPinned = pinnedChats.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

  // Messages are now loaded via Firestore subscriptions

  const activeChat = allChats.find(c => c.id === activeChatId);

  // Sentiment Analysis Logic - respects manual overrides
  useEffect(() => {
    // Don't auto-update if user has manually set sentiment
    if (sentimentManuallySet) return;

    const currentChatMessages = messages[activeChatId] || [];
    // Only auto-update if messages exist
    if (!currentChatMessages.length) {
      setSentiment('Neutral');
      return;
    }

    const analyzeSentiment = () => {
      const positiveWords = ['great', 'good', 'happy', 'thanks', 'progress', 'excited', 'love', 'best', 'awesome', 'helping', 'excellent', 'glad', 'wonderful'];
      const negativeWords = ['bad', 'sad', 'stuck', 'worried', 'hard', 'difficult', 'stress', 'fail', 'issue', 'problem', 'tired', 'upset', 'angry'];

      // Analyze last 5 messages
      const recentMessages = currentChatMessages.slice(-5);
      let score = 0;

      recentMessages.forEach(msg => {
        const text = msg.text.toLowerCase();
        positiveWords.forEach(word => { if (text.includes(word)) score += 1; });
        negativeWords.forEach(word => { if (text.includes(word)) score -= 1; });
      });

      if (score > 0) setSentiment('Positive');
      else if (score < 0) setSentiment('Negative');
      else setSentiment('Neutral');
    };

    analyzeSentiment();
  }, [messages, activeChatId, sentimentManuallySet]);

  // Reset manual sentiment flag when switching chats
  useEffect(() => {
    setSentimentManuallySet(false);
  }, [activeChatId]);

  // Don't show "Loading" if we just haven't selected a chat yet
  // Only show loading if we're waiting for a specific chat to load
  const isWaitingForSpecificChat = activeChatId && !activeChat && (
    activeChatId === 'g-mentors' ||
    activeChatId === 'g-mentees' ||
    allChats.length === 0  // Still loading chat list
  );

  if (isWaitingForSpecificChat) {
    // Show a better loading state
    return (
      <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p>Loading chat groups...</p>
        </div>
      </div>
    );
  }

  const currentChatMessages = messages[activeChatId] || [];
  // @ts-ignore
  const isGroup = activeChat?.type === 'group';
  // @ts-ignore
  const groupMembers = isGroup ? activeChat.members.map(id => users.find(u => u.id === id)).filter(Boolean) as User[] : [];
  // @ts-ignore
  const chatPartner = !isGroup && activeChat ? users.find(u => u.id === activeChat.id) : null;
  const isBlocked = chatPartner && blockedUsers.includes(chatPartner.id);

  const handleManualSentimentChange = (newSentiment: 'Positive' | 'Neutral' | 'Negative') => {
    setSentiment(newSentiment);
    setSentimentManuallySet(true); // Mark as manually set so auto-analysis doesn't override
    setShowSentimentMenu(false);
  };

  const handleSend = async (text = inputText) => {
    if (isBlocked) return;
    if ((!text.trim() && !attachment) || !activeChatId || !organizationId) {
      logger.warn('Cannot send message: missing required fields', { hasText: !!text.trim(), hasAttachment: !!attachment, activeChatId, organizationId });
      return;
    }

    try {
      // Determine chat type
      const isGroup = MOCK_GROUPS.some(g => g.id === activeChatId);
      const chatType: 'dm' | 'group' = isGroup ? 'group' : 'dm';

      logger.debug('Sending message', { chatId: activeChatId, chatType, organizationId, senderId: currentUser.id, textLength: text.length });

      // Handle file upload (for now, store URL - in production, upload to Cloud Storage)
      const messagePayload: Omit<ChatMessageType, 'id' | 'createdAt'> = {
        organizationId,
        chatId: activeChatId,
        chatType,
        senderId: currentUser.id,
        text: text,
        type: attachment ? (attachment.type.startsWith('image/') ? 'image' : 'file') : 'text',
        timestamp: new Date().toISOString(),
        isRead: false,
        readBy: [currentUser.id], // Sender has read their own message
      };

      // Only include file-related fields if there's an attachment
      if (attachment) {
        messagePayload.fileName = attachment.name;
        messagePayload.fileUrl = URL.createObjectURL(attachment);
      }

      // Create message in Firestore
      const messageId = await createChatMessage(messagePayload);

      logger.info('Message created successfully', { messageId });

      // Create notifications for recipients (non-blocking)
      if (chatType === 'dm') {
        // Direct message - notify the recipient
        const recipientId = activeChatId;
        if (recipientId !== currentUser.id) {
          createNotification({
            organizationId,
            userId: recipientId,
            type: 'message',
            title: 'New Message',
            body: `${currentUser.name}: ${text.length > 50 ? text.substring(0, 50) + '...' : text}`,
            isRead: false,
            timestamp: new Date().toISOString(),
          }).catch(err => logger.error('Error creating message notification', err));
        }
      } else {
        // Group message - notify all group members except sender
        const group = MOCK_GROUPS.find(g => g.id === activeChatId);
        if (group) {
          const membersToNotify = group.members.filter(memberId => memberId !== currentUser.id);
          membersToNotify.forEach(memberId => {
            createNotification({
              organizationId,
              userId: memberId,
              type: 'message',
              title: `New Message in ${group.name}`,
              body: `${currentUser.name}: ${text.length > 50 ? text.substring(0, 50) + '...' : text}`,
              isRead: false,
              timestamp: new Date().toISOString(),
            }).catch(err => logger.error('Error creating group message notification', err));
          });
        }
      }

      // Clear input - real-time listener will update messages
      setInputText('');
      setAttachment(null);
      setShowEmojiPicker(false);
      setShowGifPicker(false);
    } catch (error) {
      logger.error('Error sending message', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        chatId: activeChatId,
        organizationId,
        senderId: currentUser.id,
      });
      // Show user-friendly error
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = messages[activeChatId]?.find(m => m.id === messageId);
      if (!message) return;

      const currentReactions = (message.reactions || {}) as Record<string, string[]>;
      const userList = currentReactions[emoji] || [];
      const hasReacted = userList.includes(currentUser.id);
      const newUserList = hasReacted ? userList.filter(id => id !== currentUser.id) : [...userList, currentUser.id];
      const newReactions = { ...currentReactions };
      if (newUserList.length > 0) newReactions[emoji] = newUserList;
      else delete newReactions[emoji];

      // Update in Firestore - real-time listener will sync
      await updateChatMessage(messageId, { reactions: newReactions });
      setReactionMenuMessageId(null);
    } catch (error) {
      logger.error('Error updating reaction', error);
    }
  };

  // Action Handlers
  const togglePin = () => {
    setPinnedChats(prev => prev.includes(activeChatId) ? prev.filter(id => id !== activeChatId) : [...prev, activeChatId]);
    setShowMenu(false);
  };

  const toggleMute = () => {
    setMutedChats(prev => prev.includes(activeChatId) ? prev.filter(id => id !== activeChatId) : [...prev, activeChatId]);
    setActiveModal(null);
  };

  const clearHistory = () => {
    setMessages(prev => ({ ...prev, [activeChatId]: [] }));
    setActiveModal(null);
  };

  const blockUser = () => {
    if (chatPartner) setBlockedUsers(prev => [...prev, chatPartner.id]);
    setActiveModal(null);
  };

  const reportUser = (reason: string, desc: string) => {
    logger.info('User reported', { reason, description: desc });
    setActiveModal(null);
  };

  const shareContact = (userId: string) => {
    const userToShare = users.find(u => u.id === userId);
    if (userToShare) {
      handleSend(`CONTACT CARD: ${userToShare.name} (${userToShare.email})`);
    }
    setActiveModal(null);
  };

  const toggleMeetingParticipant = (userId: string) => {
    setMeetingParticipants(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleScheduleMeeting = async () => {
    if (!meetingTitle || !meetingDate || !organizationId) return;

    try {
      // Determine default participants based on chat type
      let participants = [...meetingParticipants];
      if (!isGroup && activeChat && 'id' in activeChat) {
        // For DM, include the chat partner if not already included
        if (!participants.includes(activeChat.id)) {
          participants.push(activeChat.id);
        }
      } else if (isGroup && 'members' in activeChat!) {
        // For group chat, include all group members if none selected
        if (participants.length === 0) {
          participants = activeChat.members as string[];
        }
      }

      // Create calendar event
      const eventId = await createCalendarEvent({
        organizationId,
        title: meetingTitle,
        date: meetingDate,
        startTime: meetingTime,
        duration: meetingDuration,
        type: 'Virtual',
        participants,
        mentorId: currentUser.role === Role.MENTOR ? currentUser.id : undefined,
        menteeId: currentUser.role === Role.MENTEE ? currentUser.id : undefined,
      });

      // Sync to all connected calendars (Google, Outlook, Apple)
      try {
        const { createEventInAllCalendars } = await import('../services/unifiedCalendarService');
        const { createMeetLink } = await import('../services/meetApi');
        const { updateCalendarEvent } = await import('../services/database');

        // Generate Meet link for virtual meeting
        let meetLink: string | undefined;
        try {
          const meetResponse = await createMeetLink(meetingTitle, undefined, undefined);
          meetLink = meetResponse.meetLink;
        } catch (error) {
          console.error('Failed to create Meet link:', error);
        }

        // Create event in all connected calendars
        const calendarEventIds = await createEventInAllCalendars(
          {
            id: eventId,
            organizationId,
            title: meetingTitle,
            date: meetingDate,
            startTime: meetingTime,
            duration: meetingDuration,
            type: 'Virtual',
            participants,
            mentorId: currentUser.role === Role.MENTOR ? currentUser.id : undefined,
            menteeId: currentUser.role === Role.MENTEE ? currentUser.id : undefined,
            createdAt: new Date().toISOString(),
          } as CalendarEvent,
          currentUser.id,
          meetLink
        );

        // Update Firestore event with calendar IDs and sync status
        const updates: Partial<CalendarEvent> = {
          googleMeetLink: meetLink,
        };

        if (calendarEventIds.google) {
          updates.googleCalendarEventId = calendarEventIds.google;
          updates.syncedToGoogle = true;
        }
        if (calendarEventIds.outlook) {
          updates.outlookCalendarEventId = calendarEventIds.outlook;
          updates.syncedToOutlook = true;
        }
        if (calendarEventIds.apple) {
          updates.appleCalendarEventId = calendarEventIds.apple;
          updates.syncedToApple = true;
        }

        await updateCalendarEvent(eventId, updates);
      } catch (syncError) {
        console.error('Failed to sync to calendars:', syncError);
        // Don't fail the event creation if sync fails
      }

      // Create notifications for all participants except the creator (non-blocking)
      participants.forEach(participantId => {
        if (participantId !== currentUser.id) {
          const participant = users.find(u => u.id === participantId);
          createNotification({
            organizationId,
            userId: participantId,
            type: 'meeting',
            title: 'New Meeting Scheduled',
            body: `${currentUser.name} scheduled "${meetingTitle}" on ${new Date(meetingDate).toLocaleDateString()} at ${meetingTime}`,
            isRead: false,
            timestamp: new Date().toISOString(),
          }).catch(err => console.error('Error creating meeting notification:', err));
        }
      });

      // Send chat message notification
      const participantNames = participants
        .map(id => users.find(u => u.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      handleSend(
        `📅 Meeting Scheduled: ${meetingTitle}\nDate: ${new Date(meetingDate).toLocaleDateString()}\nTime: ${meetingTime}\nParticipants: ${participantNames || 'TBD'}`
      );

      // Reset form and close modal
      setMeetingTitle('');
      setMeetingDate('');
      setMeetingTime('10:00');
      setMeetingDuration('1h');
      setMeetingParticipants([]);
      setActiveModal(null);
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      // TODO: Show error toast
    }
  };

  // UI Components for Modals
  const UserProfileModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-800">
        <div className="text-center">
          <img src={chatPartner?.avatar} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-slate-100 dark:border-slate-800" alt="" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{chatPartner?.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{chatPartner?.title}</p>
          <div className="mt-4 text-left bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Bio</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{chatPartner?.bio}"</p>
            <h4 className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">Skills</h4>
            <div className="flex flex-wrap gap-1">
              {chatPartner?.skills.map(s => <span key={s} className="px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs">{s}</span>)}
            </div>
          </div>
          <button onClick={() => setActiveModal(null)} className="mt-6 w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700">Close</button>
        </div>
      </div>
    </div>
  );

  const BlockUserModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
          <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-center mb-2 text-slate-900 dark:text-white">Block {chatPartner?.name}?</h3>
        <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-6">
          They will not be able to message you or see your profile. This action cannot be easily undone.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setActiveModal(null)} className="flex-1 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={blockUser} className="flex-1 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium">Block User</button>
        </div>
      </div>
    </div>
  );

  const ClearHistoryModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-center mb-2 text-slate-900 dark:text-white">Clear Chat History?</h3>
        <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-6">
          This will remove all messages from your view. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setActiveModal(null)} className="flex-1 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={clearHistory} className="flex-1 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium">Clear History</button>
        </div>
      </div>
    </div>
  );

  const ReportUserModal = () => {
    const [reason, setReason] = useState('Harassment');
    const [desc, setDesc] = useState('');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Report User</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reason</label>
              <select className={INPUT_CLASS} value={reason} onChange={e => setReason(e.target.value)}>
                <option>Harassment</option>
                <option>Spam</option>
                <option>Inappropriate Content</option>
                <option>Safety Concern</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
              <textarea className={INPUT_CLASS} rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Please provide details..." />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={() => reportUser(reason, desc)} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium">Submit Report</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ShareContactModal = () => {
    const [selectedId, setSelectedId] = useState(users.filter(u => u.id !== currentUser.id && u.id !== chatPartner?.id)[0]?.id);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Share Contact</h3>
          <p className="text-sm text-slate-500 mb-4">Select a user to share with {chatPartner?.name}:</p>
          <select className={INPUT_CLASS + " mb-6"} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            {users.filter(u => u.id !== currentUser.id && u.id !== chatPartner?.id).map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
          <div className="flex gap-3">
            <button onClick={() => setActiveModal(null)} className="flex-1 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
            <button onClick={() => shareContact(selectedId)} className="flex-1 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium">Share</button>
          </div>
        </div>
      </div>
    )
  };

  return (
    <div className="h-[calc(100vh-4rem)] sm:h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex flex-col md:flex-row bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">

      {/* Sidebar List - Mobile: only show when no chat selected */}
      <div className={`w-full md:w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col ${activeChatId ? 'hidden md:flex' : 'flex'} ${activeChatId ? '' : 'absolute md:relative'} inset-0 md:inset-auto z-10 md:z-auto h-full`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-slate-800 dark:text-white text-lg">Messages</h2>
            {/* Quick Filter/Search Toggle could go here */}
          </div>
          <input
            type="text"
            placeholder="Search conversations..."
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            className="w-full text-sm bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {sortedChats.map(item => {
            const lastMsg = messages[item.id]?.[messages[item.id]?.length - 1];
            // @ts-ignore
            const itemIsGroup = item.type === 'group';
            const isPinned = pinnedChats.includes(item.id);
            const isMuted = mutedChats.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => setActiveChatId(item.id)}
                className={`p-4 flex items-center cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-900 ${activeChatId === item.id ? 'bg-white dark:bg-slate-800 border-l-4 border-l-emerald-500 shadow-sm' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="relative mr-3">
                  <img src={item.avatar} alt={item.name} className={`w-12 h-12 rounded-full object-cover ${itemIsGroup ? 'border-2 border-slate-200 dark:border-slate-700' : ''}`} />
                  {!itemIsGroup && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`font-semibold text-sm truncate flex items-center ${activeChatId === item.id ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                      {isPinned && <Pin className="w-3 h-3 mr-1 text-slate-400 rotate-45" />}
                      {item.name}
                      {isMuted && <BellOff className="w-3 h-3 ml-1 text-slate-400" />}
                    </h3>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{formatChatTime(lastMsg?.timestamp)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate pr-2">
                      {itemIsGroup && lastMsg && lastMsg.senderId !== currentUser.id && <span className="text-emerald-600 dark:text-emerald-400 mr-1">{users.find(u => u.id === lastMsg.senderId)?.name.split(' ')[0]}:</span>}
                      {lastMsg?.type === 'image' ? 'Sent an image' : lastMsg?.type === 'file' ? 'Sent a file' : lastMsg?.text}
                    </p>
                    {unreadCounts[item.id] > 0 && (
                      <span className="bg-emerald-500 text-white text-[10px] font-bold h-5 min-w-[1.25rem] px-1 rounded-full flex items-center justify-center">
                        {unreadCounts[item.id]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area - Mobile: only show when chat is selected */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 relative ${!activeChatId ? 'hidden md:flex' : 'flex'} ${!activeChatId ? '' : 'absolute md:relative'} inset-0 md:inset-auto z-20 md:z-auto h-full w-full`}>
        {activeChat ? (
          <>
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shadow-sm z-20 sticky top-0">
              <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                <button
                  onClick={() => {
                    setActiveChatId('');
                    setShowMenu(false);
                    setShowEmojiPicker(false);
                    setShowGifPicker(false);
                  }}
                  className="md:hidden mr-1 sm:mr-2 p-1.5 flex-shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Back to messages"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <AvatarCluster users={isGroup ? groupMembers : [activeChat as any]} chatType={isGroup ? 'group' : 'dm'} max={3} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center text-sm sm:text-base truncate">
                    {activeChat.name}
                    {mutedChats.includes(activeChat.id) && <BellOff className="w-3.5 h-3.5 ml-2 text-slate-400 flex-shrink-0" />}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {isGroup ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:underline" onClick={() => setActiveModal('groupInfo')}>
                        {groupMembers.length} participants
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1"></span>Online</span>
                    )}

                    {/* User Mood for DMs, Sentiment for Groups */}
                    <div className="relative hidden sm:block">
                      {!isGroup && chatPartner ? (
                        // Show chat partner's actual mood for DMs
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ml-2 ${getMoodDisplay(chatPartner.mood).color}`}>
                          <span>{getMoodDisplay(chatPartner.mood).emoji}</span>
                          <span>{getMoodDisplay(chatPartner.mood).label}</span>
                        </div>
                      ) : (
                        // Show sentiment indicator for groups
                        <>
                          <button
                            onClick={() => setShowSentimentMenu(!showSentimentMenu)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ml-2 transition-colors ${sentiment === 'Positive' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' :
                              sentiment === 'Negative' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' :
                                'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                              }`}>
                            {sentiment === 'Positive' && <Smile className="w-3 h-3" />}
                            {sentiment === 'Negative' && <Frown className="w-3 h-3" />}
                            {sentiment === 'Neutral' && <Meh className="w-3 h-3" />}
                            <span>{sentiment} Vibe</span>
                            <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
                          </button>

                          {showSentimentMenu && (
                            <div className="absolute top-full left-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                              {['Positive', 'Neutral', 'Negative'].map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => handleManualSentimentChange(opt as any)}
                                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${sentiment === opt ? 'bg-slate-50 dark:bg-slate-700 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}
                                >
                                  {opt === 'Positive' && <Smile className="w-3 h-3 text-emerald-500" />}
                                  {opt === 'Neutral' && <Meh className="w-3 h-3 text-slate-500" />}
                                  {opt === 'Negative' && <Frown className="w-3 h-3 text-red-500" />}
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 relative flex-shrink-0">
                <button onClick={() => setActiveModal('video')} disabled={isBlocked} className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30" title="Video Call">
                  <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button onClick={() => setActiveModal('phone')} disabled={isBlocked} className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30" title="Phone Call">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button onClick={() => setShowMenu(!showMenu)} className={`p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400 ${showMenu ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white' : ''}`}>
                  <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {showMenu && (
                  <div className="absolute top-12 right-0 w-56 sm:w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 origin-top-right max-h-[80vh] overflow-y-auto">
                    {isGroup ? (
                      <>
                        <button onClick={() => { setActiveModal('groupInfo'); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"><Users className="w-4 h-4 mr-2" /> Group Info</button>
                        <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"><Edit className="w-4 h-4 mr-2" /> Edit Group Name</button>
                        <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"><UserPlus className="w-4 h-4 mr-2" /> Add Participants</button>
                        <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                        <button onClick={() => { setActiveModal('schedule'); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"><Calendar className="w-4 h-4 mr-2" /> Schedule Meeting</button>
                        <button onClick={() => { setActiveModal('mute'); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"><BellOff className="w-4 h-4 mr-2" /> {mutedChats.includes(activeChatId) ? 'Unmute' : 'Mute'} Notifications</button>
                        <button onClick={() => { clearHistory(); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"><Trash className="w-4 h-4 mr-2" /> Clear History</button>
                        <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                        <button className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"><LogOut className="w-4 h-4 mr-2" /> Leave Group</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setActiveModal('userProfile'); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"><Users className="w-4 h-4 mr-2" /> View Profile</button>
                        <button onClick={togglePin} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"><Pin className="w-4 h-4 mr-2" /> {pinnedChats.includes(activeChatId) ? 'Unpin' : 'Pin'} Conversation</button>
                        <button onClick={() => { setActiveModal('schedule'); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"><Calendar className="w-4 h-4 mr-2" /> Schedule Meeting</button>
                        <button onClick={() => { setActiveModal('shareContact'); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"><Share2 className="w-4 h-4 mr-2" /> Share Contact</button>
                        <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                        <button onClick={toggleMute} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"><BellOff className="w-4 h-4 mr-2" /> {mutedChats.includes(activeChatId) ? 'Unmute' : 'Mute'} Notifications</button>
                        <button onClick={() => { setActiveModal('clearHistory'); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"><Trash className="w-4 h-4 mr-2" /> Clear History</button>
                        <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                        <button onClick={() => { setActiveModal('block'); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"><Ban className="w-4 h-4 mr-2" /> Block User</button>
                        <button onClick={() => { setActiveModal('report'); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"><Flag className="w-4 h-4 mr-2" /> Report</button>
                        <button onClick={() => { handleSend(`👋 ${currentUser.name.split(' ')[0]} nudged you!`); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"><Activity className="w-4 h-4 mr-2" /> Send Nudge</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4 bg-slate-50/50 dark:bg-slate-950/50 min-h-0" onClick={() => setShowMenu(false)}>
              {isBlocked && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg text-center mb-4">
                  <p className="text-red-700 dark:text-red-300 font-medium flex items-center justify-center">
                    <Ban className="w-4 h-4 mr-2" /> You have blocked this user.
                  </p>
                  <button onClick={() => setBlockedUsers(prev => prev.filter(id => id !== chatPartner?.id))} className="text-xs text-red-600 underline mt-1">Unblock</button>
                </div>
              )}
              {currentChatMessages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                const sender = users.find(u => u.id === msg.senderId);
                // Format timestamp for display
                const displayTime = msg.timestamp
                  ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Now';
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-4 items-end`}>
                    {isMe && (
                      <div className="relative opacity-0 group-hover:opacity-100 transition-opacity mr-2 mb-2">
                        <button onClick={() => setReactionMenuMessageId(reactionMenuMessageId === msg.id ? null : msg.id)} className="p-1.5 text-slate-400 hover:text-emerald-500 bg-slate-50 dark:bg-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><SmilePlus className="w-4 h-4" /></button>
                        {reactionMenuMessageId === msg.id && (
                          <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-slate-800 shadow-xl rounded-full border border-slate-200 dark:border-slate-700 p-1 flex gap-1 z-10 animate-in zoom-in-95">
                            {['👍', '❤️', '🎉', '💡', '😂', '👀'].map(emoji => (
                              <button key={emoji} onClick={() => handleToggleReaction(msg.id, emoji)} className="hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-full text-lg leading-none transition-transform hover:scale-110">{emoji}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {!isMe && <img src={sender?.avatar || 'https://via.placeholder.com/40'} className="w-8 h-8 rounded-full mr-2 self-end mb-1" alt="" />}
                    <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      {isGroup && !isMe && <span className="text-[10px] text-slate-400 ml-1 mb-1">{sender?.name}</span>}
                      <div className={`px-3 sm:px-4 py-2 rounded-2xl shadow-sm text-xs sm:text-sm ${isMe
                        ? 'bg-emerald-600 text-white rounded-tr-none border border-emerald-600'
                        : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                        }`}>
                        {msg.type === 'text' && <p>{msg.text}</p>}
                        {msg.type === 'image' && <div className="rounded-lg overflow-hidden mt-1 mb-1"><img src={msg.fileUrl} alt="attachment" className="max-w-full h-auto max-h-48 object-cover" /></div>}
                        {msg.type === 'file' && <div className="flex items-center space-x-2 bg-black/10 dark:bg-white/10 p-2 rounded-lg"><FileText className="w-5 h-5" /><span className="underline truncate max-w-[150px]">{msg.fileName}</span><Download className="w-4 h-4 opacity-70 cursor-pointer" /></div>}
                      </div>
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(msg.reactions).map(([emoji, users]) => {
                            const userIds = users as string[];
                            return (
                              <button key={emoji} onClick={() => handleToggleReaction(msg.id, emoji)} className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${userIds.includes(currentUser.id) ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}><span>{emoji}</span><span className="font-semibold">{userIds.length}</span></button>
                            )
                          })}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity px-1">{displayTime}</span>
                    </div>
                    {!isMe && (
                      <div className="relative opacity-0 group-hover:opacity-100 transition-opacity ml-2 mb-2">
                        <button onClick={() => setReactionMenuMessageId(reactionMenuMessageId === msg.id ? null : msg.id)} className="p-1.5 text-slate-400 hover:text-emerald-500 bg-slate-50 dark:bg-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><SmilePlus className="w-4 h-4" /></button>
                        {reactionMenuMessageId === msg.id && (
                          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-800 shadow-xl rounded-full border border-slate-200 dark:border-slate-700 p-1 flex gap-1 z-10 animate-in zoom-in-95">
                            {['👍', '❤️', '🎉', '💡', '😂', '👀'].map(emoji => (
                              <button key={emoji} onClick={() => handleToggleReaction(msg.id, emoji)} className="hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-full text-lg leading-none transition-transform hover:scale-110">{emoji}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {isTyping && (
                <div className="flex justify-start mb-4 animate-in fade-in slide-in-from-bottom-2">
                  <img src={activeChat.avatar} className="w-8 h-8 rounded-full mr-2 self-end mb-1 object-cover" alt="" />
                  <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            {!isBlocked ? (
              <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 relative">
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 sm:left-4 mb-2 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 w-full sm:w-[400px] h-64 sm:h-96 overflow-y-auto grid grid-cols-8 gap-2 z-20">
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => { setInputText(prev => prev + e); setShowEmojiPicker(false); }} className="text-2xl hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-2 transition-colors flex items-center justify-center">{e}</button>
                    ))}
                  </div>
                )}
                {showGifPicker && (
                  <div className="absolute bottom-full left-0 sm:left-16 mb-2 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 w-full sm:w-[600px] h-[400px] sm:h-[500px] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 z-20">
                    {MOCK_GIFS.map((url, i) => (
                      <button key={i} onClick={async () => {
                        if (!activeChatId || !organizationId) return;
                        const isGroup = MOCK_GROUPS.some(g => g.id === activeChatId);
                        const chatType: 'dm' | 'group' = isGroup ? 'group' : 'dm';

                        try {
                          await createChatMessage({
                            organizationId,
                            chatId: activeChatId,
                            chatType,
                            senderId: currentUser.id,
                            text: 'GIF',
                            type: 'image',
                            fileUrl: url,
                            timestamp: new Date().toISOString(),
                            isRead: false,
                            readBy: [currentUser.id],
                          });
                          setShowGifPicker(false);
                        } catch (error) {
                          console.error('Error sending GIF:', error);
                        }
                      }} className="hover:opacity-80 transition-opacity hover:scale-105 transform duration-150">
                        <img src={url} className="w-full h-32 object-cover rounded-lg shadow-sm" alt="GIF" />
                      </button>
                    ))}
                  </div>
                )}
                {attachment && (
                  <div className="absolute bottom-full left-0 w-full bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-2 flex items-center px-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-full px-3 py-1 text-xs flex items-center dark:text-slate-200">
                      <span className="font-medium mr-2">{attachment.name}</span>
                      <button onClick={() => setAttachment(null)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="flex gap-0.5 sm:gap-1 text-slate-400">
                    <button onClick={() => fileInputRef.current?.click()} className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Attach File"><Paperclip className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    <button onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }} className={`p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors ${showGifPicker ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : ''}`} title="Send GIF"><ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                    <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }} className={`p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors ${showEmojiPicker ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : ''}`} title="Insert Emoji"><Smile className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                  </div>
                  <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:border-emerald-500 dark:text-white transition-all placeholder-slate-400" />
                  <button onClick={() => handleSend()} disabled={!inputText.trim() && !attachment} className="p-2 sm:p-2.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-95 flex-shrink-0"><Send className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center text-slate-500 text-sm">
                Messaging unavailable.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm sm:text-base">Select a conversation to start chatting</p>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {activeModal === 'video' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Start Video Call?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Start an instant meeting or schedule one for later.</p>
            <div className="space-y-3">
              <button onClick={() => { handleSend("🎥 Video call started: https://meet.google.com/abc-defg-hij"); setActiveModal(null); window.open("https://meet.google.com/new", "_blank"); }} className="w-full bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 flex items-center justify-center"><Video className="w-4 h-4 mr-2" /> Start Now</button>
              <button onClick={() => setActiveModal('schedule')} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"><Calendar className="w-4 h-4 mr-2" /> Schedule for Later</button>
              <button onClick={() => setActiveModal(null)} className="w-full text-sm text-slate-500 mt-2 hover:underline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'phone' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-800">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"><Phone className="w-8 h-8 text-emerald-600 dark:text-emerald-400" /></div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Calling...</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{activeChat?.name}</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setActiveModal(null)} className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600">End Call</button>
              <button className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"><Mic className="w-4 h-4 mr-2" /> Mute</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'groupInfo' && (
        <div className="fixed md:absolute inset-0 md:inset-y-0 md:right-0 md:w-80 w-full bg-white dark:bg-slate-900 shadow-xl border-l border-slate-200 dark:border-slate-800 z-30 animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
            <h3 className="font-bold text-slate-800 dark:text-white">Group Info</h3>
            <button onClick={() => setActiveModal(null)}><X className="w-5 h-5 text-slate-500 hover:text-slate-800" /></button>
          </div>
          <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800">
            <img src={activeChat?.avatar} className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-4 border-slate-50 dark:border-slate-800" alt="" />
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">{activeChat?.name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Created Nov 1, 2024</p>
          </div>
          <div className="p-4 overflow-y-auto max-h-[60%]">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Participants ({groupMembers.length})</h4>
            <div className="space-y-3">
              {groupMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center"><img src={m.avatar} className="w-8 h-8 rounded-full mr-2 object-cover" alt="" /><span className="text-sm text-slate-700 dark:text-slate-200">{m.name}</span></div>
                  <button className="text-xs text-slate-400 hover:text-emerald-600">Message</button>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center"><Plus className="w-4 h-4 mr-2" /> Add Participant</button>
          </div>
        </div>
      )}

      {activeModal === 'schedule' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Schedule Meeting</h3>
              <button onClick={() => { setActiveModal(null); setShowMeetingParticipantDropdown(false); }}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Title</label>
                <input
                  type="text"
                  value={meetingTitle || `Meeting with ${activeChat?.name}`}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Time</label>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Duration</label>
                <select
                  value={meetingDuration}
                  onChange={(e) => setMeetingDuration(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option>30 min</option>
                  <option>1h</option>
                  <option>1.5h</option>
                  <option>2h</option>
                </select>
              </div>

              {/* Participants Multi-Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Additional Participants {isGroup && "(All group members by default)"}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMeetingParticipantDropdown(!showMeetingParticipantDropdown)}
                    className={`${INPUT_CLASS} w-full text-left flex items-center justify-between`}
                  >
                    <span className="text-sm">
                      {meetingParticipants.length === 0
                        ? 'Select participants...'
                        : `${meetingParticipants.length} participant${meetingParticipants.length > 1 ? 's' : ''} selected`
                      }
                    </span>
                    <UserPlus className="w-4 h-4 text-slate-400" />
                  </button>

                  {showMeetingParticipantDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {users.filter(u => u.id !== currentUser.id).length === 0 ? (
                        <div className="p-3 text-sm text-slate-500 text-center">No other users available</div>
                      ) : (
                        users.filter(u => u.id !== currentUser.id).map(user => (
                          <label
                            key={user.id}
                            className="flex items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                          >
                            <input
                              type="checkbox"
                              checked={meetingParticipants.includes(user.id)}
                              onChange={() => toggleMeetingParticipant(user.id)}
                              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                            />
                            <div className="ml-3 flex items-center flex-1">
                              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full mr-2" />
                              <div>
                                <div className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{user.role}</div>
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Selected participants badges */}
                {meetingParticipants.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {meetingParticipants.map(userId => {
                      const user = users.find(u => u.id === userId);
                      return user ? (
                        <span
                          key={userId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs"
                        >
                          <img src={user.avatar} alt={user.name} className="w-4 h-4 rounded-full" />
                          {user.name.split(' ')[0]}
                          <button
                            type="button"
                            onClick={() => toggleMeetingParticipant(userId)}
                            className="ml-1 hover:text-emerald-900 dark:hover:text-emerald-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={handleScheduleMeeting}
                disabled={!meetingTitle || !meetingDate}
                className={BUTTON_PRIMARY + " w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"}
              >
                Schedule & Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'mute' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Mute Notifications</h3>
            <div className="space-y-2">
              {['15 Minutes', '1 Hour', '8 Hours', '24 Hours', 'Until I turn it back on'].map(opt => (
                <button key={opt} onClick={toggleMute} className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">{opt}</button>
              ))}
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full mt-4 text-sm text-slate-500 hover:underline">Cancel</button>
          </div>
        </div>
      )}

      {/* New Modals for Chat Actions */}
      {activeModal === 'userProfile' && <UserProfileModal />}
      {activeModal === 'block' && <BlockUserModal />}
      {activeModal === 'report' && <ReportUserModal />}
      {activeModal === 'shareContact' && <ShareContactModal />}
      {activeModal === 'clearHistory' && <ClearHistoryModal />}

    </div>
  )
}

export default Chat;