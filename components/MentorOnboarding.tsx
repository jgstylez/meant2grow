import React, { useState, useEffect } from 'react';
import { INPUT_CLASS, BUTTON_PRIMARY, CARD_CLASS } from '../styles/common';
import { Check, ChevronRight, ChevronLeft, User, Briefcase, Target, MessageSquare, Sparkles, ArrowRight, CheckCircle2, Bell, Users, BookOpen, Calendar } from 'lucide-react';
import { ProgramSettings, Goal, User as UserType } from '../types';
import DynamicSignupForm from './DynamicSignupForm';
import SkillsSelector from './SkillsSelector';
import { DatePicker } from './DatePicker';

interface MentorOnboardingProps {
  onComplete: (formData: any) => void;
  programSettings?: ProgramSettings | null;
  currentUser?: UserType;
}

interface GoalInput {
  title: string;
  targetDate: string;
}

const MentorOnboarding: React.FC<MentorOnboardingProps> = ({ onComplete, programSettings, currentUser }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: currentUser?.title || '',
    company: currentUser?.company || '',
    skills: currentUser?.skills || [] as string[],
    bio: currentUser?.bio || '',
    experience: '',
    availability: '',
    maxMentees: '2',
    goals: [] as GoalInput[]
  });
  const [currentGoal, setCurrentGoal] = useState('');
  const [currentTargetDate, setCurrentTargetDate] = useState('');
  const [customFieldData, setCustomFieldData] = useState<Record<string, any>>({});

  // Update formData when currentUser changes (in case it loads asynchronously)
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        title: prev.title || currentUser.title || '',
        company: prev.company || currentUser.company || '',
        skills: prev.skills.length > 0 ? prev.skills : (currentUser.skills || []),
        bio: prev.bio || currentUser.bio || '',
      }));
    }
  }, [currentUser]);

  const handleSkillsChange = (skills: string[]) => {
    setFormData({...formData, skills});
  };

  const addGoal = () => {
    if (currentGoal.trim() && currentTargetDate) {
      const newGoal: GoalInput = {
        title: currentGoal.trim(),
        targetDate: currentTargetDate
      };
      setFormData({...formData, goals: [...formData.goals, newGoal]});
      setCurrentGoal('');
      setCurrentTargetDate('');
    }
  };

  const removeGoal = (index: number) => {
    setFormData({...formData, goals: formData.goals.filter((_, idx) => idx !== index)});
  };

  // Determine total steps based on whether we have custom fields
  const formSteps = programSettings ? 5 : 4;
  const completionStep = formSteps + 1;

  const renderStepIndicator = () => {
    // Don't show step indicator on completion screen
    if (step === completionStep) return null;
    
    return (
      <div className="flex items-center justify-center space-x-2 mb-8">
        {Array.from({ length: formSteps }, (_, i) => i + 1).map((s) => (
          <React.Fragment key={s}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
              step >= s ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < formSteps && <div className={`h-1 w-12 rounded-full ${step > s ? 'bg-emerald-600' : 'bg-slate-200'}`}></div>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const handleCustomFieldsSubmit = (data: Record<string, any>) => {
    setCustomFieldData(data);
    // Save all form data and complete onboarding
    onComplete({ ...formData, customFieldData: data });
  };

  const handleComplete = () => {
    // Save all form data and complete onboarding
    // This will mark onboarding as complete and redirect to dashboard
    onComplete({ ...formData, customFieldData });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome, Mentor!</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Let's set up your profile to help mentees find you.</p>
        </div>

        {renderStepIndicator()}

        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className={CARD_CLASS}>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                <User className="w-6 h-6 mr-2 text-emerald-600" /> Basic Information
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Tell us about your professional background.</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Job Title</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className={INPUT_CLASS}
                    placeholder="e.g., Senior Product Manager"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company/Organization</label>
                  <input 
                    type="text" 
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className={INPUT_CLASS}
                    placeholder="e.g., TechCorp Solutions"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Years of Experience</label>
                  <select 
                    value={formData.experience}
                    onChange={(e) => setFormData({...formData, experience: e.target.value})}
                    className={INPUT_CLASS}
                  >
                    <option value="">Select experience level</option>
                    <option value="1-3">1-3 years</option>
                    <option value="4-6">4-6 years</option>
                    <option value="7-10">7-10 years</option>
                    <option value="11-15">11-15 years</option>
                    <option value="16+">16+ years</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setStep(2)} 
                disabled={!formData.title || !formData.company || !formData.experience}
                className={BUTTON_PRIMARY + " px-8 py-3 text-base shadow-lg disabled:opacity-50"}
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
                <Briefcase className="w-6 h-6 mr-2 text-emerald-600" /> Skills & Expertise
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">What areas can you mentor others in? <span className="font-semibold text-slate-700 dark:text-slate-300">Add one at a time.</span></p>

              <SkillsSelector
                selectedSkills={formData.skills}
                onSkillsChange={handleSkillsChange}
                placeholder="Select or type a skill (e.g., Product Strategy, Leadership)"
              />
            </div>
            
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(1)} className="px-6 py-3 text-slate-500 hover:text-slate-700 font-medium flex items-center">
                <ChevronLeft className="w-5 h-5 mr-1" /> Back
              </button>
              <button 
                onClick={() => setStep(3)} 
                disabled={formData.skills.length === 0}
                className={BUTTON_PRIMARY + " px-8 py-3 text-base shadow-lg disabled:opacity-50"}
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
                <MessageSquare className="w-6 h-6 mr-2 text-emerald-600" /> Your Story
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Help mentees understand who you are and what you can offer.</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bio</label>
                  <textarea 
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    className={INPUT_CLASS}
                    rows={5}
                    placeholder="Share your background, what you're passionate about, and how you can help mentees..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Availability</label>
                  <select 
                    value={formData.availability}
                    onChange={(e) => setFormData({...formData, availability: e.target.value})}
                    className={INPUT_CLASS}
                  >
                    <option value="">Select availability</option>
                    <option value="1-2">1-2 hours per month</option>
                    <option value="3-4">3-4 hours per month</option>
                    <option value="5+">5+ hours per month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Maximum Number of Mentees</label>
                  <select 
                    value={formData.maxMentees}
                    onChange={(e) => setFormData({...formData, maxMentees: e.target.value})}
                    className={INPUT_CLASS}
                  >
                    <option value="1">1 mentee</option>
                    <option value="2">2 mentees</option>
                    <option value="3">3 mentees</option>
                    <option value="4+">4+ mentees</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(2)} className="px-6 py-3 text-slate-500 hover:text-slate-700 font-medium flex items-center">
                <ChevronLeft className="w-5 h-5 mr-1" /> Back
              </button>
              <button 
                onClick={() => setStep(4)} 
                disabled={!formData.bio || !formData.availability}
                className={BUTTON_PRIMARY + " px-8 py-3 text-base shadow-lg disabled:opacity-50"}
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
                <Target className="w-6 h-6 mr-2 text-emerald-600" /> Mentorship Goals
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                What do you hope to achieve through mentoring? <span className="font-semibold text-slate-700 dark:text-slate-300">Add one goal at a time with a target date for better tracking.</span>
              </p>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Tip:</strong> Adding goals one at a time with specific target dates helps track your progress and measure success more effectively.
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
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGoal())}
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
            
            {!programSettings && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
                <div className="flex items-start">
                  <Sparkles className="w-5 h-5 text-emerald-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-emerald-900 dark:text-emerald-300 mb-1">You're all set!</h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      Once you complete onboarding, your profile will be visible to mentees. You'll be notified when someone requests mentorship.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(3)} className="px-6 py-3 text-slate-500 hover:text-slate-700 font-medium flex items-center">
                <ChevronLeft className="w-5 h-5 mr-1" /> Back
              </button>
              <button 
                onClick={() => programSettings ? setStep(5) : handleComplete()}
                className={BUTTON_PRIMARY + " px-8 py-3 text-base shadow-lg"}
              >
                {programSettings ? (
                  <>Next <ChevronRight className="w-5 h-5 ml-2" /></>
                ) : (
                  <>Complete Setup <Check className="w-5 h-5 ml-2" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 5 && programSettings && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className={CARD_CLASS}>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                <User className="w-6 h-6 mr-2 text-emerald-600" /> Organization Profile
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
                  <h3 className="font-bold text-emerald-900 dark:text-emerald-300 mb-1">Almost there!</h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    Once you complete these fields, your profile will be visible to mentees. You'll be notified when someone requests mentorship.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(4)} className="px-6 py-3 text-slate-500 hover:text-slate-700 font-medium flex items-center">
                <ChevronLeft className="w-5 h-5 mr-1" /> Back
              </button>
            </div>
          </div>
        )}

        {/* Completion Screen */}
        {(step === completionStep) && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className={CARD_CLASS + " text-center"}>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                Welcome, Mentor! 🎉
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                Your profile is now live and visible to mentees.
              </p>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 mb-8 text-left">
                <h3 className="font-bold text-emerald-900 dark:text-emerald-300 mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" /> What happens next?
                </h3>
                <ul className="space-y-3 text-sm text-emerald-800 dark:text-emerald-300">
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 mr-2 mt-0.5 shrink-0 text-emerald-600" />
                    <span>You'll receive notifications when mentees request mentorship with you</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 mr-2 mt-0.5 shrink-0 text-emerald-600" />
                    <span>Admins may match you with mentees based on your skills and availability</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 mr-2 mt-0.5 shrink-0 text-emerald-600" />
                    <span>Your profile will appear in mentor searches and matching suggestions</span>
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center mb-3">
                    <MessageSquare className="w-6 h-6 text-indigo-600 mr-2" />
                    <h4 className="font-semibold text-slate-900 dark:text-white">Connect with Peers</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Join the Mentors Circle to chat with other mentors and share experiences.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center mb-3">
                    <BookOpen className="w-6 h-6 text-emerald-600 mr-2" />
                    <h4 className="font-semibold text-slate-900 dark:text-white">Explore Resources</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Browse articles and guides to help you become an even better mentor.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center mb-3">
                    <Bell className="w-6 h-6 text-amber-600 mr-2" />
                    <h4 className="font-semibold text-slate-900 dark:text-white">Stay Updated</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Check your notifications regularly for mentorship requests and updates.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center mb-3">
                    <Calendar className="w-6 h-6 text-blue-600 mr-2" />
                    <h4 className="font-semibold text-slate-900 dark:text-white">Schedule Meetings</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Once matched, use the calendar to schedule sessions with your mentees.
                  </p>
                </div>
              </div>

              <button 
                onClick={handleComplete}
                className={BUTTON_PRIMARY + " px-8 py-3 text-base shadow-lg w-full md:w-auto"}
              >
                Go to Dashboard <ArrowRight className="w-5 h-5 ml-2 inline" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorOnboarding;

