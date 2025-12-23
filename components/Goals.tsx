import React, { useState } from "react";
import { User, Goal } from "../types";
import { INPUT_CLASS, BUTTON_PRIMARY, CARD_CLASS } from "../styles/common";
import {
  Loader2,
  Plus,
  Sparkles,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { breakdownGoal } from "../services/geminiService";

interface GoalsProps {
  user: User;
  goals: Goal[];
  onAddGoal: (g: Omit<Goal, "id">) => void;
  onUpdateGoal: (id: string, progress: number, status: string) => void;
}

const Goals: React.FC<GoalsProps> = ({
  user,
  goals,
  onAddGoal,
  onUpdateGoal,
}) => {
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [targetDate, setTargetDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [loadingAI, setLoadingAI] = useState(false);
  const [goalToConfirm, setGoalToConfirm] = useState<string | null>(null);

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
        {myGoals.map((goal) => (
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

            <div className="mt-auto space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>Progress: {goal.progress}%</span>
                  {goal.progress === 100 && (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" /> Ready to Complete
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
        ))}
      </div>

      {goalToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-800">
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
            <div className="flex gap-3">
              <button
                onClick={() => setGoalToConfirm(null)}
                className="flex-1 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmComplete}
                className="flex-1 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium"
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
