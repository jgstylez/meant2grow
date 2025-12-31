import React, { useState } from 'react';
import { User, Role, Invitation } from '../types';
import { INPUT_CLASS, BUTTON_PRIMARY, CARD_CLASS } from '../styles/common';
import { ArrowLeft, Send, Mail, UserPlus, Upload, FileText, CheckCircle, Clock, X, Eye, Copy, Check, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { createInvitation, getInvitation } from '../services/database';

interface ReferralsProps {
  currentUser: User;
  onNavigate: (page: string) => void;
  onSendInvite: (invite: any) => void;
  existingInvitations: Invitation[];
  organizationCode?: string;
  organizationId?: string;
}

const Referrals: React.FC<ReferralsProps> = ({ currentUser, onNavigate, onSendInvite, existingInvitations, organizationCode, organizationId }) => {
  const [activeTab, setActiveTab] = useState<'invite' | 'bulk' | 'track'>('invite');
  const [copied, setCopied] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [orgSignupLink, setOrgSignupLink] = useState<string | null>(null);
  
  // Single Invite State
  const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      role: 'Mentee',
      personalNote: ''
  });
  const [showPreview, setShowPreview] = useState(false);

  // Bulk Upload State
  const [dragActive, setDragActive] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  const handleSendInvite = () => {
     onSendInvite({
         email: formData.email,
         name: `${formData.firstName} ${formData.lastName}`,
         role: formData.role.toUpperCase() as Role,
         sentDate: new Date().toISOString()
     });
     setFormData({ firstName: '', lastName: '', email: '', role: 'Mentee', personalNote: '' });
     setShowPreview(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setBulkFile(e.dataTransfer.files[0]);
    }
  };

  const handleCopyCode = () => {
    if (organizationCode) {
      navigator.clipboard.writeText(organizationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateLink = async () => {
    if (!formData.email || !organizationId) {
      return;
    }

    setIsGeneratingLink(true);
    try {
      // Create invitation to get the link
      const invitationId = await createInvitation({
        organizationId,
        name: `${formData.firstName} ${formData.lastName}`.trim() || "Test User",
        email: formData.email.toLowerCase(),
        role: formData.role.toUpperCase() as Role,
        status: "Pending",
        sentDate: new Date().toISOString().split("T")[0],
        inviterId: currentUser.id,
      });

      // Get the created invitation to retrieve the link
      const createdInvitation = await getInvitation(invitationId);
      if (createdInvitation?.invitationLink) {
        setGeneratedLink(createdInvitation.invitationLink);
      }
    } catch (error) {
      console.error("Error generating link:", error);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyGeneratedLink = async () => {
    if (generatedLink) {
      try {
        await navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const handleGenerateOrgSignupLink = () => {
    if (organizationCode) {
      const appUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : (import.meta.env.VITE_APP_URL || 'https://meant2grow.com');
      const link = `${appUrl}/?orgCode=${organizationCode}`;
      setOrgSignupLink(link);
    }
  };

  const handleCopyOrgSignupLink = async () => {
    if (orgSignupLink) {
      try {
        await navigator.clipboard.writeText(orgSignupLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const InvitePreviewModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full mx-4 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center">
                      <Mail className="w-4 h-4 mr-2" /> Invitation Preview
                  </h3>
                  <button onClick={() => setShowPreview(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="p-8 bg-slate-50 dark:bg-slate-900">
                  <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-4">
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                          <p className="text-xs text-slate-400 uppercase font-bold mb-1">Subject</p>
                          <p className="text-slate-800 dark:text-white font-medium">You've been invited to join Meant2Grow!</p>
                      </div>
                      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                          <p>Hi <strong>{formData.firstName || 'Future Member'}</strong>,</p>
                          <p>
                              <strong>{currentUser.name}</strong> thinks you would be a great addition to the Meant2Grow community as a <strong>{formData.role}</strong>.
                          </p>
                          {formData.personalNote && (
                              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg italic text-slate-700 dark:text-emerald-100 border-l-4 border-emerald-500">
                                  "{formData.personalNote}"
                              </div>
                          )}
                          <p>Join us to connect with industry leaders, track your career goals, and advance your professional growth.</p>
                          <div className="pt-4 pb-2">
                              <button className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold w-full shadow-lg">Accept Invitation</button>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium">Edit</button>
                  <button onClick={handleSendInvite} className={BUTTON_PRIMARY}><Send className="w-4 h-4 mr-2" /> Send Invitation</button>
              </div>
          </div>
      </div>
  );

  return (
      <div className="space-y-6 animate-in fade-in">
          {showPreview && <InvitePreviewModal />}
          
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                  <button onClick={() => onNavigate(currentUser.role === Role.ADMIN ? 'participants' : 'dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"><ArrowLeft className="w-5 h-5"/></button>
                  <div>
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Grow the Community</h1>
                      <p className="text-slate-500 dark:text-slate-400">Invite colleagues and peers to join the mentorship program.</p>
                  </div>
              </div>
          </div>

          {/* Organization Code Card */}
          {organizationCode && (
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2 flex items-center">
                    <UserPlus className="w-5 h-5 mr-2" /> Organization Invite Code
                  </h3>
                  <p className="text-emerald-50 text-sm mb-4">
                    Share this code with colleagues to let them join your organization directly. They'll be able to choose their own role (Mentor or Mentee).
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 font-mono text-2xl font-bold tracking-wider">
                      {organizationCode}
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-5 h-5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5" />
                          Copy Code
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Organization Signup Link */}
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-emerald-50 text-sm mb-3">
                      Or generate a direct signup link (users choose their own role):
                    </p>
                    {orgSignupLink ? (
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-center gap-2">
                        <a
                          href={orgSignupLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-white hover:text-emerald-100 underline flex-1 truncate"
                          title={orgSignupLink}
                        >
                          {orgSignupLink.length > 50 ? `${orgSignupLink.substring(0, 50)}...` : orgSignupLink}
                        </a>
                        <button
                          onClick={handleCopyOrgSignupLink}
                          className="text-white hover:text-emerald-100 transition-colors"
                          title="Copy link"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-emerald-200" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleGenerateOrgSignupLink}
                        className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Generate Signup Link
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button onClick={() => setActiveTab('invite')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'invite' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Send Invitation</button>
              <button onClick={() => setActiveTab('bulk')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'bulk' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Bulk Upload</button>
              <button onClick={() => setActiveTab('track')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'track' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Track Invitations</button>
          </div>

          {activeTab === 'invite' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                      <div className={CARD_CLASS}>
                          <h3 className="font-bold text-lg mb-6 flex items-center text-slate-800 dark:text-white">
                              <Mail className="w-5 h-5 mr-2 text-emerald-500" /> Invitation Details
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">First Name</label>
                                  <input className={INPUT_CLASS} placeholder="Jane" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Name</label>
                                  <input className={INPUT_CLASS} placeholder="Doe" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                              </div>
                          </div>
                          <div className="mb-4">
                              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address <span className="text-red-500">*</span></label>
                              <input type="email" className={INPUT_CLASS} placeholder="colleague@company.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                          </div>
                          <div className="mb-6">
                              <label className="block text-xs font-semibold text-slate-500 uppercase mb-3">Inviting as</label>
                              <div className="grid grid-cols-2 gap-4">
                                  <div 
                                    onClick={() => setFormData({...formData, role: 'Mentee'})}
                                    className={`cursor-pointer border rounded-xl p-4 flex items-center space-x-3 transition-all ${formData.role === 'Mentee' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'}`}
                                  >
                                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.role === 'Mentee' ? 'border-emerald-500' : 'border-slate-300'}`}>
                                          {formData.role === 'Mentee' && <div className="w-3 h-3 bg-emerald-500 rounded-full" />}
                                      </div>
                                      <div>
                                          <p className="font-bold text-sm text-slate-800 dark:text-white">Mentee</p>
                                          <p className="text-xs text-slate-500">Looking for guidance</p>
                                      </div>
                                  </div>
                                  <div 
                                    onClick={() => setFormData({...formData, role: 'Mentor'})}
                                    className={`cursor-pointer border rounded-xl p-4 flex items-center space-x-3 transition-all ${formData.role === 'Mentor' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'}`}
                                  >
                                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.role === 'Mentor' ? 'border-emerald-500' : 'border-slate-300'}`}>
                                          {formData.role === 'Mentor' && <div className="w-3 h-3 bg-emerald-500 rounded-full" />}
                                      </div>
                                      <div>
                                          <p className="font-bold text-slate-800 dark:text-white">Mentor</p>
                                          <p className="text-xs text-slate-500">Sharing experience</p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="mb-6">
                              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Personal Note (Optional)</label>
                              <textarea 
                                className={INPUT_CLASS} 
                                rows={3} 
                                placeholder="Add a personal touch..." 
                                value={formData.personalNote}
                                onChange={e => setFormData({...formData, personalNote: e.target.value})}
                              />
                          </div>
                          
                          {/* Generated Link Display */}
                          {generatedLink && (
                              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                                  <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                          <LinkIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                          <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase">Invitation Link</label>
                                      </div>
                                      <button
                                          onClick={handleCopyGeneratedLink}
                                          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
                                          title="Copy link"
                                      >
                                          {copied ? (
                                              <Check className="w-5 h-5 text-emerald-600" />
                                          ) : (
                                              <Copy className="w-5 h-5" />
                                          )}
                                      </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <a
                                          href={generatedLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 flex-1 truncate"
                                          title={generatedLink}
                                      >
                                          {generatedLink}
                                          <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                      </a>
                                  </div>
                                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                                      Click the link above to test it, or copy it to share manually.
                                  </p>
                              </div>
                          )}

                          <div className="flex items-center justify-end gap-3">
                              <button 
                                  onClick={handleGenerateLink} 
                                  disabled={!formData.email || isGeneratingLink || !organizationId} 
                                  className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center disabled:opacity-50"
                              >
                                  <LinkIcon className="w-4 h-4 mr-2" /> 
                                  {isGeneratingLink ? 'Generating...' : 'Generate Link'}
                              </button>
                              <button onClick={() => setShowPreview(true)} disabled={!formData.email} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center disabled:opacity-50">
                                  <Eye className="w-4 h-4 mr-2" /> Preview
                              </button>
                              <button onClick={handleSendInvite} disabled={!formData.email} className={BUTTON_PRIMARY}>
                                  <Send className="w-4 h-4 mr-2" /> Send Invitation
                              </button>
                          </div>
                      </div>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="bg-emerald-900 text-white rounded-xl p-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
                          <h3 className="font-bold text-lg mb-2 relative z-10">Why Invite Others?</h3>
                          <ul className="space-y-3 text-sm text-emerald-100 relative z-10">
                              <li className="flex items-start"><CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-emerald-400" /> Build a stronger support network for everyone.</li>
                              <li className="flex items-start"><CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-emerald-400" /> Help colleagues find the mentorship they need.</li>
                              <li className="flex items-start"><CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-emerald-400" /> Earn community badges for being a connector.</li>
                          </ul>
                      </div>
                      
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                          <h3 className="font-bold text-slate-800 dark:text-white mb-4">Quick Tips</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                              <strong>Personalize it:</strong> Adding a personal note increases acceptance rates by 40%.
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                              <strong>Follow up:</strong> If they don't accept within a week, send a gentle reminder.
                          </p>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'bulk' && (
               <div className={CARD_CLASS + " text-center py-12"}>
                  <div 
                    className={`border-2 border-dashed rounded-xl p-10 transition-colors ${dragActive ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-700'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Upload CSV File</h3>
                      <p className="text-slate-500 mb-6 max-w-sm mx-auto">Drag and drop your CSV file here, or click to browse. Max 100 contacts per upload.</p>
                      
                      {bulkFile ? (
                          <div className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 py-2 px-4 rounded-lg inline-block text-emerald-700 dark:text-emerald-300 font-medium mb-6">
                              <FileText className="w-4 h-4" /> {bulkFile.name}
                              <button onClick={(e) => {e.stopPropagation(); setBulkFile(null);}} className="ml-2 hover:text-red-500"><X className="w-4 h-4" /></button>
                          </div>
                      ) : (
                          <button className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors">Browse Files</button>
                      )}
                      
                      <p className="text-xs text-slate-400 mt-6">Template format: Name, Email, Role (Mentee/Mentor)</p>
                  </div>
               </div>
          )}

          {activeTab === 'track' && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold text-slate-500">
                          <tr>
                              <th className="px-6 py-4">Recipient</th>
                              <th className="px-6 py-4">Role</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Sent Date</th>
                              <th className="px-6 py-4">Invitation Link</th>
                              <th className="px-6 py-4 text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {existingInvitations.map(inv => {
                              const handleCopyLink = async () => {
                                  if (inv.invitationLink) {
                                      try {
                                          await navigator.clipboard.writeText(inv.invitationLink);
                                          setCopiedLinkId(inv.id);
                                          setTimeout(() => setCopiedLinkId(null), 2000);
                                      } catch (err) {
                                          console.error('Failed to copy link:', err);
                                      }
                                  }
                              };
                              
                              return (
                                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                      <td className="px-6 py-4">
                                          <div className="font-medium text-slate-900 dark:text-white">{inv.name}</div>
                                          <div className="text-xs text-slate-500">{inv.email}</div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-300">{inv.role}</span>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                              inv.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                              inv.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                                              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                          }`}>
                                              {inv.status === 'Accepted' && <CheckCircle className="w-3 h-3 mr-1" />}
                                              {inv.status === 'Pending' && <Clock className="w-3 h-3 mr-1" />}
                                              {inv.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{inv.sentDate}</td>
                                      <td className="px-6 py-4">
                                          {inv.invitationLink ? (
                                              <div className="flex items-center gap-2">
                                                  <a
                                                      href={inv.invitationLink}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline truncate max-w-xs"
                                                      title={inv.invitationLink}
                                                  >
                                                      {inv.invitationLink.length > 40 
                                                          ? `${inv.invitationLink.substring(0, 40)}...` 
                                                          : inv.invitationLink}
                                                  </a>
                                                  <button
                                                      onClick={handleCopyLink}
                                                      className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                                      title="Copy link"
                                                  >
                                                      {copiedLinkId === inv.id ? (
                                                          <Check className="w-4 h-4 text-emerald-600" />
                                                      ) : (
                                                          <Copy className="w-4 h-4" />
                                                      )}
                                                  </button>
                                              </div>
                                          ) : (
                                              <span className="text-xs text-slate-400 italic">No link available</span>
                                          )}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          {inv.status === 'Pending' && (
                                              <button className="text-emerald-600 hover:text-emerald-700 text-xs font-medium hover:underline">Resend</button>
                                          )}
                                      </td>
                                  </tr>
                              );
                          })}
                          {existingInvitations.length === 0 && (
                              <tr>
                                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No invitations sent yet.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          )}
      </div>
  );
};

export default Referrals;