import React, { useState, useEffect } from "react";
import { CalendarEvent, User } from "../types";
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

interface CalendarViewProps {
  events: CalendarEvent[];
  currentUser: User;
  onAddEvent: (e: Omit<CalendarEvent, "id" | "createdAt">) => void;
  onNavigate: (page: string, tab?: string) => void;
  users: User[];
}

const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  currentUser,
  onAddEvent,
  onNavigate,
  users,
}) => {
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
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

    const event: Omit<CalendarEvent, "id" | "createdAt"> = {
      organizationId: currentUser.organizationId,
      title: newEvent.title,
      date: newEvent.date,
      startTime: newEvent.time,
      duration: newEvent.duration,
      type: newEvent.type,
      ...(currentUser.role === "MENTOR" && { mentorId: currentUser.id }),
      ...(currentUser.role === "MENTEE" && { menteeId: currentUser.id }),
      ...(newEvent.participants.length > 0 && {
        participants: newEvent.participants,
      }),
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
      for (const syncedEvent of syncedEvents) {
        // Check if event already exists
        const exists = events.some(
          (e) =>
            e.title === syncedEvent.title &&
            e.date === syncedEvent.date &&
            e.startTime === syncedEvent.startTime
        );

        if (!exists) {
          await createCalendarEvent(syncedEvent);
        }
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error syncing calendar:", error);
      alert(error.message || "Failed to sync calendar");
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

  const availableParticipants = users.filter((u) => u.id !== currentUser.id);

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Calendar
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage your mentorship sessions and events.
          </p>
        </div>
        <div className="flex gap-3">
          {calendarConnected ? (
            <button
              onClick={handleSyncCalendar}
              disabled={syncing}
              className="flex items-center px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          ) : (
            <button
              onClick={() => onNavigate("settings", "calendar")}
              className="flex items-center px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Settings className="w-4 h-4 mr-2" /> Connect Calendar
            </button>
          )}
          <button
            onClick={() => setIsAddEventOpen(true)}
            className={BUTTON_PRIMARY}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Event
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Month Navigation */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
            className="px-3 py-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            ←
          </button>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
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
            className="px-3 py-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center py-2 bg-slate-50 dark:bg-slate-950">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-xs font-bold text-slate-500 uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7">
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

              // Filter events for this specific date
              const dayEvents = events.filter((e) => {
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
                  className={`border-r border-b border-slate-100 dark:border-slate-800 p-2 min-h-[100px] relative ${
                    i % 7 === 6 ? "border-r-0" : ""
                  } ${
                    !calendarDay.isCurrentMonth
                      ? "bg-slate-50/50 dark:bg-slate-950/50"
                      : ""
                  }`}
                >
                  <span
                    className={`text-sm font-medium block mb-2 ${
                      isToday
                        ? "bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                        : calendarDay.isCurrentMonth
                        ? "text-slate-700 dark:text-slate-300"
                        : "text-slate-400 dark:text-slate-600"
                    }`}
                  >
                    {calendarDay.day}
                  </span>
                  <div className="space-y-1">
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

                      return (
                        <div
                          key={ev.id}
                          className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 px-1.5 py-1 rounded truncate border border-indigo-200 dark:border-indigo-800 group relative cursor-pointer hover:z-10"
                        >
                          <div className="truncate">
                            {ev.startTime} {ev.title}
                          </div>
                          {participantNames && (
                            <div className="text-[9px] text-indigo-600 dark:text-indigo-300 truncate">
                              {participantNames}
                              {extraCount > 0 ? ` +${extraCount}` : ""}
                            </div>
                          )}

                          {/* Tooltip on hover with calendar links */}
                          <div className="hidden group-hover:block absolute left-0 top-full mt-1 bg-slate-900 text-white text-[10px] rounded px-2 py-1 z-20 whitespace-nowrap shadow-lg min-w-[200px]">
                            {ev.participants && ev.participants.length > 0 && (
                              <div className="mb-2 pb-2 border-b border-slate-700">
                                Participants:{" "}
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
                              <div className="text-[9px] text-slate-400 mb-1">
                                Add to calendar:
                              </div>
                              <a
                                href={generateGoogleCalendarLink(
                                  ev,
                                  ev.googleMeetLink
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:bg-slate-800 px-1 py-0.5 rounded text-[9px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                📅 Google Calendar
                              </a>
                              <a
                                href={generateOutlookCalendarLink(
                                  ev,
                                  ev.googleMeetLink
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:bg-slate-800 px-1 py-0.5 rounded text-[9px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                📅 Outlook Calendar
                              </a>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const ics = generateAppleCalendarICS(
                                    ev,
                                    ev.googleMeetLink
                                  );
                                  const blob = new Blob([ics], {
                                    type: "text/calendar;charset=utf-8",
                                  });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement("a");
                                  link.href = url;
                                  link.download = `${ev.title.replace(
                                    /[^a-z0-9]/gi,
                                    "_"
                                  )}.ics`;
                                  link.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="block w-full text-left hover:bg-slate-800 px-1 py-0.5 rounded text-[9px]"
                              >
                                📅 Apple Calendar
                              </button>
                            </div>
                          </div>
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            {/* Header - Fixed */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Add New Event
              </h3>
              <button
                onClick={() => {
                  setIsAddEventOpen(false);
                  setShowParticipantDropdown(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                    Event Title
                  </label>
                  <input
                    className={INPUT_CLASS}
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                    placeholder="e.g. Weekly Check-in"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      className={INPUT_CLASS}
                      value={newEvent.date}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      className={INPUT_CLASS}
                      value={newEvent.time}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, time: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                      Duration
                    </label>
                    <select
                      className={INPUT_CLASS}
                      value={newEvent.duration}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, duration: e.target.value })
                      }
                    >
                      <option>30 min</option>
                      <option>1h</option>
                      <option>1.5h</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                      Type
                    </label>
                    <select
                      className={INPUT_CLASS}
                      value={newEvent.type}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, type: e.target.value })
                      }
                    >
                      <option>Virtual</option>
                      <option>In-Person</option>
                      <option>Phone</option>
                    </select>
                  </div>
                </div>

                {/* Participants Multi-Select */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                    Participants
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setShowParticipantDropdown(!showParticipantDropdown)
                      }
                      className={`${INPUT_CLASS} w-full text-left flex items-center justify-between`}
                    >
                      <span className="text-sm">
                        {newEvent.participants.length === 0
                          ? "Select participants..."
                          : `${newEvent.participants.length} participant${
                              newEvent.participants.length > 1 ? "s" : ""
                            } selected`}
                      </span>
                      <UserPlus className="w-4 h-4 text-slate-400" />
                    </button>

                    {showParticipantDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {availableParticipants.length === 0 ? (
                          <div className="p-3 text-sm text-slate-500 text-center">
                            No other users available
                          </div>
                        ) : (
                          availableParticipants.map((user) => (
                            <label
                              key={user.id}
                              className="flex items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                            >
                              <input
                                type="checkbox"
                                checked={newEvent.participants.includes(
                                  user.id
                                )}
                                onChange={() => toggleParticipant(user.id)}
                                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                              />
                              <div className="ml-3 flex items-center flex-1">
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="w-8 h-8 rounded-full mr-2"
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
              </div>
            </div>

            {/* Footer with Button - Fixed */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-b-xl">
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEvent}
                  disabled={!newEvent.title || !newEvent.date}
                  className={BUTTON_PRIMARY + " flex-1"}
                >
                  Schedule Event
                </button>
                {newEvent.title && newEvent.date && (
                  <div className="flex gap-1">
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
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                      title="Add to Google Calendar"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
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
                          generateOutlookCalendarLink(tempEvent),
                          "_blank"
                        );
                      }}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                      title="Add to Outlook Calendar"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
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
                        const ics = generateAppleCalendarICS(tempEvent);
                        const blob = new Blob([ics], {
                          type: "text/calendar;charset=utf-8",
                        });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `${newEvent.title.replace(
                          /[^a-z0-9]/gi,
                          "_"
                        )}.ics`;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                      title="Add to Apple Calendar"
                    >
                      <ExternalLink className="w-3 h-3" />
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
