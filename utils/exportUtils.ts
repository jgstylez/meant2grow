/**
 * Export utilities for dashboard data
 * Supports CSV and PDF export formats
 */

import { User, Match, Goal, Rating, Organization, CalendarEvent, ChatMessage } from "../types";
import { logger } from "../services/logger";

// CSV Export Functions
export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
): void => {
  try {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    // Get headers from first object if not provided
    const csvHeaders = headers || Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      csvHeaders.join(","),
      ...data.map((row) =>
        csvHeaders
          .map((header) => {
            const value = row[header];
            // Handle null/undefined
            if (value === null || value === undefined) return "";
            // Handle arrays
            if (Array.isArray(value)) return `"${value.join(", ")}"`;
            // Handle dates
            if (value instanceof Date) return value.toISOString();
            // Handle objects
            if (typeof value === "object") return `"${JSON.stringify(value)}"`;
            // Escape quotes and wrap in quotes if contains comma or newline
            const stringValue = String(value);
            if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(",")
      ),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    logger.error("Error exporting to CSV", error);
    alert("Failed to export data. Please try again.");
  }
};

// User-specific CSV export
export const exportUsersToCSV = (users: User[], organizations: Organization[]): void => {
  const orgMap = new Map(organizations.map((org) => [org.id, org.name]));
  
  const exportData = users.map((user) => ({
    Name: user.name,
    Email: user.email,
    Role: user.role,
    Organization: orgMap.get(user.organizationId) || "Unknown",
    Company: user.company || "",
    Title: user.title || "",
    "Created At": new Date(user.createdAt).toLocaleDateString(),
    Skills: user.skills?.join(", ") || "",
    Goals: user.goals?.join(", ") || "",
  }));

  exportToCSV(exportData, "users", [
    "Name",
    "Email",
    "Role",
    "Organization",
    "Company",
    "Title",
    "Created At",
    "Skills",
    "Goals",
  ]);
};

// Match-specific CSV export
export const exportMatchesToCSV = (
  matches: Match[],
  users: User[]
): void => {
  const userMap = new Map(users.map((user) => [user.id, user.name]));
  
  const exportData = matches.map((match) => ({
    "Match ID": match.id,
    Mentor: userMap.get(match.mentorId) || "Unknown",
    Mentee: userMap.get(match.menteeId) || "Unknown",
    Status: match.status,
    "Start Date": match.startDate,
    "End Date": (match as any).endDate || "", // Optional field, may not exist in all matches
  }));

  exportToCSV(exportData, "matches", [
    "Match ID",
    "Mentor",
    "Mentee",
    "Status",
    "Start Date",
    "End Date",
  ]);
};

// Goal-specific CSV export
export const exportGoalsToCSV = (goals: Goal[], users: User[]): void => {
  const userMap = new Map(users.map((user) => [user.id, user.name]));
  
  const exportData = goals.map((goal) => ({
    "Goal ID": goal.id,
    User: userMap.get(goal.userId) || "Unknown",
    Title: goal.title,
    Description: goal.description || "",
    Status: goal.status,
    Progress: `${goal.progress}%`,
    "Due Date": goal.dueDate,
    "Created At": (goal as any).createdAt ? new Date((goal as any).createdAt).toLocaleDateString() : "N/A",
  }));

  exportToCSV(exportData, "goals", [
    "Goal ID",
    "User",
    "Title",
    "Description",
    "Status",
    "Progress",
    "Due Date",
    "Created At",
  ]);
};

// Rating-specific CSV export
export const exportRatingsToCSV = (
  ratings: Rating[],
  users: User[]
): void => {
  const userMap = new Map(users.map((user) => [user.id, user.name]));
  
  const exportData = ratings.map((rating) => ({
    "Rating ID": rating.id,
    "From User": userMap.get(rating.fromUserId) || "Unknown",
    "To User": userMap.get(rating.toUserId) || "Unknown",
    Score: rating.score,
    Comment: rating.comment || "",
    Approved: rating.isApproved ? "Yes" : "No",
    Date: rating.date,
  }));

  exportToCSV(exportData, "ratings", [
    "Rating ID",
    "From User",
    "To User",
    "Score",
    "Comment",
    "Approved",
    "Date",
  ]);
};

// PDF Export using jsPDF (requires jsPDF library)
export const exportToPDF = async (
  title: string,
  data: Array<Record<string, any>>,
  filename: string
): Promise<void> => {
  try {
    // Dynamic import to avoid bundling jsPDF if not needed
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    if (data.length === 0) {
      doc.text("No data available", 14, 40);
      doc.save(`${filename}_${new Date().toISOString().split("T")[0]}.pdf`);
      return;
    }

    // Get headers
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((header) => String(row[header] || "")));

    // Calculate column widths
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const availableWidth = pageWidth - 2 * margin;
    const colWidth = availableWidth / headers.length;

    // Add table
    let y = 40;
    const rowHeight = 7;
    const maxRowsPerPage = Math.floor((doc.internal.pageSize.getHeight() - y - 20) / rowHeight);

    // Headers
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    headers.forEach((header, i) => {
      doc.text(header.substring(0, 20), margin + i * colWidth, y);
    });
    y += rowHeight;

    // Rows
    doc.setFont(undefined, "normal");
    rows.forEach((row, rowIndex) => {
      if (rowIndex > 0 && rowIndex % maxRowsPerPage === 0) {
        doc.addPage();
        y = 20;
        // Redraw headers
        doc.setFont(undefined, "bold");
        headers.forEach((header, i) => {
          doc.text(header.substring(0, 20), margin + i * colWidth, y);
        });
        y += rowHeight;
        doc.setFont(undefined, "normal");
      }

      row.forEach((cell, i) => {
        const cellText = String(cell).substring(0, 20);
        doc.text(cellText, margin + i * colWidth, y);
      });
      y += rowHeight;
    });

    doc.save(`${filename}_${new Date().toISOString().split("T")[0]}.pdf`);
  } catch (error) {
    logger.error("Error exporting to PDF", error);
    // Fallback to CSV if PDF fails
    alert("PDF export failed. Falling back to CSV export.");
    exportToCSV(data, filename);
  }
};

export interface ExportUserDataOptions {
  user: User;
  matches?: Match[];
  goals?: Goal[];
  ratings?: Rating[];
  calendarEvents?: CalendarEvent[];
  chatMessages?: ChatMessage[];
  users?: User[]; // For resolving mentor/mentee names in matches
}

/** Export user's profile and related data as JSON (GDPR "Download Your Data").
 * Works for mentees, mentors, and org admins. Includes all provided data. */
export const exportUserProfileData = (opts: ExportUserDataOptions): void => {
  try {
    const { user, matches = [], goals = [], ratings = [], calendarEvents = [], chatMessages = [], users = [] } = opts;
    const userMatches = matches.filter(
      (m) => m.mentorId === user.id || m.menteeId === user.id
    );
    const userGoals = goals.filter((g) => g.userId === user.id);
    const userRatings = ratings.filter(
      (r) => r.fromUserId === user.id || r.toUserId === user.id
    );
    const userEvents = calendarEvents.filter(
      (e) =>
        e.mentorId === user.id ||
        e.menteeId === user.id ||
        (e.participants && e.participants.includes(user.id))
    );
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: {
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        company: user.company,
        bio: user.bio,
        skills: user.skills,
        city: user.city,
        state: user.state,
        zip: user.zip,
        createdAt: user.createdAt,
      },
      matches: userMatches.map((m) => ({
        id: m.id,
        status: m.status,
        startDate: m.startDate,
        mentorName: userMap.get(m.mentorId) ?? m.mentorId,
        menteeName: userMap.get(m.menteeId) ?? m.menteeId,
      })),
      goals: userGoals.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        progress: g.progress,
        status: g.status,
        dueDate: g.dueDate,
      })),
      ratings: userRatings.map((r) => ({
        id: r.id,
        fromUser: userMap.get(r.fromUserId) ?? r.fromUserId,
        toUser: userMap.get(r.toUserId) ?? r.toUserId,
        score: r.score,
        comment: r.comment,
        date: r.date,
      })),
      calendarEvents: userEvents.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        startTime: e.startTime,
        duration: e.duration,
        type: e.type,
      })),
      chatMessages: chatMessages.map((m) => ({
        id: m.id,
        chatId: m.chatId,
        text: m.text,
        type: m.type,
        timestamp: m.timestamp,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `meant2grow_data_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    logger.error("Error exporting user data", error);
    alert("Failed to export data. Please try again.");
  }
};
