
import React, { useState } from 'react';
import { User, Match, Role, MatchStatus } from '../types';
import { INPUT_CLASS } from '../styles/common';
import { Users, Search, X, CheckCircle, ArrowRight, Briefcase, GraduationCap, Sparkles, MessageSquare, Loader2, Repeat, Menu, Link2, Calendar } from 'lucide-react';
import { getMatchSuggestions } from '../services/geminiService';

interface MatchingProps {
  users: User[];
  matches: Match[];
  onCreateMatch: (mentorId: string, menteeId: string) => void;
}

type ViewMode = 'bench' | 'matches';

const Matching: React.FC<MatchingProps> = ({ users, matches, onCreateMatch }) => {
  const [selectedMenteeId, setSelectedMenteeId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('bench');

  const unmatchedMentees = users.filter(u => u.role === Role.MENTEE && !matches.find(m => m.menteeId === u.id && m.status === MatchStatus.ACTIVE));
  const mentors = users.filter(u => u.role === Role.MENTOR);
  const activeMatches = matches.filter(m => m.status === MatchStatus.ACTIVE);

  const selectedMentee = users.find(u => u.id === selectedMenteeId);

  const toggleViewMode = () => {
    setViewMode(viewMode === 'bench' ? 'matches' : 'bench');
    setSelectedMenteeId('');
    setAiSuggestions([]);
    setSearchTerm('');
  };

  const handleAiSuggest = async () => {
    if (!selectedMentee) return;
    setIsAiLoading(true);
    try {
      const suggestions = await getMatchSuggestions(selectedMentee, mentors);
      if (suggestions.length === 0) {
        // Show user-friendly message if no suggestions (likely API key missing)
        alert('AI suggestions are currently unavailable. Please ensure the API key is configured.');
      }
      setAiSuggestions(suggestions.map(s => s.mentorId));
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      alert('Failed to get AI suggestions. Please try again later.');
      setAiSuggestions([]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedMenteeId('');
    setAiSuggestions([]);
    setSearchTerm('');
  };

  const getCommonTags = (mentee: User, mentor: User) => {
    const menteeTags = [...(mentee.goals || []), ...(mentee.skills || [])].map(s => s.toLowerCase());
    const mentorTags = mentor.skills || [];
    const common = mentorTags.filter(skill => 
      menteeTags.some(goal => goal.includes(skill.toLowerCase()) || skill.toLowerCase().includes(goal))
    );
    return common;
  };

  const filteredMentors = mentors.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  }).sort((a, b) => {
    if (aiSuggestions.length > 0) {
      const aSuggested = aiSuggestions.includes(a.id);
      const bSuggested = aiSuggestions.includes(b.id);
      if (aSuggested && !bSuggested) return -1;
      if (!aSuggested && bSuggested) return 1;
    }
    return 0;
  });

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] sm:h-[calc(100vh-6rem)] md:h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 -m-3 sm:-m-4 md:-m-8 relative">
      {/* Mobile Menu Button */}
      {!selectedMenteeId && (
        <div className="md:hidden p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-white flex items-center text-sm">
            {viewMode === 'bench' ? (
              <>
                <Users className="w-4 h-4 mr-2 text-slate-500" />
                The Bench <span className="ml-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs">{unmatchedMentees.length}</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2 text-slate-500" />
                Active Matches <span className="ml-2 bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full text-xs">{activeMatches.length}</span>
              </>
            )}
          </h2>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-400"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`w-full md:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 md:z-10 shadow-sm absolute md:relative inset-0 md:inset-auto transform transition-transform duration-200 ${isMobileMenuOpen || selectedMenteeId ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white flex items-center text-sm sm:text-base">
                {viewMode === 'bench' ? (
                  <>
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-slate-500" />
                    The Bench <span className="ml-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs">{unmatchedMentees.length}</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-slate-500" />
                    Active Matches <span className="ml-2 bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full text-xs">{activeMatches.length}</span>
                  </>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-1 hidden sm:block">
                {viewMode === 'bench' ? 'Select a mentee to start matching' : 'View existing mentor-mentee pairs'}
              </p>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-1 text-slate-600 dark:text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('bench')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'bench'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Users className="w-3 h-3 inline mr-1" />
              Bench
            </button>
            <button
              onClick={() => setViewMode('matches')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'matches'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Link2 className="w-3 h-3 inline mr-1" />
              Matches
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {viewMode === 'bench' ? (
            <>
              {unmatchedMentees.map(mentee => (
            <button
              key={mentee.id}
              onClick={() => { 
                setSelectedMenteeId(mentee.id); 
                setAiSuggestions([]);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group relative ${
                selectedMenteeId === mentee.id 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-md ring-1 ring-emerald-500' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <img src={mentee.avatar} className="w-10 h-10 rounded-full object-cover border border-slate-100 dark:border-slate-600" alt="" />
                <div className="min-w-0">
                  <p className={`font-semibold text-sm truncate ${selectedMenteeId === mentee.id ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>{mentee.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{mentee.title}</p>
                </div>
              </div>
              {selectedMenteeId === mentee.id && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                   <ArrowRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              )}
            </button>
          ))}
          {unmatchedMentees.length === 0 && (
             <div className="text-center py-10 px-4">
                <CheckCircle className="w-10 h-10 text-emerald-200 dark:text-emerald-800 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">All mentees matched!</p>
             </div>
          )}
            </>
          ) : (
            <>
              {activeMatches.map(match => {
                const mentor = users.find(u => u.id === match.mentorId);
                const mentee = users.find(u => u.id === match.menteeId);
                if (!mentor || !mentee) return null;
                
                return (
                  <div
                    key={match.id}
                    className="w-full p-3 rounded-xl border bg-white dark:bg-slate-800 border-emerald-200 dark:border-slate-700 hover:border-emerald-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex -space-x-2">
                        <img src={mentor.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800" alt={mentor.name} />
                        <img src={mentee.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800" alt={mentee.name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
                          {mentor.name.split(' ')[0]} ↔ {mentee.name.split(' ')[0]}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(match.startDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                      {match.notes && (
                        <span className="text-slate-500 dark:text-slate-400 truncate flex-1">
                          {match.notes}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {activeMatches.length === 0 && (
                <div className="text-center py-10 px-4">
                  <Link2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No active matches yet</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 relative">
        {selectedMentee ? (
          <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8">
            <div className="flex justify-between items-start gap-4">
               <div className="min-w-0 flex-1">
                 <div className="flex items-center gap-2 mb-2">
                   <button 
                     onClick={() => setIsMobileMenuOpen(true)} 
                     className="md:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                   >
                     <Menu className="w-5 h-5" />
                   </button>
                   <button
                     onClick={toggleViewMode}
                     className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-2"
                   >
                     <Link2 className="w-5 h-5 sm:w-6 sm:h-6" />
                     Create a Bridge
                   </button>
                 </div>
                 <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Find the perfect mentor for {selectedMentee.name.split(' ')[0]}</p>
               </div>
               <button onClick={clearSelection} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 flex-shrink-0">
                 <X className="w-5 h-5 sm:w-6 sm:h-6" />
               </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-emerald-100 dark:border-slate-700 p-6 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
               <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0 text-center md:text-left">
                     <img src={selectedMentee.avatar} className="w-24 h-24 rounded-full mx-auto md:mx-0 border-4 border-emerald-50 dark:border-slate-800" alt="" />
                     <div className="mt-3">
                       <span className="inline-block bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 text-xs px-2 py-1 rounded-full font-semibold">Mentee</span>
                     </div>
                  </div>
                  <div className="flex-1 space-y-4">
                     <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedMentee.name}</h3>
                        <div className="flex flex-wrap gap-x-4 text-sm text-slate-500 dark:text-slate-400 mt-1">
                           <span className="flex items-center"><Briefcase className="w-3.5 h-3.5 mr-1" /> {selectedMentee.title}</span>
                           <span className="flex items-center"><GraduationCap className="w-3.5 h-3.5 mr-1" /> {selectedMentee.company}</span>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                           <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Goals & Focus</h4>
                           {selectedMentee.goalsPublic !== false && selectedMentee.goals && selectedMentee.goals.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                 {selectedMentee.goals.map(g => (
                                    <span key={g} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-2 py-1 rounded text-xs shadow-sm">
                                       {g}
                                    </span>
                                 ))}
                              </div>
                           ) : (
                              <p className="text-sm text-slate-400 dark:text-slate-500 italic">Goals are private</p>
                           )}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                           <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bio</h4>
                           <p className="text-sm text-slate-600 dark:text-slate-300 italic line-clamp-3">"{selectedMentee.bio}"</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex items-center justify-center">
               <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
               <span className="px-4 text-slate-400 text-sm font-medium uppercase tracking-widest">Available Mentors</span>
               <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
               <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search mentors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={INPUT_CLASS + " pl-10"}
                  />
               </div>
               <button 
                 onClick={handleAiSuggest}
                 disabled={isAiLoading}
                 className={`px-4 py-2 rounded-xl border flex items-center justify-center transition-all text-sm whitespace-nowrap ${
                   aiSuggestions.length > 0 
                    ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-300'
                 }`}
               >
                 {isAiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                 <span className="hidden sm:inline">{aiSuggestions.length > 0 ? 'AI Suggestions Active' : 'Provide suggestions'}</span>
                 <span className="sm:hidden">{aiSuggestions.length > 0 ? 'AI Active' : 'AI Suggest'}</span>
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {filteredMentors.map(mentor => {
                  const commonTags = getCommonTags(selectedMentee, mentor);
                  const isSuggested = aiSuggestions.includes(mentor.id);
                  
                  return (
                    <div key={mentor.id} className={`bg-white dark:bg-slate-900 p-5 rounded-xl border transition-all hover:shadow-md group flex flex-col ${
                      isSuggested ? 'border-violet-300 dark:border-violet-700 shadow-sm ring-1 ring-violet-100 dark:ring-violet-900' : 'border-slate-300 dark:border-slate-800'
                    }`}>
                       <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center">
                             <img src={mentor.avatar} className="w-12 h-12 rounded-full mr-3 object-cover" alt="" />
                             <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">{mentor.name}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{mentor.title} @ {mentor.company}</p>
                             </div>
                          </div>
                          {isSuggested && <span className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center"><Sparkles className="w-3 h-3 mr-1"/> Best Fit</span>}
                       </div>
                       
                       <div className="mb-4 flex-1">
                          <p className="text-xs text-slate-400 uppercase font-semibold mb-1.5">Specialties & Skills</p>
                          <div className="flex flex-wrap gap-1.5">
                             {mentor.skills.map(skill => {
                               const isMatch = commonTags.includes(skill);
                               return (
                                 <span key={skill} className={`text-xs px-2 py-1 rounded border ${
                                   isMatch 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 font-medium dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                                    : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                 }`}>
                                   {skill}
                                 </span>
                               )
                             })}
                          </div>
                       </div>
                       
                       <div className="mt-auto pt-3 border-t border-slate-50 dark:border-slate-800 flex gap-2">
                          <button 
                             onClick={() => {
                               if (window.confirm(`Are you sure you want to connect ${mentor.name} with ${selectedMentee.name}?`)) {
                                 onCreateMatch(mentor.id, selectedMentee.id);
                               }
                             }}
                             className="flex-1 bg-slate-900 dark:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors flex items-center justify-center"
                          >
                             Connect
                          </button>
                          <button className="px-3 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                             <MessageSquare className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  )
               })}
               {filteredMentors.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                     <p>No mentors found matching your search.</p>
                  </div>
               )}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
             <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                {viewMode === 'bench' ? (
                  <Repeat className="w-10 h-10 opacity-30" />
                ) : (
                  <Link2 className="w-10 h-10 opacity-30" />
                )}
             </div>
             <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
               {viewMode === 'bench' ? 'Ready to Match' : 'Active Matches'}
             </h2>
             <p className="text-center max-w-sm mb-6">
               {viewMode === 'bench' 
                 ? 'Select a participant from the "Bench" on the left to view their profile and find a compatible mentor.'
                 : 'Click "Create a Bridge" above to toggle between viewing matches and the bench, or select a match from the sidebar to view details.'}
             </p>
             <button
               onClick={toggleViewMode}
               className="flex items-center gap-2 text-sm bg-white dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
             >
               {viewMode === 'bench' ? (
                 <>
                   <Link2 className="w-4 h-4" />
                   <span>View Matches</span>
                 </>
               ) : (
                 <>
                   <Users className="w-4 h-4" />
                   <span>View Bench</span>
                 </>
               )}
             </button>
             {viewMode === 'bench' && (
               <div className="flex items-center gap-2 text-sm bg-white dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm mt-3">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  <span>Suggestions available</span>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Matching;
