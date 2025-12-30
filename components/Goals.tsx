import React, { useState, useEffect } from "react";
import { User, Goal, Milestone, Match, MatchStatus, Role } from "../types";
import { INPUT_CLASS, BUTTON_PRIMARY, CARD_CLASS } from "../styles/common";
import {
  Loader2,
  Plus,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Flag,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { breakdownGoal, suggestMilestones, SuggestedMilestone } from "../services/geminiService";
import {
  createMilestone,
  updateMilestone,
  deleteMilestone,
  subscribeToMilestones,
} from "../services/database";

interface GoalsProps {
  user: User;
  goals: Goal[];
  matches: Match[];
  onAddGoal: (g: Omit<Goal, "id">) => void;
  onUpdateGoal: (id: string, progress: number, status: string) => void;
}

const Goals: React.FC<GoalsProps> = ({
  user,
  goals,
  matches,
  onAddGoal,
  onUpdateGoal,
}) => {
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [targetDate, setTargetDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [loadingAI, setLoadingAI] = useState(false);
  const [goalToConfirm, setGoalToConfirm] = useState<string | null>(null);
  
  // Milestone state
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});
  const [showMilestoneForm, setShowMilestoneForm] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState("");
  const [newMilestoneDescription, setNewMilestoneDescription] = useState("");
  
  // Assisted milestone suggestions
  const [suggestedMilestones, setSuggestedMilestones] = useState<Record<string, SuggestedMilestone[]>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<Record<string, boolean>>({});
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<string, Set<number>>>({});

  // Find user's mentor (if mentee)
  const activeMatch = matches.find(
    (m) =>
      (m.menteeId === user.id || m.mentorId === user.id) &&
      m.status === MatchStatus.ACTIVE
  );
  const mentorId =
    activeMatch && activeMatch.menteeId === user.id
      ? activeMatch.mentorId
      : null;
  const isMentee = user.role === Role.MENTEE;

  // Load milestones when goal is expanded
  useEffect(() => {
    if (expandedGoalId) {
      const unsubscribe = subscribeToMilestones(expandedGoalId, (milestones) => {
        setMilestones((prev) => ({ ...prev, [expandedGoalId]: milestones }));
      });
      return unsubscribe;
    }
  }, [expandedGoalId]);

  // Calculate progress from milestones
  const calculateProgress = (goalMilestones: Milestone[]): number => {
    if (!goalMilestones || goalMilestones.length === 0) return 0;
    const completed = goalMilestones.filter((m) => m.completed).length;
    return Math.round((completed / goalMilestones.length) * 100);
  };

  const handleAddGoal = async () => {
    if (!newGoalTitle) return;
    setLoadingAI(true);
    try {
      const breakdown = await breakdownGoal(newGoalTitle);

      const newGoal: Omit<Goal, "id"> = {
        userId: user.id,
        organizationId: user.organizationId, // Include organizationId
        title: newGoalTitle,
        description: `Steps: ${breakdown.steps.join(" -> ")}`,
        progress: 0,
        status: "Not Started",
        dueDate:
          targetDate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
      };
      onAddGoal(newGoal);
      setNewGoalTitle("");
    } catch (error) {
      console.error("Error creating goal:", error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleConfirmComplete = () => {
    if (goalToConfirm) {
      onUpdateGoal(goalToConfirm, 100, "Completed");
      setGoalToConfirm(null);
    }
  };

  // Handle milestone creation
  const handleAddMilestone = async (goalId: string, goal: Goal) => {
    if (!newMilestoneTitle || !newMilestoneDueDate) return;

    const milestone: Omit<Milestone, "id"> = {
      goalId,
      organizationId: goal.organizationId,
      title: newMilestoneTitle,
      description: newMilestoneDescription || undefined,
      dueDate: newMilestoneDueDate,
      completed: false,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      visibleToMentor: true,
      visibleToMentee: true,
    };

    try {
      await createMilestone(milestone);
      setNewMilestoneTitle("");
      setNewMilestoneDueDate("");
      setNewMilestoneDescription("");
      setShowMilestoneForm(null);

      // Update goal progress
      const goalMilestones = milestones[goalId] || [];
      const newProgress = calculateProgress([
        ...goalMilestones,
        milestone as Milestone,
      ]);
      onUpdateGoal(
        goalId,
        newProgress,
        newProgress === 100 ? "Completed" : "In Progress"
      );
    } catch (error) {
      console.error("Error creating milestone:", error);
    }
  };

  // Toggle milestone completion
  const handleToggleMilestone = async (
    milestone: Milestone,
    goalId: string
  ) => {
    const updated = {
      ...milestone,
      completed: !milestone.completed,
      completedAt: !milestone.completed
        ? new Date().toISOString()
        : undefined,
    };

    try {
      await updateMilestone(milestone.id, updated);

      // Update goal progress
      const goalMilestones = milestones[goalId] || [];
      const updatedMilestones = goalMilestones.map((m) =>
        m.id === milestone.id ? updated : m
      );
      const newProgress = calculateProgress(updatedMilestones);
      onUpdateGoal(
        goalId,
        newProgress,
        newProgress === 100 ? "Completed" : "In Progress"
      );
    } catch (error) {
      console.error("Error updating milestone:", error);
    }
  };

  // Get assisted milestone suggestions
  const handleGetSuggestions = async (goal: Goal) => {
    setLoadingSuggestions((prev) => ({ ...prev, [goal.id]: true }));
    try {
      const suggestions = await suggestMilestones(
        goal.title,
        goal.description,
        goal.dueDate
      );
      setSuggestedMilestones((prev) => ({ ...prev, [goal.id]: suggestions }));
      setShowSuggestions(goal.id);
      setSelectedSuggestions((prev) => ({
        ...prev,
        [goal.id]: new Set(suggestions.map((_, i) => i)),
      }));
    } catch (error) {
      console.error("Error getting suggestions:", error);
    } finally {
      setLoadingSuggestions((prev) => ({ ...prev, [goal.id]: false }));
    }
  };

  // Add selected suggested milestones
  const handleAddSelectedSuggestions = async (goalId: string, goal: Goal) => {
    const suggestions = suggestedMilestones[goalId] || [];
    const selected = selectedSuggestions[goalId] || new Set();

    try {
      for (const index of selected) {
        const suggestion = suggestions[index];
        if (suggestion) {
          const milestone: Omit<Milestone, "id"> = {
            goalId,
            organizationId: goal.organizationId,
            title: suggestion.title,
            description: suggestion.description,
            dueDate: suggestion.suggestedDueDate,
            completed: false,
            createdBy: user.id,
            createdAt: new Date().toISOString(),
            visibleToMentor: true,
            visibleToMentee: true,
          };
          await createMilestone(milestone);
        }
      }

      // Update goal progress
      const goalMilestones = milestones[goalId] || [];
      const newProgress = calculateProgress([
        ...goalMilestones,
        ...suggestions
          .filter((_, i) => selected.has(i))
          .map(() => ({ completed: false } as Milestone)),
      ]);
      onUpdateGoal(
        goalId,
        newProgress,
        newProgress === 100 ? "Completed" : "In Progress"
      );

      // Reset suggestions
      setShowSuggestions(null);
      setSuggestedMilestones((prev) => {
        const updated = { ...prev };
        delete updated[goalId];
        return updated;
      });
      setSelectedSuggestions((prev) => {
        const updated = { ...prev };
        delete updated[goalId];
        return updated;
      });
    } catch (error) {
      console.error("Error adding suggested milestones:", error);
    }
  };

  // Toggle suggestion selection
  const toggleSuggestionSelection = (goalId: string, index: number) => {
    setSelectedSuggestions((prev) => {
      const current = prev[goalId] || new Set();
      const updated = new Set(current);
      if (updated.has(index)) {
        updated.delete(index);
      } else {
        updated.add(index);
      }
      return { ...prev, [goalId]: updated };
    });
  };

  const myGoals = goals.filter((g) => g.userId === user.id);

  return (
    <div className="space-y-6 relative">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        My Professional Goals
      </h1>

      <div className={CARD_CLASS}>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Set a new goal
        </label>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-800 dark:text-blue-300">
            <strong>Tip:</strong> Add one goal at a time with a specific target date for better tracking and measurement.
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            placeholder="e.g., Learn Python"
            className={INPUT_CLASS + " flex-1"}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Target Date:
            </span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <button
            onClick={handleAddGoal}
            disabled={loadingAI || !newGoalTitle.trim()}
            className={BUTTON_PRIMARY + " disabled:opacity-50 disabled:cursor-not-allowed"}
          >
            {loadingAI ? (
              <Loader2 className="animate-spin w-4 h-4 mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add Goal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {myGoals.map((goal) => {
          const goalMilestones = milestones[goal.id] || [];
          const isExpanded = expandedGoalId === goal.id;

          return (
          <div key={goal.id} className={`${CARD_CLASS} flex flex-col`}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                {goal.title}
              </h3>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  goal.status === "Completed"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                }`}
              >
                {goal.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1">
              {goal.description}
            </p>

              {/* Milestones section */}
              <div className="mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() =>
                      setExpandedGoalId(isExpanded ? null : goal.id)
                    }
                    className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Milestones ({goalMilestones.length})
                    {isMentee && mentorId && (
                      <span className="ml-2 text-xs text-slate-400">
                        (Shared with mentor)
                      </span>
                    )}
                  </button>
                  {isExpanded && (
                    <div className="flex items-center gap-2">
                      {goalMilestones.length === 0 && (
                        <button
                          onClick={() => handleGetSuggestions(goal)}
                          disabled={loadingSuggestions[goal.id]}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center disabled:opacity-50"
                        >
                          {loadingSuggestions[goal.id] ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Getting suggestions...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 mr-1" /> Get suggestions
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setShowMilestoneForm(
                            showMilestoneForm === goal.id ? null : goal.id
                          )
                        }
                        className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Milestone
                      </button>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="space-y-2">
                    {/* Assisted milestone suggestions */}
                    {showSuggestions === goal.id &&
                      suggestedMilestones[goal.id] && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center">
                              <Sparkles className="w-4 h-4 mr-2" />
                              Suggested Milestones
                            </h4>
                            <button
                              onClick={() => setShowSuggestions(null)}
                              className="text-xs text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="space-y-2">
                            {suggestedMilestones[goal.id].map(
                              (suggestion, index) => {
                                const isSelected =
                                  selectedSuggestions[goal.id]?.has(index) ??
                                  false;
                                return (
                                  <label
                                    key={index}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                      isSelected
                                        ? "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() =>
                                        toggleSuggestionSelection(goal.id, index)
                                      }
                                      className="mt-1"
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium text-sm text-slate-900 dark:text-white">
                                        {suggestion.title}
                                      </div>
                                      {suggestion.description && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                          {suggestion.description}
                                        </div>
                                      )}
                                      <div className="text-xs text-slate-400 mt-1 flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        Due: {suggestion.suggestedDueDate}
                                      </div>
                                    </div>
                                  </label>
                                );
                              }
                            )}
                          </div>
                          <button
                            onClick={() =>
                              handleAddSelectedSuggestions(goal.id, goal)
                            }
                            disabled={
                              !selectedSuggestions[goal.id] ||
                              selectedSuggestions[goal.id].size === 0
                            }
                            className={BUTTON_PRIMARY + " w-full text-sm"}
                          >
                            Add Selected ({selectedSuggestions[goal.id]?.size || 0})
                          </button>
                        </div>
                      )}

                    {/* Milestone form */}
                    {showMilestoneForm === goal.id && (
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                        <input
                          type="text"
                          value={newMilestoneTitle}
                          onChange={(e) => setNewMilestoneTitle(e.target.value)}
                          placeholder="Milestone title"
                          className={INPUT_CLASS}
                        />
                        <textarea
                          value={newMilestoneDescription}
                          onChange={(e) =>
                            setNewMilestoneDescription(e.target.value)
                          }
                          placeholder="Description (optional)"
                          className={INPUT_CLASS}
                          rows={2}
                        />
                        <input
                          type="date"
                          value={newMilestoneDueDate}
                          onChange={(e) =>
                            setNewMilestoneDueDate(e.target.value)
                          }
                          className={INPUT_CLASS}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddMilestone(goal.id, goal)}
                            className={BUTTON_PRIMARY + " text-sm"}
                            disabled={!newMilestoneTitle || !newMilestoneDueDate}
                          >
                            Add Milestone
                          </button>
                          <button
                            onClick={() => {
                              setShowMilestoneForm(null);
                              setNewMilestoneTitle("");
                              setNewMilestoneDueDate("");
                              setNewMilestoneDescription("");
                            }}
                            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Milestones list */}
                    {goalMilestones.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">
                        No milestones yet. Break down your goal into smaller
                        steps!
                      </p>
                    ) : (
                      goalMilestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${
                            milestone.completed
                              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <button
                            onClick={() =>
                              handleToggleMilestone(milestone, goal.id)
                            }
                            className={`mt-0.5 ${
                              milestone.completed
                                ? "text-emerald-600"
                                : "text-slate-400 hover:text-emerald-600"
                            }`}
                          >
                            <CheckCircle2
                              className={`w-5 h-5 ${
                                milestone.completed ? "fill-current" : ""
                              }`}
                            />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                className={`font-medium text-sm ${
                                  milestone.completed
                                    ? "text-slate-500 line-through"
                                    : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {milestone.title}
                              </h4>
                            </div>
                            {milestone.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {milestone.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {milestone.dueDate}
                              </span>
                              {milestone.completed &&
                                milestone.completedAt && (
                                  <span className="flex items-center text-emerald-600">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Completed{" "}
                                    {new Date(
                                      milestone.completedAt
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

            <div className="mt-auto space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>Progress: {goal.progress}%</span>
                  {goal.progress === 100 && (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" /> Ready to
                        Complete
                    </span>
                  )}
                </div>

                <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full">
                  <div
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                      goal.status === "Completed"
                        ? "bg-emerald-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${goal.progress}%` }}
                  ></div>
                  {goal.status !== "Completed" && (
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={goal.progress}
                      onChange={(e) =>
                        onUpdateGoal(
                          goal.id,
                          parseInt(e.target.value),
                          parseInt(e.target.value) === 100
                            ? "Completed"
                            : "In Progress"
                        )
                      }
                      className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                      title="Drag to update progress"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-800">
                <p className="text-xs text-slate-400">Due: {goal.dueDate}</p>
                {goal.status !== "Completed" && (
                  <button
                    onClick={() => setGoalToConfirm(goal.id)}
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center transition-colors px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark as
                    Complete
                  </button>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {goalToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-none sm:rounded-xl shadow-2xl p-4 sm:p-6 max-w-sm w-full h-full sm:h-auto mx-0 sm:mx-4 border-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex-1 flex flex-col justify-center">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 mx-auto">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2 text-slate-900 dark:text-white">
                Mark Goal as Completed?
              </h3>
              <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-6">
                Are you sure you want to mark "
                <strong>
                  {goals.find((g) => g.id === goalToConfirm)?.title}
                </strong>
                " as completed? This is a great milestone!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              <button
                onClick={() => setGoalToConfirm(null)}
                className="flex-1 py-3 sm:py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium min-h-[44px] touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmComplete}
                className="flex-1 py-3 sm:py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium min-h-[44px] touch-manipulation"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
