import React, { useState, useEffect } from "react";
import { INPUT_CLASS, BUTTON_PRIMARY } from "../styles/common";
import {
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Logo } from "./Logo";
import { signInWithGoogle, initializeGoogleAuth, signInToFirebaseAuth } from "../services/googleAuth";
import {
  createUser,
  getOrganizationByCode,
  findUserByEmail,
  getInvitationByToken,
  getInvitationByEmail,
  updateInvitation,
  getOrganization,
  subscribeToOrganization,
} from "../services/database";
import { Role, User, Invitation, Organization } from "../types";

interface OrganizationSignupProps {
  onLogin: (
    isNewOrg?: boolean,
    isParticipant?: boolean,
    participantRole?: "MENTOR" | "MENTEE"
  ) => void;
  onNavigate: (page: string) => void;
}

const OrganizationSignup: React.FC<OrganizationSignupProps> = ({
  onLogin,
  onNavigate,
}) => {
  const [participantRole, setParticipantRole] = useState<
    "MENTOR" | "MENTEE" | null
  >(null);
  const [participantSignupStep, setParticipantSignupStep] = useState<
    "select-role" | "create-account"
  >("select-role");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    orgCode: "",
  });
  const [googleAuthReady, setGoogleAuthReady] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  // Load organization from URL params (invitation token or orgCode)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let ignore = false; // Flag to prevent state updates after unmount

    const loadOrganization = async () => {
      setLoadingOrg(true);
      const urlParams = new URLSearchParams(window.location.search);
      const inviteToken = urlParams.get("invite");
      const orgCode = urlParams.get("orgCode");

      try {
        let organizationId: string | null = null;

        if (inviteToken) {
          setInvitationToken(inviteToken);
          // Load invitation
          const inv = await getInvitationByToken(inviteToken);
          if (inv && !ignore) {
            setInvitation(inv);
            organizationId = inv.organizationId;
            // Load organization for branding
            const org = await getOrganization(inv.organizationId);
            if (org && !ignore) {
              setOrganization(org);
              // Pre-fill email if available
              setFormData((prev) => ({ ...prev, email: inv.email }));
              // Set role from invitation
              setParticipantRole(
                inv.role === Role.MENTOR ? "MENTOR" : "MENTEE"
              );
              setParticipantSignupStep("create-account");
            } else if (!ignore) {
              setError("Invalid invitation: Organization not found");
            }
          } else if (!ignore) {
            setError("Invalid or expired invitation link");
          }
        } else if (orgCode) {
          // Load organization by code
          const org = await getOrganizationByCode(orgCode.toUpperCase());
          if (org && !ignore) {
            organizationId = org.id;
            setOrganization(org);
            setFormData((prev) => ({ ...prev, orgCode: orgCode.toUpperCase() }));
          } else if (!ignore) {
            setError("Invalid organization code. Please check and try again.");
          }
        } else if (!ignore) {
          setError("No organization identifier found. Please use an invitation link or organization code.");
        }

        // Set up real-time listener for organization updates (to catch accent color changes)
        if (organizationId && !ignore) {
          unsubscribe = subscribeToOrganization(organizationId, (updatedOrg) => {
            // Only update if component is still mounted
            if (!ignore && updatedOrg) {
              setOrganization(updatedOrg);
            }
          });
        }
      } catch (err: any) {
        if (!ignore) {
          console.error("Error loading organization:", err);
          setError(err.message || "Failed to load organization");
        }
      } finally {
        if (!ignore) {
          setLoadingOrg(false);
        }
      }
    };

    loadOrganization();

    // Cleanup: unsubscribe from real-time updates and prevent state updates
    return () => {
      ignore = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Initialize Google Auth when component mounts
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Wait for Google API to load
        if (typeof window !== "undefined" && window.google) {
          await initializeGoogleAuth();
          setGoogleAuthReady(true);
        } else {
          // Retry after a delay if Google API hasn't loaded yet
          setTimeout(() => {
            if (window.google) {
              initializeGoogleAuth().then(() => setGoogleAuthReady(true));
            }
          }, 1000);
        }
      } catch (err) {
        console.error("Failed to initialize Google Auth:", err);
        // Continue without Google Auth if it fails
      }
    };
    initAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Verify role is selected
      if (!participantRole) {
        throw new Error("Please select your role first");
      }

      // Check for invitation (either from URL token or by email)
      let org: Organization | null = organization;
      let invitationToUse: Invitation | null = invitation;

      if (invitationToken && invitation) {
        // Use invitation from URL token
        invitationToUse = invitation;
        org = organization;
      } else if (formData.email && invitation?.organizationId) {
        // Try to find invitation by email
        const emailInvitation = await getInvitationByEmail(
          formData.email.toLowerCase(),
          invitation.organizationId
        );
        if (emailInvitation) {
          invitationToUse = emailInvitation;
          org = await getOrganization(emailInvitation.organizationId);
        }
      }

      // If no invitation found, try organization code lookup
      if (!invitationToUse || !org) {
        if (formData.orgCode) {
          // Try to find organization by code
          org = await getOrganizationByCode(formData.orgCode.toUpperCase());
          if (!org) {
            throw new Error(
              "Invalid organization code. Please check and try again."
            );
          }
          // Organization code found - proceed without invitation
          invitationToUse = null;
        } else {
          throw new Error(
            "You need an invitation to join or an organization code. Please use the invitation link sent to your email or enter your organization code."
          );
        }
      }

      // Verify invitation is still valid (only if using invitation)
      if (invitationToUse) {
        if (invitationToUse.status !== "Pending") {
          throw new Error(
            "This invitation has already been used or has expired"
          );
        }

        // Verify email matches invitation (if invitation has email)
        if (
          invitationToUse.email &&
          invitationToUse.email.toLowerCase() !== formData.email.toLowerCase()
        ) {
          throw new Error(
            `This invitation is for ${invitationToUse.email}. Please sign up with that email address.`
          );
        }
      }

      // Create User
      const userId = await createUser({
        name: formData.name,
        email: formData.email,
        role:
          invitationToUse?.role ||
          (participantRole === "MENTOR" ? Role.MENTOR : Role.MENTEE),
        organizationId: org.id,
        bio: "",
        skills: [],
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          formData.name
        )}&background=random`,
        title: "",
        company: org.name,
      });

      // Mark invitation as accepted (only if using invitation)
      if (invitationToUse) {
        await updateInvitation(invitationToUse.id, { status: "Accepted" });
      }

      localStorage.setItem("authToken", "simulated-token");
      localStorage.setItem("organizationId", org.id);
      localStorage.setItem("userId", userId);

      onLogin(false, true, participantRole);
    } catch (err: any) {
      console.error("Authentication error:", err);
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!googleAuthReady) {
      setError(
        "Google Sign-In is not ready yet. Please try again in a moment."
      );
      return;
    }

    setIsGoogleLoading(true);
    setError(null);

    try {
      const { user, idToken } = await signInWithGoogle();

      // Sign in to Firebase Auth with Google ID token
      try {
        await signInToFirebaseAuth(idToken);
      } catch (firebaseAuthError) {
        console.warn('Failed to sign in to Firebase Auth (Cloud Functions may not work):', firebaseAuthError);
      }

      // Join existing organization via invitation
      if (!participantRole) {
        setError("Please select your role first");
        setIsGoogleLoading(false);
        return;
      }

      // Check for invitation
      let org: Organization | null = organization;
      let invitationToUse: Invitation | null = invitation;

      if (invitationToken && invitation) {
        invitationToUse = invitation;
        org = organization;
      } else if (user.email && invitation?.organizationId) {
        const emailInvitation = await getInvitationByEmail(
          user.email.toLowerCase(),
          invitation.organizationId
        );
        if (emailInvitation) {
          invitationToUse = emailInvitation;
          org = await getOrganization(emailInvitation.organizationId);
        }
      }

      // If no invitation found, try organization code lookup
      if (!invitationToUse || !org) {
        if (formData.orgCode) {
          org = await getOrganizationByCode(formData.orgCode.toUpperCase());
          if (!org) {
            setError(
              "Invalid organization code. Please check and try again."
            );
            setIsGoogleLoading(false);
            return;
          }
          invitationToUse = null;
        } else {
          setError(
            "You need an invitation to join or an organization code. Please use the invitation link sent to your email or enter your organization code."
          );
          setIsGoogleLoading(false);
          return;
        }
      }

      // Verify invitation is still valid (only if using invitation)
      if (invitationToUse) {
        if (invitationToUse.status !== "Pending") {
          setError("This invitation has already been used or has expired");
          setIsGoogleLoading(false);
          return;
        }

        // Verify email matches invitation
        if (
          invitationToUse.email &&
          invitationToUse.email.toLowerCase() !== user.email.toLowerCase()
        ) {
          setError(
            `This invitation is for ${invitationToUse.email}. Please sign in with that Google account.`
          );
          setIsGoogleLoading(false);
          return;
        }
      }

      // Use Vercel API route
      const apiUrl = "/api/auth/google";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleId: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          ...(invitationToUse
            ? { invitationToken: invitationToUse.token }
            : { organizationCode: org.organizationCode }),
          role:
            invitationToUse?.role ||
            (participantRole === "MENTOR" ? Role.MENTOR : Role.MENTEE),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to join organization");
      }

      const {
        user: joinedUser,
        organizationId,
        token,
      } = await response.json();

      // Mark invitation as accepted (only if using invitation)
      if (invitationToUse) {
        await updateInvitation(invitationToUse.id, { status: "Accepted" });
      }

      // Store auth data
      localStorage.setItem("authToken", token);
      localStorage.setItem("organizationId", organizationId);
      localStorage.setItem("userId", joinedUser.id);

      onLogin(false, true, participantRole);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Get organization branding
  const accentColor = organization
    ? organization.accentColor ||
      organization.programSettings?.accentColor ||
      "#10b981"
    : "#10b981";
  const orgLogo = organization
    ? organization.logo || organization.programSettings?.logo
    : null;
  const programName = organization
    ? organization.programSettings?.programName || organization.name
    : "Meant2Grow";
  const orgIntroText = organization?.programSettings?.introText || null;

  // Show loading state while organization is being loaded
  if (loadingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if organization couldn't be loaded
  if (!organization && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Unable to Load</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => onNavigate("landing")}
            className={BUTTON_PRIMARY}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white overflow-x-hidden w-full">
      {/* Left Side - Visual with Organization Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center text-white p-12"
        style={{ backgroundColor: accentColor }}
      >
        {/* Background image with accent color overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')`,
            opacity: 0.15,
          }}
        ></div>
        {/* Accent color gradient overlay - adapts to program's selected color */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor} 50%, ${accentColor} 100%)`,
            opacity: 0.85,
          }}
        ></div>
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center space-x-2 mb-8">
            {orgLogo ? (
              <img
                src={orgLogo}
                alt={programName}
                className="w-10 h-10 rounded"
              />
            ) : (
              <Logo className="w-10 h-10" />
            )}
            <span className="font-bold text-2xl uppercase tracking-tight">
              {programName}
            </span>
          </div>
          <h1 className="text-5xl font-bold mb-6">
            {orgIntroText || "Join our mentorship program"}
          </h1>
          <p className="text-white/90 text-lg leading-relaxed mb-8">
            {organization
              ? `Join ${organization.name}'s mentorship program and connect with professionals in your organization.`
              : "Join thousands of professionals and mentors connecting, learning, and advancing together."}
          </p>
          <div className="space-y-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-white/80 mr-3" />{" "}
              <span>Smart Mentor Matching</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-white/80 mr-3" />{" "}
              <span>Professional Goal Tracking</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-white/80 mr-3" />{" "}
              <span>Safe Community Space</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <button
          onClick={() => onNavigate("landing")}
          className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 flex items-center text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
        </button>

        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Organization branding at top */}
          {(orgLogo || programName) && (
            <div className="mb-6 text-center">
              {orgLogo && (
                <img
                  src={orgLogo}
                  alt={programName}
                  className="h-12 mx-auto mb-3 rounded"
                />
              )}
              {programName && !orgLogo && (
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {programName}
                </h3>
              )}
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">
              {participantSignupStep === "select-role"
                ? `Join ${programName}`
                : "Create Your Account"}
            </h2>
            {participantSignupStep !== "select-role" && (
              <p className="mt-2 text-sm text-slate-600">
                Already have an account?{" "}
                <button
                  onClick={() => onNavigate("auth")}
                  className="font-medium"
                  style={{ color: accentColor }}
                >
                  Log in
                </button>
              </p>
            )}
          </div>

          {/* Step 1: Role Selection */}
          {participantSignupStep === "select-role" && (
            <div className="space-y-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: accentColor }}
                  >
                    1
                  </div>
                  <div className="flex-1 h-1 bg-slate-200 rounded"></div>
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm">
                    2
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  Step 1 of 2: Choose your role
                </p>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Choose Your Role
                </h3>
                <p className="text-sm text-slate-600">
                  Select how you'd like to participate in the mentorship
                  program
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setParticipantRole("MENTOR");
                    setParticipantSignupStep("create-account");
                  }}
                  className="w-full p-6 rounded-xl border-2 border-slate-200 hover:border-emerald-500 transition-all text-left group bg-white hover:bg-emerald-50"
                  style={{
                    borderColor: participantRole === "MENTOR" ? accentColor : undefined,
                    backgroundColor: participantRole === "MENTOR" ? `${accentColor}10` : undefined,
                  }}
                >
                  <div className="flex items-start">
                    <div className="flex-1">
                      <div className="text-lg font-bold text-slate-900 mb-1">
                        Mentor
                      </div>
                      <div className="text-sm text-slate-600 mb-3">
                        Share your expertise and guide others in their career
                        journey
                      </div>
                      <div className="flex items-center text-xs font-medium" style={{ color: accentColor }}>
                        Continue as Mentor{" "}
                        <ArrowLeft className="w-3 h-3 ml-1 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setParticipantRole("MENTEE");
                    setParticipantSignupStep("create-account");
                  }}
                  className="w-full p-6 rounded-xl border-2 border-slate-200 hover:border-emerald-500 transition-all text-left group bg-white hover:bg-emerald-50"
                  style={{
                    borderColor: participantRole === "MENTEE" ? accentColor : undefined,
                    backgroundColor: participantRole === "MENTEE" ? `${accentColor}10` : undefined,
                  }}
                >
                  <div className="flex items-start">
                    <div className="flex-1">
                      <div className="text-lg font-bold text-slate-900 mb-1">
                        Mentee
                      </div>
                      <div className="text-sm text-slate-600 mb-3">
                        Seek guidance and grow your career with experienced
                        mentors
                      </div>
                      <div className="flex items-center text-xs font-medium" style={{ color: accentColor }}>
                        Continue as Mentee{" "}
                        <ArrowLeft className="w-3 h-3 ml-1 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => {
                  onNavigate("landing");
                }}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Step 2: Account Creation */}
          {participantSignupStep === "create-account" && participantRole && (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="mb-4">
                  <button
                    onClick={() => {
                      setParticipantSignupStep("select-role");
                    }}
                    className="flex items-center text-sm text-slate-500 hover:text-slate-700 mb-3"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to role
                    selection
                  </button>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: accentColor }}
                    >
                      ✓
                    </div>
                    <div className="flex-1 h-1 rounded" style={{ backgroundColor: `${accentColor}40` }}></div>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: accentColor }}
                    >
                      2
                    </div>
                  </div>
                  <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}40` }}>
                    <p className="text-xs font-medium mb-1" style={{ color: accentColor }}>
                      Joining as:{" "}
                      <span className="font-bold">
                        {participantRole === "MENTOR" ? "Mentor" : "Mentee"}
                      </span>
                    </p>
                    <p className="text-xs" style={{ color: accentColor }}>
                      {participantRole === "MENTOR"
                        ? "You'll be sharing your expertise and guiding others"
                        : "You'll be seeking guidance and growing your career"}
                    </p>
                  </div>
                </div>

                {/* Social Logins */}
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading || !googleAuthReady}
                    className="w-full flex items-center justify-center px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors bg-white relative group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <img
                      src="https://www.svgrepo.com/show/475656/google-color.svg"
                      alt=""
                      className="w-5 h-5 mr-3"
                    />
                    {isGoogleLoading
                      ? "Signing in..."
                      : "Sign up with Google"}
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500">
                      Or continue with email
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {invitation && organization && (
                    <div className="p-4 rounded-lg border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}40` }}>
                      <p className="text-sm font-medium mb-1" style={{ color: accentColor }}>
                        Joining: {organization.name}
                      </p>
                      <p className="text-xs" style={{ color: accentColor }}>
                        {invitation.role === Role.MENTOR
                          ? "As a Mentor"
                          : invitation.role === Role.MENTEE
                          ? "As a Mentee"
                          : `As ${invitation.role}`}
                      </p>
                    </div>
                  )}

                  {!invitation && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        Enter your organization code to join, or use an
                        invitation link if you have one.
                      </p>
                    </div>
                  )}

                  {!invitation && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Organization Code
                      </label>
                      <input
                        type="text"
                        className={INPUT_CLASS}
                        placeholder="Enter your organization code (e.g., ABC123)"
                        value={formData.orgCode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            orgCode: e.target.value.toUpperCase(),
                          })
                        }
                        required={!invitation}
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Required: Enter the code provided by your organization
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className={INPUT_CLASS + " pl-10"}
                        placeholder="Jane Doe"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                      <UserIcon className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        className={INPUT_CLASS + " pl-10"}
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                      <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        className={INPUT_CLASS + " pl-10"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                      />
                      <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      !participantRole ||
                      (!invitation && !formData.orgCode)
                    }
                    className="w-full py-2.5 text-base shadow-lg text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                    style={{
                      backgroundColor: accentColor,
                      boxShadow: `0 10px 15px -3px ${accentColor}20, 0 4px 6px -2px ${accentColor}10`,
                    }}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationSignup;
