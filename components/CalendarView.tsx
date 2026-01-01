import React, { useState, useEffect } from "react";
import { CalendarEvent, User, Match, MatchStatus } from "../types";
import { INPUT_CLASS, BUTTON_PRIMARY } from "../styles/common";
import {
  Settings,
  Plus,
  X,
  CheckCircle,
  UserPlus,
  RefreshCw,
  Calendar as CalendarIcon,
  ExternalLink,
  Edit,
} from "lucide-react";
import {
  getCalendarCredentials,
  syncFromGoogleCalendar,
} from "../services/calendarService";
import { syncFromAllCalendars } from "../services/unifiedCalendarService";
import { createMeetLink } from "../services/meetApi";
import { createCalendarEvent, updateCalendarEvent } from "../services/database";
import {
  openCalendarEvent,
  generateGoogleCalendarLink,
  generateOutlookCalendarLink,
  generateAppleCalendarICS,
} from "../services/calendarDeepLinks";
import { getErrorMessage } from "../utils/errors";

interface CalendarViewProps {
  events: CalendarEvent[];
  currentUser: User;
  onAddEvent: (e: Omit<CalendarEvent, "id" | "createdAt">) => void;
  onUpdateEvent?: (eventId: string, updates: Partial<CalendarEvent>) => void;
  onNavigate: (page: string, tab?: string) => void;
  users: User[];
  matches: Match[];
}

const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  currentUser,
  onAddEvent,
  onUpdateEvent,
  onNavigate,
  users,
  matches,
}) => {
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    time: "10:00",
    duration: "1h",
    type: "Virtual",
    participants: [] as string[],
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [showParticipantDropdown, setShowParticipantDropdown] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  useEffect(() => {
    // Check if any calendar is connected
    const googleConnected = !!getCalendarCredentials(currentUser.id);
    // Add checks for Outlook and Apple when their services are imported
    setCalendarConnected(googleConnected);
  }, [currentUser.id]);

  const handleSaveEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      // Validation - could show error toast here
      return;
    }

    // Ensure creator is always included in participants array
    const participants = [...newEvent.participants];
    if (!participants.includes(currentUser.id)) {
      participants.push(currentUser.id);
    }

    const event: Omit<CalendarEvent, "id" | "createdAt"> = {
      organizationId: currentUser.organizationId,
      title: newEvent.title,
      date: newEvent.date,
      startTime: newEvent.time,
      duration: newEvent.duration,
      type: newEvent.type,
      createdBy: currentUser.id, // Track who created/scheduled the event
      ...(currentUser.role === "MENTOR" && { mentorId: currentUser.id }),
      ...(currentUser.role === "MENTEE" && { menteeId: currentUser.id }),
      participants, // Always include participants array with creator
    };

    // Create event in Firestore first
    onAddEvent(event);

    // Sync to all connected calendars will be handled in App.tsx

    setIsAddEventOpen(false);
    setNewEvent({
      title: "",
      date: "",
      time: "10:00",
      duration: "1h",
      type: "Virtual",
      participants: [],
    });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSyncCalendar = async () => {
    if (!calendarConnected) {
      onNavigate("settings", "calendar");
      return;
    }

    try {
      setSyncing(true);

      // Sync events from all connected calendars
      const syncedEvents = await syncFromAllCalendars(
        currentUser.id,
        currentUser.organizationId
      );

      // Add synced events to Firestore (avoid duplicates)
      // Track events processed in this sync batch to prevent duplicates within the batch
      const processedEvents = new Set<string>();
      
      for (const syncedEvent of syncedEvents) {
        // Create a unique key for duplicate detection
        const eventKey = `${syncedEvent.title}|${syncedEvent.date}|${syncedEvent.startTime}`;
        
        // Check if event already exists in previously loaded events
        const existsInLoaded = events.some(
          (e) =>
            e.title === syncedEvent.title &&
            e.date === syncedEvent.date &&
            e.startTime === syncedEvent.startTime
        );
        
        // Check if event was already processed in this sync batch
        const existsInBatch = processedEvents.has(eventKey);

        if (!existsInLoaded && !existsInBatch) {
          await createCalendarEvent(syncedEvent);
          processedEvents.add(eventKey);
        }
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: unknown) {
      console.error("Error syncing calendar:", error);
      alert(getErrorMessage(error) || "Failed to sync calendar");
    } finally {
      setSyncing(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setNewEvent((prev) => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter((id) => id !== userId)
        : [...prev.participants, userId],
    }));
  };

  // Filter events to only show those where current user is creator or participant
  const visibleEvents = events.filter((ev) => {
    // User is the creator (createdBy, mentorId, or menteeId matches)
    if (ev.createdBy === currentUser.id || ev.mentorId === currentUser.id || ev.menteeId === currentUser.id) {
      return true;
    }
    // User is in participants list
    if (ev.participants && ev.participants.includes(currentUser.id)) {
      return true;
    }
    // If event has mentorId and menteeId, show to both mentor and mentee
    if (ev.mentorId && ev.menteeId) {
      if (ev.mentorId === currentUser.id || ev.menteeId === currentUser.id) {
        return true;
      }
    }
    return false;
  });

  // Get matched users based on role
  const getMatchedUsers = (): User[] => {
    if (currentUser.role === "MENTEE") {
      // For mentees: show only their matched mentor(s)
      const activeMatches = matches.filter(
        (m) => m.menteeId === currentUser.id && m.status === MatchStatus.ACTIVE
      );
      const mentorIds = activeMatches.map((m) => m.mentorId);
      return users.filter((u) => mentorIds.includes(u.id));
    } else if (currentUser.role === "MENTOR") {
      // For mentors: show only their matched mentees
      const activeMatches = matches.filter(
        (m) => m.mentorId === currentUser.id && m.status === MatchStatus.ACTIVE
      );
      const menteeIds = activeMatches.map((m) => m.menteeId);
      return users.filter((u) => menteeIds.includes(u.id));
    }
    // For admins: show all users (no restriction)
    return users.filter((u) => u.id !== currentUser.id);
  };

  const availableParticipants = getMatchedUsers();

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      date: event.date,
      time: event.startTime,
      duration: event.duration,
      type: event.type,
      participants: event.participants || [],
    });
    setIsAddEventOpen(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !onUpdateEvent) return;
    if (!newEvent.title || !newEvent.date) {
      return;
    }

    const updates: Partial<CalendarEvent> = {
      title: newEvent.title,
      date: newEvent.date,
      startTime: newEvent.time,
      duration: newEvent.duration,
      type: newEvent.type,
      participants: newEvent.participants.length > 0 ? newEvent.participants : undefined,
    };

    try {
      await onUpdateEvent(editingEvent.id, updates);
      
      // Only reset state after successful update
      setIsAddEventOpen(false);
      setEditingEvent(null);
      setNewEvent({
        title: "",
        date: "",
        time: "10:00",
        duration: "1h",
        type: "Virtual",
        participants: [],
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      // Error handling is done in onUpdateEvent (toast shown there)
      // Don't reset state on error so user can retry
      console.error("Error updating event:", error);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 sm:space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Calendar
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Manage your mentorship sessions and events.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {calendarConnected ? (
            <button
              onClick={handleSyncCalendar}
              disabled={syncing}
              aria-label={syncing ? "Syncing calendar" : "Sync calendar"}
              className="flex items-center justify-center px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span className="sr-only sm:not-sr-only">{syncing ? "Syncing..." : "Sync Now"}</span>
              {syncing && <span className="sm:hidden">Syncing...</span>}
            </button>
          ) : (
            <button
              onClick={() => onNavigate("settings", "calendar")}
              aria-label="Connect calendar"
              className="flex items-center justify-center px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <Settings className="w-4 h-4 mr-2" aria-hidden="true" /> 
              <span className="hidden sm:inline">Connect Calendar</span>
              <span className="sm:hidden">Connect</span>
            </button>
          )}
          <button
            onClick={() => setIsAddEventOpen(true)}
            aria-label="Add new event"
            className={`${BUTTON_PRIMARY} min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500`}
          >
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> 
            <span className="hidden sm:inline">Add Event</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Month Navigation */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
            aria-label="Previous month"
            className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <span aria-hidden="true">←</span>
            <span className="sr-only">Previous month</span>
          </button>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {new Date(currentYear, currentMonth).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button
            onClick={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
            aria-label="Next month"
            className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <span aria-hidden="true">→</span>
            <span className="sr-only">Next month</span>
          </button>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center py-2 bg-slate-50 dark:bg-slate-950" role="row">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-xs font-bold text-slate-500 uppercase" role="columnheader">
              <span className="sr-only">{d}day</span>
              <span aria-hidden="true">{d}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 touch-action-pan-y overflow-y-auto">
          {(() => {
            // Calculate calendar days for current month
            const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
            const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
            const daysInMonth = lastDayOfMonth.getDate();
            const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 6 = Saturday

            // Calculate previous month's days to show
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            const daysInPrevMonth = new Date(
              prevYear,
              prevMonth + 1,
              0
            ).getDate();

            // Generate 35 days (5 weeks)
            const calendarDays: Array<{
              day: number;
              isCurrentMonth: boolean;
              date: Date;
            }> = [];

            // Add previous month's trailing days
            for (let i = startingDayOfWeek - 1; i >= 0; i--) {
              calendarDays.push({
                day: daysInPrevMonth - i,
                isCurrentMonth: false,
                date: new Date(prevYear, prevMonth, daysInPrevMonth - i),
              });
            }

            // Add current month's days
            for (let day = 1; day <= daysInMonth; day++) {
              calendarDays.push({
                day,
                isCurrentMonth: true,
                date: new Date(currentYear, currentMonth, day),
              });
            }

            // Add next month's leading days to fill 35 slots
            const remainingDays = 35 - calendarDays.length;
            for (let day = 1; day <= remainingDays; day++) {
              const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
              const nextYear =
                currentMonth === 11 ? currentYear + 1 : currentYear;
              calendarDays.push({
                day,
                isCurrentMonth: false,
                date: new Date(nextYear, nextMonth, day),
              });
            }

            return calendarDays.map((calendarDay, i) => {
              const today = new Date();
              const isToday =
                calendarDay.isCurrentMonth &&
                calendarDay.date.getDate() === today.getDate() &&
                calendarDay.date.getMonth() === today.getMonth() &&
                calendarDay.date.getFullYear() === today.getFullYear();

              // Filter events for this specific date (using visibleEvents)
              const dayEvents = visibleEvents.filter((e) => {
                // Parse date string (YYYY-MM-DD) as local date to avoid timezone issues
                // When parsing "2025-12-26", new Date() treats it as UTC midnight,
                // which causes .getDate() to return wrong day for timezones west of UTC
                const dateParts = e.date.split("-");
                const eDate =
                  dateParts.length === 3
                    ? new Date(
                        parseInt(dateParts[0]),
                        parseInt(dateParts[1]) - 1,
                        parseInt(dateParts[2])
                      )
                    : new Date(e.date);
                return (
                  eDate.getDate() === calendarDay.date.getDate() &&
                  eDate.getMonth() === calendarDay.date.getMonth() &&
                  eDate.getFullYear() === calendarDay.date.getFullYear()
                );
              });

              return (
                <div
                  key={i}
                  role="gridcell"
                  aria-label={`${calendarDay.isCurrentMonth ? "" : "Previous month, "}${new Date(currentYear, currentMonth, calendarDay.day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`}
                  className={`border-r border-b border-slate-100 dark:border-slate-800 p-1.5 sm:p-2 min-h-[80px] sm:min-h-[100px] relative ${
                    i % 7 === 6 ? "border-r-0" : ""
                  } ${
                    !calendarDay.isCurrentMonth
                      ? "bg-slate-50/50 dark:bg-slate-950/50"
                      : ""
                  }`}
                >
                  <span
                    className={`text-xs sm:text-sm font-medium block mb-1 sm:mb-2 ${
                      isToday
                        ? "bg-emerald-600 text-white w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center"
                        : calendarDay.isCurrentMonth
                        ? "text-slate-700 dark:text-slate-300"
                        : "text-slate-400 dark:text-slate-600"
                    }`}
                    aria-label={isToday ? "Today" : undefined}
                  >
                    {calendarDay.day}
                  </span>
                  <div className="space-y-0.5 sm:space-y-1">
                    {dayEvents.map((ev) => {
                      // Get participant names
                      const participantNames = ev.participants
                        ? ev.participants
                            .slice(0, 2)
                            .map((id) => {
                              const user = users.find((u) => u.id === id);
                              return user ? user.name.split(" ")[0] : "";
                            })
                            .filter(Boolean)
                            .join(", ")
                        : "";
                      const extraCount =
                        ev.participants && ev.participants.length > 2
                          ? ev.participants.length - 2
                          : 0;

                      // Check if current user can edit this event (only creator can edit)
                      // Both mentor and mentee can view, but only the person who scheduled can edit
                      const canEdit = ev.createdBy === currentUser.id || (!ev.createdBy && (ev.mentorId === currentUser.id || ev.menteeId === currentUser.id));
                      const isHovered = hoveredEventId === ev.id;

                      return (
                        <button
                          key={ev.id}
                          type="button"
                          aria-label={`${ev.title} at ${ev.startTime}${participantNames ? ` with ${participantNames}${extraCount > 0 ? ` and ${extraCount} more` : ""}` : ""}${canEdit ? ". Click to edit" : ""}`}
                          className="text-[10px] sm:text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 px-1.5 py-1 rounded truncate border border-indigo-200 dark:border-indigo-800 group relative cursor-pointer hover:z-10 w-full text-left min-h-[32px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          onMouseEnter={() => setHoveredEventId(ev.id)}
                          onMouseLeave={() => setHoveredEventId(null)}
                          onClick={(e) => {
                            // If user can edit, clicking the event opens edit modal
                            if (canEdit && onUpdateEvent) {
                              e.stopPropagation();
                              handleEditEvent(ev);
                            }
                          }}
                        >
                          <div className="truncate font-medium">
                            {ev.startTime} {ev.title}
                          </div>
                          {participantNames && (
                            <div className="text-[9px] sm:text-[10px] text-indigo-600 dark:text-indigo-300 truncate">
                              {participantNames}
                              {extraCount > 0 ? ` +${extraCount}` : ""}
                            </div>
                          )}

                          {/* Tooltip on hover with calendar links and edit button */}
                          <div 
                            role="tooltip"
                            className={`${isHovered ? 'block' : 'hidden'} absolute left-0 top-full mt-1 bg-slate-900 text-white text-[10px] sm:text-xs rounded px-2 py-1.5 z-20 whitespace-nowrap shadow-lg min-w-[200px] sm:min-w-[250px]`}
                            onMouseEnter={() => setHoveredEventId(ev.id)}
                            onMouseLeave={() => setHoveredEventId(null)}
                          >
                            {ev.participants && ev.participants.length > 0 && (
                              <div className="mb-2 pb-2 border-b border-slate-700">
                                <strong>Participants:</strong>{" "}
                                {ev.participants
                                  .map((id) => {
                                    const user = users.find((u) => u.id === id);
                                    return user ? user.name : "";
                                  })
                                  .filter(Boolean)
                                  .join(", ")}
                              </div>
                            )}
                            <div className="space-y-1">
                              <div className="text-[9px] sm:text-[10px] text-slate-400 mb-1">
                                Add to calendar:
                              </div>
                              <a
                                href={generateGoogleCalendarLink(
                                  ev,
                                  ev.googleMeetLink
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Add ${ev.title} to Google Calendar`}
                                className="block hover:bg-slate-800 px-2 py-1.5 rounded text-[9px] sm:text-[10px] min-h-[32px] flex items-center focus:outline-none focus:ring-2 focus:ring-white"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span aria-hidden="true">📅</span> Google Calendar
                              </a>
                              <div
                                role="button"
                                aria-disabled="true"
                                aria-label="Outlook Calendar integration coming soon"
                                className="block px-2 py-1.5 rounded text-[9px] sm:text-[10px] opacity-50 cursor-not-allowed"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span aria-hidden="true">📅</span> Outlook Calendar <span className="text-[8px] text-slate-500">(Coming Soon)</span>
                              </div>
                              <div
                                role="button"
                                aria-disabled="true"
                                aria-label="Apple Calendar integration coming soon"
                                className="block w-full text-left px-2 py-1.5 rounded text-[9px] sm:text-[10px] opacity-50 cursor-not-allowed"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span aria-hidden="true">📅</span> Apple Calendar <span className="text-[8px] text-slate-500">(Coming Soon)</span>
                              </div>
                              {canEdit && onUpdateEvent && (
                                <>
                                  <div className="border-t border-slate-700 my-1"></div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHoveredEventId(null);
                                      handleEditEvent(ev);
                                    }}
                                    aria-label={`Edit event ${ev.title}`}
                                    className="block w-full text-left hover:bg-slate-800 px-2 py-1.5 rounded text-[9px] sm:text-[10px] min-h-[32px] focus:outline-none focus:ring-2 focus:ring-white"
                                  >
                                    <span aria-hidden="true">✏️</span> Edit Event
                                  </button>
                                  <div className="text-[8px] sm:text-[9px] text-slate-400 mt-1 pt-1 border-t border-slate-700">
                                    Or click anywhere on event to edit
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {isAddEventOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAddEventOpen(false);
              setShowParticipantDropdown(false);
              setEditingEvent(null);
            }
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-none sm:rounded-xl shadow-2xl max-w-2xl w-full h-full sm:h-auto border-0 sm:border border-slate-200 dark:border-slate-800 max-h-[100vh] sm:max-h-[90vh] flex flex-col touch-action-pan-y">
            {/* Header - Fixed */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 id="event-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {editingEvent ? "Edit Event" : "Add New Event"}
              </h2>
              <button
                onClick={() => {
                  setIsAddEventOpen(false);
                  setShowParticipantDropdown(false);
                  setEditingEvent(null);
                  setNewEvent({
                    title: "",
                    date: "",
                    time: "10:00",
                    duration: "1h",
                    type: "Virtual",
                    participants: [],
                  });
                }}
                aria-label="Close event modal"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 touch-action-pan-y">
              <div className="space-y-4">
                <div>
                  <label htmlFor="event-title" className="block text-xs font-medium text-slate-500 uppercase mb-1">
                    Event Title
                  </label>
                  <input
                    id="event-title"
                    type="text"
                    required
                    aria-required="true"
                    className={INPUT_CLASS}
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                    placeholder="e.g. Weekly Check-in"
                    aria-describedby="event-title-description"
                  />
                  <span id="event-title-description" className="sr-only">Enter a descriptive title for your event</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="event-date" className="block text-xs font-medium text-slate-500 uppercase mb-1">
                      Date
                    </label>
                    <input
                      id="event-date"
                      type="date"
                      required
                      aria-required="true"
                      className={INPUT_CLASS}
                      value={newEvent.date}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, date: e.target.value })
                      }
                      aria-describedby="event-date-description"
                    />
                    <span id="event-date-description" className="sr-only">Select the date for your event</span>
                  </div>
                  <div>
                    <label htmlFor="event-time" className="block text-xs font-medium text-slate-500 uppercase mb-1">
                      Time
                    </label>
                    <input
                      id="event-time"
                      type="time"
                      required
                      aria-required="true"
                      className={INPUT_CLASS}
                      value={newEvent.time}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, time: e.target.value })
                      }
                      aria-describedby="event-time-description"
                    />
                    <span id="event-time-description" className="sr-only">Select the start time for your event</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="event-duration" className="block text-xs font-medium text-slate-500 uppercase mb-1">
                      Duration
                    </label>
                    <select
                      id="event-duration"
                      className={INPUT_CLASS}
                      value={newEvent.duration}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, duration: e.target.value })
                      }
                      aria-describedby="event-duration-description"
                    >
                      <option value="30 min">30 min</option>
                      <option value="1h">1h</option>
                      <option value="1.5h">1.5h</option>
                    </select>
                    <span id="event-duration-description" className="sr-only">Select how long the event will last</span>
                  </div>
                  <div>
                    <label htmlFor="event-type" className="block text-xs font-medium text-slate-500 uppercase mb-1">
                      Type
                    </label>
                    <select
                      id="event-type"
                      className={INPUT_CLASS}
                      value={newEvent.type}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, type: e.target.value })
                      }
                      aria-describedby="event-type-description"
                    >
                      <option value="Virtual">Virtual</option>
                      <option value="In-Person">In-Person</option>
                      <option value="Phone">Phone</option>
                    </select>
                    <span id="event-type-description" className="sr-only">Select the type of meeting</span>
                  </div>
                </div>

                {/* Participants Multi-Select */}
                <div>
                  <label htmlFor="event-participants" className="block text-xs font-medium text-slate-500 uppercase mb-1">
                    Participants
                  </label>
                  <div className="relative">
                    <button
                      id="event-participants"
                      type="button"
                      onClick={() =>
                        setShowParticipantDropdown(!showParticipantDropdown)
                      }
                      aria-label={`Select participants. ${newEvent.participants.length === 0 ? "None selected" : `${newEvent.participants.length} selected`}`}
                      aria-expanded={showParticipantDropdown}
                      aria-haspopup="listbox"
                      className={`${INPUT_CLASS} w-full text-left flex items-center justify-between min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                    >
                      <span className="text-sm">
                        {newEvent.participants.length === 0
                          ? "Select participants..."
                          : `${newEvent.participants.length} participant${
                              newEvent.participants.length > 1 ? "s" : ""
                            } selected`}
                      </span>
                      <UserPlus className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
                    </button>

                    {showParticipantDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {availableParticipants.length === 0 ? (
                          <div className="p-3 text-sm text-slate-500 text-center">
                            {currentUser.role === "MENTEE" 
                              ? "No matched mentor available. Please get matched with a mentor first."
                              : currentUser.role === "MENTOR"
                              ? "No matched mentees available. Please create matches first."
                              : "No other users available"}
                          </div>
                        ) : (
                          availableParticipants.map((user) => (
                            <label
                              key={user.id}
                              className="flex items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 min-h-[44px] touch-manipulation"
                            >
                              <input
                                type="checkbox"
                                checked={newEvent.participants.includes(
                                  user.id
                                )}
                                onChange={() => toggleParticipant(user.id)}
                                aria-label={`Select ${user.name} as participant`}
                                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 min-h-[20px] min-w-[20px]"
                              />
                              <div className="ml-3 flex items-center flex-1">
                                <img
                                  src={user.avatar}
                                  alt={`${user.name}'s avatar`}
                                  className="w-8 h-8 rounded-full mr-2 flex-shrink-0"
                                />
                                <div>
                                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                                    {user.name}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {user.role}
                                  </div>
                                </div>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected participants badges */}
                  {newEvent.participants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newEvent.participants.map((userId) => {
                        const user = users.find((u) => u.id === userId);
                        return user ? (
                          <span
                            key={userId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs"
                          >
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-4 h-4 rounded-full"
                            />
                            {user.name.split(" ")[0]}
                            <button
                              type="button"
                              onClick={() => toggleParticipant(userId)}
                              aria-label={`Remove ${user.name} from participants`}
                              className="ml-1 hover:text-emerald-900 dark:hover:text-emerald-100 min-h-[24px] min-w-[24px] flex items-center justify-center rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 touch-manipulation"
                            >
                              <X className="w-3 h-3" aria-hidden="true" />
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer with Button - Fixed */}
            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-b-none sm:rounded-b-xl">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={async () => {
                    if (editingEvent) {
                      await handleUpdateEvent();
                    } else {
                      await handleSaveEvent();
                    }
                  }}
                  disabled={!newEvent.title || !newEvent.date}
                  className={BUTTON_PRIMARY + " flex-1 min-h-[44px] touch-manipulation"}
                >
                  {editingEvent ? "Update Event" : "Schedule Event"}
                </button>
                {newEvent.title && newEvent.date && (
                  <div className="flex gap-1 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => {
                        const tempEvent: CalendarEvent = {
                          id: "",
                          organizationId: currentUser.organizationId,
                          title: newEvent.title,
                          date: newEvent.date,
                          startTime: newEvent.time,
                          duration: newEvent.duration,
                          type: newEvent.type,
                          createdAt: new Date().toISOString(),
                        };
                        window.open(
                          generateGoogleCalendarLink(tempEvent),
                          "_blank"
                        );
                      }}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                      title="Add to Google Calendar"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs opacity-50 cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Outlook Calendar - Coming Soon"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs opacity-50 cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Apple Calendar - Coming Soon"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed bottom-6 right-6 bg-emerald-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center animate-in slide-in-from-bottom-4 fade-in z-50">
          <CheckCircle className="w-5 h-5 mr-2" />
          <div>
            <p className="font-bold text-sm">
              {syncing ? "Calendar Synced" : "Event Scheduled"}
            </p>
            <p className="text-xs text-emerald-200">
              {syncing
                ? "Events synced successfully"
                : "Added to your calendar."}
            </p>
          </div>
        </div>
      )}

      {calendarConnected && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center">
          <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Google Calendar connected • Events sync automatically
          </p>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
