import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Role, Invitation } from '../types';
import { INPUT_CLASS, BUTTON_PRIMARY, CARD_CLASS } from '../styles/common';
import { ArrowLeft, Send, Mail, UserPlus, Upload, FileText, CheckCircle, Clock, X, Eye, Copy, Check, Link as LinkIcon, ExternalLink, Pencil, Download } from 'lucide-react';
import { createInvitation, getInvitation, getInvitationByEmail, checkOrganizationCodeAvailable } from '../services/database';

// Organization code constraints (for security/UX) - avoid confusing chars: 0,O,1,I,L
const ORG_CODE_MIN = 4;
const ORG_CODE_MAX = 8;
const ORG_CODE_SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const CSV_TEMPLATE = 'First Name,Last Name,Email,Role\nJane,Doe,jane@example.com,Mentee';
const MAX_BULK_CONTACTS = 100;

interface ReferralsProps {
  currentUser: User;
  onNavigate: (page: string) => void;
  onSendInvite: (invite: any) => void;
  existingInvitations: Invitation[];
  /** Used for duplicate-invite messaging and track-tab resend feedback */
  addToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  organizationCode?: string;
  organizationId?: string;
  onUpdateOrganizationCode?: (newCode: string) => Promise<void>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Referrals: React.FC<ReferralsProps> = ({ currentUser, onNavigate, onSendInvite, existingInvitations, addToast, organizationCode, organizationId, onUpdateOrganizationCode }) => {
  const [activeTab, setActiveTab] = useState<'invite' | 'bulk' | 'track'>('invite');
  const [showChangeCodeModal, setShowChangeCodeModal] = useState(false);
  const [newCodeInput, setNewCodeInput] = useState('');
  const [changeCodeError, setChangeCodeError] = useState('');
  const [isChangingCode, setIsChangingCode] = useState(false);
  // Separate copied state for each copy button to prevent all showing "Copied!" simultaneously
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedOrgSignupLink, setCopiedOrgSignupLink] = useState(false);
  const [copiedGeneratedLink, setCopiedGeneratedLink] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedInvitationId, setGeneratedInvitationId] = useState<string | null>(null);
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

  /** Debounced email for duplicate checks against the same data as Track Invitations */
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [emailInvite, setEmailInvite] = useState<Invitation | null>(null);
  const [emailInviteLoading, setEmailInviteLoading] = useState(false);
  const [resendAcknowledged, setResendAcknowledged] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedEmail(formData.email.trim().toLowerCase()), 400);
    return () => clearTimeout(t);
  }, [formData.email]);

  useEffect(() => {
    setResendAcknowledged(false);
  }, [debouncedEmail]);

  useEffect(() => {
    if (!debouncedEmail || !organizationId || !EMAIL_RE.test(debouncedEmail)) {
      setEmailInvite(null);
      setEmailInviteLoading(false);
      return;
    }
    let cancelled = false;
    setEmailInviteLoading(true);
    (async () => {
      try {
        const inv = await getInvitationByEmail(debouncedEmail, organizationId);
        if (!cancelled) setEmailInvite(inv);
      } catch {
        if (!cancelled) setEmailInvite(null);
      } finally {
        if (!cancelled) setEmailInviteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedEmail, organizationId]);

  const isAcceptedInvite = emailInvite?.status === 'Accepted';
  const isPendingOrExpiredDuplicate = useMemo(
    () =>
      !!emailInvite &&
      (emailInvite.status === 'Pending' || emailInvite.status === 'Expired'),
    [emailInvite]
  );

  const sendInviteDisabled =
    !formData.email ||
    !organizationId ||
    emailInviteLoading ||
    isAcceptedInvite ||
    (isPendingOrExpiredDuplicate && !resendAcknowledged);

  // Bulk Upload State
  const [dragActive, setDragActive] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendInvite = async () => {
    // Validate required data before proceeding
    if (!formData.email) {
      console.error("Email is required");
      return;
    }

    if (organizationId) {
      try {
        const latest = await getInvitationByEmail(formData.email.toLowerCase(), organizationId);
        if (latest?.status === 'Accepted') {
          addToast?.('This email has already accepted an invitation.', 'error');
          return;
        }
        if (
          latest &&
          (latest.status === 'Pending' || latest.status === 'Expired') &&
          !resendAcknowledged
        ) {
          addToast?.(
            'This email already has a pending invitation. Click "Send another email" above to resend.',
            'info'
          );
          return;
        }
      } catch (e) {
        console.error('Error checking invitation status:', e);
      }
    }

    // Note: organizationId validation happens in App.tsx's handleSendInvite
    // which will show a user-friendly error toast if data is not loaded

    // If we already generated a link, reuse that invitation
    if (generatedInvitationId) {
      onSendInvite({
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`,
        role: formData.role.toUpperCase() as Role,
        sentDate: new Date().toISOString(),
        invitationId: generatedInvitationId, // Pass the existing invitation ID
        personalNote: formData.personalNote,
      });
      // Clear the generated link state since we're sending it
      setGeneratedLink(null);
      setGeneratedInvitationId(null);
      setFormData({ firstName: '', lastName: '', email: '', role: 'Mentee', personalNote: '' });
      setShowPreview(false);
      return;
    }

    // Check if there's already an existing invitation for this email
    if (formData.email && organizationId) {
      try {
        const existingInvitation = await getInvitationByEmail(formData.email.toLowerCase(), organizationId);
        if (existingInvitation) {
          // Reuse existing invitation
          onSendInvite({
            email: formData.email,
            name: `${formData.firstName} ${formData.lastName}`,
            role: formData.role.toUpperCase() as Role,
            sentDate: new Date().toISOString(),
            invitationId: existingInvitation.id,
            personalNote: formData.personalNote,
          });
          setFormData({ firstName: '', lastName: '', email: '', role: 'Mentee', personalNote: '' });
          setShowPreview(false);
          return;
        }
      } catch (error) {
        console.error("Error checking for existing invitation:", error);
        // Continue to create new invitation if check fails
      }
    }

    // No existing invitation found, create a new one
    onSendInvite({
      email: formData.email,
      name: `${formData.firstName} ${formData.lastName}`,
      role: formData.role.toUpperCase() as Role,
      sentDate: new Date().toISOString(),
      personalNote: formData.personalNote,
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
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.csv')) {
        setBulkFile(file);
        setBulkUploadResult(null);
      }
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'invitations_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      setBulkFile(file);
      setBulkUploadResult(null);
    }
    e.target.value = '';
  };

  const parseCSV = (text: string): { firstName: string; lastName: string; email: string; role: string }[] => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 1) return [];
    const header = lines[0].toLowerCase();
    const isHeader = header.includes('first') && (header.includes('last') || header.includes('name')) && header.includes('email') && header.includes('role');
    const dataLines = isHeader ? lines.slice(1) : lines;
    const result: { firstName: string; lastName: string; email: string; role: string }[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRoles = ['mentee', 'mentor'];

    for (let i = 0; i < dataLines.length && result.length < MAX_BULK_CONTACTS; i++) {
      const line = dataLines[i];
      const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
      if (parts.length >= 4) {
        const [firstName, lastName, email, role] = parts;
        const roleNorm = (role || '').toLowerCase();
        if (email && emailRegex.test(email) && validRoles.includes(roleNorm)) {
          result.push({
            firstName: (firstName || '').trim(),
            lastName: (lastName || '').trim(),
            email: email.trim().toLowerCase(),
            role: roleNorm.charAt(0).toUpperCase() + roleNorm.slice(1),
          });
        }
      }
    }
    return result;
  };

  const handleBulkUpload = async () => {
    if (!bulkFile || !organizationId) return;
    setIsBulkUploading(true);
    setBulkUploadResult(null);
    const errors: string[] = [];
    let sent = 0;

    try {
      const text = await bulkFile.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setBulkUploadResult({ sent: 0, failed: 0, errors: ['No valid rows found. Use format: First Name, Last Name, Email, Role (Mentee or Mentor)'] });
        setIsBulkUploading(false);
        return;
      }
      if (rows.length > MAX_BULK_CONTACTS) {
        setBulkUploadResult({ sent: 0, failed: rows.length, errors: [`Only the first ${MAX_BULK_CONTACTS} contacts will be processed.`] });
      }

      for (let i = 0; i < Math.min(rows.length, MAX_BULK_CONTACTS); i++) {
        const row = rows[i];
        try {
          await onSendInvite({
            email: row.email,
            name: `${row.firstName} ${row.lastName}`.trim() || 'Unknown',
            role: row.role.toUpperCase() as Role,
            sentDate: new Date().toISOString(),
          });
          sent++;
        } catch (err) {
          errors.push(`Row ${i + 1} (${row.email}): ${err instanceof Error ? err.message : 'Failed'}`);
        }
      }

      setBulkUploadResult({
        sent,
        failed: Math.min(rows.length, MAX_BULK_CONTACTS) - sent,
        errors: errors.slice(0, 10),
      });
      if (sent > 0) {
        setBulkFile(null);
      }
    } catch (err) {
      setBulkUploadResult({
        sent: 0,
        failed: 1,
        errors: [err instanceof Error ? err.message : 'Failed to read CSV file'],
      });
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleCopyCode = () => {
    if (organizationCode) {
      navigator.clipboard.writeText(organizationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleGenerateLink = async () => {
    if (!formData.email || !organizationId) {
      return;
    }

    setIsGeneratingLink(true);
    try {
      // Check if there's already an existing invitation for this email
      const existingInvitation = await getInvitationByEmail(formData.email.toLowerCase(), organizationId);

      if (existingInvitation?.status === 'Accepted') {
        addToast?.('This email has already accepted an invitation.', 'error');
        setIsGeneratingLink(false);
        return;
      }
      
      if (existingInvitation) {
        // Reuse existing invitation
        setGeneratedInvitationId(existingInvitation.id);
        if (existingInvitation.invitationLink) {
          setGeneratedLink(existingInvitation.invitationLink);
        }
        setIsGeneratingLink(false);
        return;
      }

      // Create new invitation to get the link
      const invitationId = await createInvitation({
        organizationId,
        name: `${formData.firstName} ${formData.lastName}`.trim() || "Test User",
        email: formData.email.toLowerCase(),
        role: formData.role.toUpperCase() as Role,
        status: "Pending",
        sentDate: new Date().toISOString().split("T")[0],
        inviterId: currentUser.id,
      });

      // Store the invitation ID for reuse
      setGeneratedInvitationId(invitationId);

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
        setCopiedGeneratedLink(true);
        setTimeout(() => setCopiedGeneratedLink(false), 2000);
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
        setCopiedOrgSignupLink(true);
        setTimeout(() => setCopiedOrgSignupLink(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const handleResendFromTrack = (inv: Invitation) => {
    addToast?.('Resending invitation…', 'info');
    void onSendInvite({
      email: inv.email,
      name: inv.name,
      role: inv.role,
      sentDate: new Date().toISOString(),
      invitationId: inv.id,
      isResend: true,
    });
  };

  const validateOrgCode = (raw: string): string | null => {
    const s = raw.trim().toUpperCase();
    if (!s) return 'Code is required';
    if (s.length < ORG_CODE_MIN) return `Min ${ORG_CODE_MIN} characters`;
    if (s.length > ORG_CODE_MAX) return `Max ${ORG_CODE_MAX} characters`;
    const invalid = [...s].find((c) => !ORG_CODE_SAFE_CHARS.includes(c));
    if (invalid) return `Use only A–Z and 2–9 (no 0, 1, I, O, L)`;
    return null;
  };

  const handleOpenChangeCode = () => {
    setNewCodeInput(organizationCode || '');
    setChangeCodeError('');
    setShowChangeCodeModal(true);
  };

  const handleSaveNewCode = async () => {
    if (!onUpdateOrganizationCode || !organizationId) return;
    const err = validateOrgCode(newCodeInput);
    if (err) {
      setChangeCodeError(err);
      return;
    }
    const normalized = newCodeInput.trim().toUpperCase();
    if (normalized === organizationCode) {
      setShowChangeCodeModal(false);
      return;
    }
    setIsChangingCode(true);
    setChangeCodeError('');
    try {
      const available = await checkOrganizationCodeAvailable(normalized, organizationId);
      if (!available) {
        setChangeCodeError('Code already in use by another organization');
        return;
      }
      await onUpdateOrganizationCode(normalized);
      setShowChangeCodeModal(false);
    } catch (e) {
      setChangeCodeError(e instanceof Error ? e.message : 'Failed to update code');
    } finally {
      setIsChangingCode(false);
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
                  <button onClick={handleSendInvite} disabled={sendInviteDisabled} className={BUTTON_PRIMARY}><Send className="w-4 h-4 mr-2" /> Send Invitation</button>
              </div>
          </div>
      </div>
  );

  const ChangeCodeModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center">
            <Pencil className="w-4 h-4 mr-2" /> Customize Invite Code
          </h3>
          <button onClick={() => setShowChangeCodeModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Choose a code that's easy to remember. Participants will enter this to join your organization.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Code</label>
            <input
              type="text"
              value={newCodeInput}
              onChange={(e) => {
                const v = [...e.target.value.toUpperCase()]
                  .filter((c) => ORG_CODE_SAFE_CHARS.includes(c))
                  .join('')
                  .slice(0, ORG_CODE_MAX);
                setNewCodeInput(v);
                setChangeCodeError('');
              }}
              placeholder="e.g. ACME24"
              className={INPUT_CLASS}
              maxLength={ORG_CODE_MAX}
              autoComplete="off"
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {ORG_CODE_MIN}–{ORG_CODE_MAX} chars • A–Z, 2–9 only • Must be unique
            </p>
          </div>
          {changeCodeError && (
            <p className="text-sm text-red-600 dark:text-red-400">{changeCodeError}</p>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={() => setShowChangeCodeModal(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
          <button onClick={handleSaveNewCode} disabled={isChangingCode || !newCodeInput.trim()} className={BUTTON_PRIMARY}>
            {isChangingCode ? 'Saving...' : 'Save Code'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
      <div className="space-y-6 animate-in fade-in">
          {showPreview && <InvitePreviewModal />}
          {showChangeCodeModal && <ChangeCodeModal />}
          
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
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 font-mono text-2xl font-bold tracking-wider">
                      {organizationCode}
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {copiedCode ? (
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
                    {currentUser.role === Role.ADMIN && onUpdateOrganizationCode && (
                      <button
                        onClick={handleOpenChangeCode}
                        className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                        title="Customize code"
                      >
                        <Pencil className="w-5 h-5" />
                        Customize
                      </button>
                    )}
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
                          {copiedOrgSignupLink ? (
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
                              <input 
                                type="email" 
                                className={INPUT_CLASS} 
                                placeholder="colleague@company.com" 
                                value={formData.email} 
                                onChange={e => {
                                  setFormData({...formData, email: e.target.value});
                                  // Clear generated link when email changes
                                  if (generatedLink) {
                                    setGeneratedLink(null);
                                    setGeneratedInvitationId(null);
                                  }
                                }} 
                              />
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

                          {emailInviteLoading && formData.email.trim() && (
                              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Checking invitation status…</p>
                          )}

                          {isAcceptedInvite && (
                              <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200">
                                  This person has already accepted their invitation. You cannot send another referral to this email address.
                              </div>
                          )}

                          {isPendingOrExpiredDuplicate && !resendAcknowledged && (
                              <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-900 dark:text-amber-100">
                                  <p className="mb-3">
                                      This email matches an invitation you already sent
                                      {emailInvite?.sentDate ? ` (sent ${emailInvite.sentDate})` : ''}. It is still pending.
                                      You can send another email to remind them.
                                  </p>
                                  <button
                                      type="button"
                                      onClick={() => setResendAcknowledged(true)}
                                      className="text-sm font-semibold text-amber-800 dark:text-amber-100 underline hover:no-underline"
                                  >
                                      Send another email
                                  </button>
                              </div>
                          )}

                          {isPendingOrExpiredDuplicate && resendAcknowledged && (
                              <div className="mb-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-800 dark:text-emerald-200">
                                  You can send another invitation email using the buttons below.
                              </div>
                          )}
                          
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
                                          {copiedGeneratedLink ? (
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
                                  disabled={!formData.email || isGeneratingLink || !organizationId || !!generatedLink || isAcceptedInvite || emailInviteLoading} 
                                  className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center disabled:opacity-50"
                              >
                                  <LinkIcon className="w-4 h-4 mr-2" /> 
                                  {isGeneratingLink ? 'Generating...' : generatedLink ? 'Link Generated' : 'Generate Link'}
                              </button>
                              <button onClick={() => setShowPreview(true)} disabled={!formData.email || !organizationId || emailInviteLoading} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center disabled:opacity-50">
                                  <Eye className="w-4 h-4 mr-2" /> Preview
                              </button>
                              <button onClick={handleSendInvite} disabled={sendInviteDisabled} className={BUTTON_PRIMARY}>
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={handleBulkFileSelect}
                  />
                  <div 
                    className={`border-2 border-dashed rounded-xl p-10 transition-colors ${dragActive ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-700'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => !bulkFile && fileInputRef.current?.click()}
                  >
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Upload CSV File</h3>
                      <p className="text-slate-500 mb-6 max-w-sm mx-auto">Drag and drop your CSV file here, or click to browse. Max {MAX_BULK_CONTACTS} contacts per upload.</p>
                      
                      {bulkFile ? (
                          <div className="space-y-4">
                              <div className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 py-2 px-4 rounded-lg inline-block text-emerald-700 dark:text-emerald-300 font-medium">
                                  <FileText className="w-4 h-4" /> {bulkFile.name}
                                  <button onClick={(e) => { e.stopPropagation(); setBulkFile(null); setBulkUploadResult(null); }} className="ml-2 hover:text-red-500"><X className="w-4 h-4" /></button>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleBulkUpload(); }}
                                disabled={isBulkUploading || !organizationId}
                                className={BUTTON_PRIMARY}
                              >
                                {isBulkUploading ? 'Sending...' : <><Send className="w-4 h-4 mr-2" /> Send Invitations</>}
                              </button>
                          </div>
                      ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                          >
                            Browse Files
                          </button>
                      )}
                      
                      <div className="flex flex-col items-center gap-2 mt-6">
                          <p className="text-xs text-slate-400">Template format: First Name, Last Name, Email, Role (Mentee/Mentor)</p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(); }}
                            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> Download CSV template
                          </button>
                      </div>
                      
                      {bulkUploadResult && (
                          <div className={`mt-6 p-4 rounded-lg text-left text-sm ${bulkUploadResult.failed > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'}`}>
                              <p className="font-medium text-slate-800 dark:text-white">
                                  {bulkUploadResult.sent} sent{bulkUploadResult.failed > 0 && `, ${bulkUploadResult.failed} failed`}
                              </p>
                              {bulkUploadResult.errors.length > 0 && (
                                  <ul className="mt-2 text-amber-700 dark:text-amber-300 space-y-0.5">
                                      {bulkUploadResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                                  </ul>
                              )}
                          </div>
                      )}
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
                                          {(inv.status === 'Pending' || inv.status === 'Expired') && (
                                              <button
                                                  type="button"
                                                  onClick={() => handleResendFromTrack(inv)}
                                                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-xs font-medium hover:underline"
                                              >
                                                  Resend
                                              </button>
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