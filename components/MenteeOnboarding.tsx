import React, { useState, useEffect } from "react";
import { INPUT_CLASS, BUTTON_PRIMARY, CARD_CLASS } from "../styles/common";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  User,
  Target,
  BookOpen,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { ProgramSettings, Goal, User as UserType } from "../types";
import DynamicSignupForm from "./DynamicSignupForm";
import SkillsSelector from "./SkillsSelector";
import { DatePicker } from "./DatePicker";

interface MenteeOnboardingProps {
  onComplete: (formData: any) => void;
  programSettings?: ProgramSettings | null;
  currentUser?: UserType;
}

interface GoalInput {
  title: string;
  targetDate: string;
}

const MenteeOnboarding: React.FC<MenteeOnboardingProps> = ({
  onComplete,
  programSettings,
  currentUser,
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: currentUser?.title || "",
    company: currentUser?.company || "",
    goals: [] as GoalInput[],
    bio: currentUser?.bio || "",
    experience: "",
    areas: currentUser?.goals || [] as string[],
  });
  const [currentGoal, setCurrentGoal] = useState("");
  const [currentTargetDate, setCurrentTargetDate] = useState("");
  const [customFieldData, setCustomFieldData] = useState<Record<string, any>>(
    {}
  );

  // Update formData when currentUser changes (in case it loads asynchronously)
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        title: prev.title || currentUser.title || "",
        company: prev.company || currentUser.company || "",
        bio: prev.bio || currentUser.bio || "",
        areas: prev.areas.length > 0 ? prev.areas : (currentUser.goals || []),
      }));
    }
  }, [currentUser]);

  const addGoal = () => {
    if (currentGoal.trim() && currentTargetDate) {
      const newGoal: GoalInput = {
        title: currentGoal.trim(),
        targetDate: currentTargetDate
      };
      setFormData({
        ...formData,
        goals: [...formData.goals, newGoal],
      });
      setCurrentGoal("");
      setCurrentTargetDate("");
    }
  };

  const removeGoal = (index: number) => {
    setFormData({
      ...formData,
      goals: formData.goals.filter((_, idx) => idx !== index),
    });
  };

  const handleAreasChange = (areas: string[]) => {
    setFormData({
      ...formData,
      areas,
    });
  };

  // Determine total steps based on whether we have custom fields
  const totalSteps = programSettings ? 5 : 4;

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
        <React.Fragment key={s}>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
              step >= s
                ? "bg-emerald-600 text-white"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {step > s ? <Check className="w-5 h-5" /> : s}
          </div>
          {s < totalSteps && (
            <div
              className={`h-1 w-12 rounded-full ${
                step > s ? "bg-emerald-600" : "bg-slate-200"
              }`}
            ></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const handleCustomFieldsSubmit = (data: Record<string, any>) => {
    setCustomFieldData(data);
    // Save all form data and complete onboarding
    onComplete({ ...formData, customFieldData: data });
  };

  const handleComplete = () => {
    // Save all form data and complete onboarding
    onComplete({ ...formData, customFieldData });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome to Your Growth Journey!
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Let's set up your profile so we can match you with the perfect
            mentor.
          </p>
        </div>

        {renderStepIndicator()}

        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className={CARD_CLASS}>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                <User className="w-6 h-6 mr-2 text-emerald-600" /> About You
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Tell us about your current role and experience.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className={INPUT_CLASS}
                    placeholder="e.g., Junior Product Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Company/Organization
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    className={INPUT_CLASS}
                    placeholder="e.g., TechCorp Solutions"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Years of Experience
                  </label>
                  <select
                    value={formData.experience}
                    onChange={(e) =>
                      setFormData({ ...formData, experience: e.target.value })
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="">Select experience level</option>
                    <option value="<1">Less than 1 year</option>
                    <option value="1-3">1-3 years</option>
                    <option value="4-6">4-6 years</option>
                    <option value="7-10">7-10 years</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                disabled={
                  !formData.title || !formData.company || !formData.experience
                }
                className={
                  BUTTON_PRIMARY +
                  " px-8 py-3 text-base shadow-lg disabled:opacity-50"
                }
              >
                Next <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className={CARD_CLASS}>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                <Target className="w-6 h-6 mr-2 text-emerald-600" /> Your Goals
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                What do you want to achieve? This helps us find the right mentor for you. <span className="font-semibold text-slate-700 dark:text-slate-300">Add one goal at a time with a target date for better tracking.</span>
              </p>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Tip:</strong> Adding goals one at a time with specific target dates helps track your progress and measure success more effectively. Be specific! Goals like "become a better leader" are great, but "learn to give constructive feedback" helps mentors understand exactly how to help.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Goal Description
                    </label>
                    <input
                      type="text"
                      value={currentGoal}
                      onChange={(e) => setCurrentGoal(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addGoal())
                      }
                      className={INPUT_CLASS}
                      placeholder="e.g., Learn Python"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target Date
                    </label>
                    <DatePicker
                      value={currentTargetDate}
                      onChange={setCurrentTargetDate}
                      minDate={new Date().toISOString().split('T')[0]}
                      placeholder="Select target date"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addGoal}
                    disabled={!currentGoal.trim() || !currentTargetDate}
                    className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Goal
                  </button>
                </div>

                {formData.goals.length > 0 && (
                  <div className="space-y-2 mt-6">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Your Goals ({formData.goals.length})
                    </h3>
                    {formData.goals.map((goal, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800"
                      >
                        <div className="flex-1">
                          <span className="text-sm font-medium text-emerald-900 dark:text-emerald-300 block">{goal.title}</span>
                          <span className="text-xs text-emerald-700 dark:text-emerald-400">
                            Target: {new Date(goal.targetDate).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => removeGoal(idx)}
                          className="text-emerald-600 hover:text-red-500 ml-3 font-bold text-lg"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 text-slate-500 hover:text-slate-700 font-medium flex items-center"
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={formData.goals.length === 0}
                className={
                  BUTTON_PRIMARY +
                  " px-8 py-3 text-base shadow-lg disabled:opacity-50"
                }
              >
                Next <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className={CARD_CLASS}>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                <BookOpen className="w-6 h-6 mr-2 text-emerald-600" /> Areas of
                Interest
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                What topics or skills do you want to focus on?
              </p>

              <SkillsSelector
                selectedSkills={formData.areas}
                onSkillsChange={handleAreasChange}
                placeholder="Select or type an area of interest (e.g., Product Strategy, Public Speaking, Team Management)"
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 text-slate-500 hover:text-slate-700 font-medium flex items-center"
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={formData.areas.length === 0}
                className={
                  BUTTON_PRIMARY +
                  " px-8 py-3 text-base shadow-lg disabled:opacity-50"
                }
              >
                Next <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className={CARD_CLASS}>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                <User className="w-6 h-6 mr-2 text-emerald-600" /> Tell Your
                Story
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Help mentors understand who you are and what you're looking for.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    className={INPUT_CLASS}
                    rows={6}
                    placeholder="Share your background, what you're passionate about, and what you hope to gain from mentorship..."
                  />
                </div>
              </div>
            </div>

            {!programSettings && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
                <div className="flex items-start">
                  <Sparkles className="w-5 h-5 text-emerald-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                      You're almost done!
                    </h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      Once you complete onboarding, our matching system will
                      suggest mentors who align with your goals. You can also
                      browse available mentors and request a match.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 text-slate-500 hover:text-slate-700 font-medium flex items-center"
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Back
              </button>
              <button
                onClick={() => (programSettings ? setStep(5) : handleComplete())}
                disabled={!formData.bio}
                className={
                  BUTTON_PRIMARY +
                  " px-8 py-3 text-base shadow-lg disabled:opacity-50"
                }
              >
                {programSettings ? (
                  <>
                    Next <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                ) : (
                  <>
                    Complete Setup <Check className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 5 && programSettings && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className={CARD_CLASS}>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                <User className="w-6 h-6 mr-2 text-emerald-600" /> Organization
                Profile
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Complete your organization's custom profile questions.
              </p>

              <DynamicSignupForm
                programSettings={programSettings}
                onSubmit={handleCustomFieldsSubmit}
                submitButtonText="Complete Setup"
                excludeFields={['title', 'company', 'bio']}
              />
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
              <div className="flex items-start">
                <Sparkles className="w-5 h-5 text-emerald-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                    You're almost done!
                  </h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    Once you complete these fields, our matching system will
                    suggest mentors who align with your goals. You can also
                    browse available mentors and request a match.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(4)}
                className="px-6 py-3 text-slate-500 hover:text-slate-700 font-medium flex items-center"
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenteeOnboarding;
