import React, { useState, useEffect } from "react";
import { INPUT_CLASS, BUTTON_PRIMARY } from "../styles/common";
import {
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle,
  Building,
  AlertCircle,
} from "lucide-react";
import { Logo } from "./Logo";
import { signInWithGoogle, initializeGoogleAuth } from "../services/googleAuth";
import { createUser, createOrganization, getOrganizationByCode, findUserByEmail } from "../services/database";
import { Role, User } from "../types";

interface AuthenticationProps {
  onLogin: (
    isNewOrg?: boolean,
    isParticipant?: boolean,
    participantRole?: "MENTOR" | "MENTEE"
  ) => void;
  onNavigate: (page: string) => void;
  initialMode?: "login" | "org-signup" | "participant-signup" | "choose";
}

const Authentication: React.FC<AuthenticationProps> = ({
  onLogin,
  onNavigate,
  initialMode = "choose",
}) => {
  const [mode, setMode] = useState<
    "login" | "org-signup" | "participant-signup" | "choose"
  >(initialMode);
  const [participantRole, setParticipantRole] = useState<"MENTOR" | "MENTEE">(
    "MENTEE"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    orgCode: "",
    orgName: "",
  });
  const [googleAuthReady, setGoogleAuthReady] = useState(false);
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const [existingUser, setExistingUser] = useState<User | null>(null);
  const [pendingSignup, setPendingSignup] = useState<{
    type: 'email' | 'google';
    data?: any;
  } | null>(null);

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
      if (mode === "org-signup") {
        // Check if email already exists
        const existingUserCheck = await findUserByEmail(formData.email);
        if (existingUserCheck) {
          setExistingUser(existingUserCheck);
          setPendingSignup({ type: 'email' });
          setShowEmailWarning(true);
          setIsLoading(false);
          return;
        }

        // Create Organization
        const orgId = await createOrganization({
          name: formData.orgName,
          logo: null,
          accentColor: '#10b981',
          subscriptionTier: 'free',
          // default settings
          programSettings: {
            programName: formData.orgName,
            logo: null,
            accentColor: '#10b981',
            introText: 'Welcome to our mentorship program!',
            fields: []
          }
        });

        // Create Admin User
        const userId = await createUser({
          name: formData.name || 'Organization Admin',
          email: formData.email,
          role: Role.ADMIN,
          organizationId: orgId,
          bio: 'Program Administrator',
          skills: [],
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.orgName)}&background=random`,
          title: 'Organization Admin',
          company: formData.orgName
        });

        localStorage.setItem("authToken", "simulated-token");
        localStorage.setItem("organizationId", orgId);
        localStorage.setItem("userId", userId);

        onLogin(true, false);
      } else if (mode === "participant-signup") {
        // Verify Org Code
        const org = await getOrganizationByCode(formData.orgCode);
        if (!org) {
          throw new Error("Invalid organization code");
        }

        // Create User
        const userId = await createUser({
          name: formData.name,
          email: formData.email,
          role: participantRole === "MENTOR" ? Role.MENTOR : Role.MENTEE,
          organizationId: org.id,
          bio: '',
          skills: [],
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`,
          title: '',
          company: org.name
        });

        localStorage.setItem("authToken", "simulated-token");
        localStorage.setItem("organizationId", org.id);
        localStorage.setItem("userId", userId);

        onLogin(false, true, participantRole);
      } else {
        // Login
        const user = await findUserByEmail(formData.email);
        if (!user) {
          throw new Error("User not found. Please check your email.");
        }
        // In a real app, verify password here. For prototype, we skip.

        localStorage.setItem("authToken", "simulated-token");
        localStorage.setItem("organizationId", user.organizationId);
        localStorage.setItem("userId", user.id);

        onLogin(false, false);
      }
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

      // Determine what to do based on mode
      if (mode === "org-signup") {
        // Check if email already exists
        const existingUserCheck = await findUserByEmail(user.email);
        if (existingUserCheck) {
          setExistingUser(existingUserCheck);
          setPendingSignup({
            type: 'google',
            data: {
              googleId: user.id,
              email: user.email,
              name: user.name,
              picture: user.picture,
              orgName: formData.orgName || `${user.name}'s Organization`,
            }
          });
          setShowEmailWarning(true);
          setIsGoogleLoading(false);
          return;
        }

        // Create new organization
        // Use Firebase Cloud Functions URL
        const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
          ? `${import.meta.env.VITE_FUNCTIONS_URL}/authGoogle`
          : import.meta.env.DEV
            ? "http://localhost:5001/meant2grow-dev/us-central1/authGoogle"
            : "https://us-central1-meant2grow-dev.cloudfunctions.net/authGoogle";

        const response = await fetch(functionsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            googleId: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            isNewOrg: true,
            orgName: formData.orgName || `${user.name}'s Organization`,
            role: Role.ADMIN, // Or could be a custom role if we allow it in org signup
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create organization");
        }

        const {
          user: createdUser,
          organizationId,
          token,
        } = await response.json();

        // Store auth data
        localStorage.setItem("authToken", token);
        localStorage.setItem("organizationId", organizationId);
        localStorage.setItem("userId", createdUser.id);

        onLogin(true, false);
      } else if (mode === "participant-signup") {
        // Join existing organization
        if (!formData.orgCode) {
          setError("Please enter your organization code");
          setIsGoogleLoading(false);
          return;
        }

        // Use Firebase Cloud Functions URL
        const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
          ? `${import.meta.env.VITE_FUNCTIONS_URL}/authGoogle`
          : import.meta.env.DEV
            ? "http://localhost:5001/meant2grow-dev/us-central1/authGoogle"
            : "https://us-central1-meant2grow-dev.cloudfunctions.net/authGoogle";

        const response = await fetch(functionsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            googleId: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            organizationCode: formData.orgCode.toUpperCase(),
            role: participantRole === "MENTOR" ? Role.MENTOR : Role.MENTEE,
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

        // Store auth data
        localStorage.setItem("authToken", token);
        localStorage.setItem("organizationId", organizationId);
        localStorage.setItem("userId", joinedUser.id);

        onLogin(false, true, participantRole);
      } else {
        // Regular login - find user by email or Google ID
        const existingUser = await findUserByEmail(user.email);
        
        if (!existingUser) {
          setError("No account found with this email. Please sign up first.");
          setIsGoogleLoading(false);
          return;
        }

        // Update user's Google ID if not already set
        if (existingUser.googleId !== user.id) {
          try {
            const { updateUser } = await import("../services/database");
            await updateUser(existingUser.id, { googleId: user.id });
          } catch (updateError) {
            console.error("Failed to update Google ID:", updateError);
            // Continue with login even if update fails
          }
        }

        // Store auth data
        localStorage.setItem("authToken", idToken || "simulated-token");
        localStorage.setItem("organizationId", existingUser.organizationId);
        localStorage.setItem("userId", existingUser.id);
        if (idToken) {
          localStorage.setItem("google_id_token", idToken);
        }

        onLogin(false, false);
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleProceedWithSignup = async () => {
    setShowEmailWarning(false);
    setError(null);

    try {
      if (pendingSignup?.type === 'email') {
        setIsLoading(true);
        // Proceed with email/password signup
        const orgId = await createOrganization({
          name: formData.orgName,
          logo: null,
          accentColor: '#10b981',
          subscriptionTier: 'free',
          programSettings: {
            programName: formData.orgName,
            logo: null,
            accentColor: '#10b981',
            introText: 'Welcome to our mentorship program!',
            fields: []
          }
        });

        const userId = await createUser({
          name: formData.name || 'Admin',
          email: formData.email,
          role: Role.ADMIN,
          organizationId: orgId,
          bio: 'Program Administrator',
          skills: [],
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.orgName)}&background=random`,
          title: 'Administrator',
          company: formData.orgName
        });

        localStorage.setItem("authToken", "simulated-token");
        localStorage.setItem("organizationId", orgId);
        localStorage.setItem("userId", userId);

        onLogin(true, false);
      } else if (pendingSignup?.type === 'google' && pendingSignup.data) {
        setIsGoogleLoading(true);
        // Proceed with Google signup
        const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
          ? `${import.meta.env.VITE_FUNCTIONS_URL}/authGoogle`
          : import.meta.env.DEV
            ? "http://localhost:5001/meant2grow-dev/us-central1/authGoogle"
            : "https://us-central1-meant2grow-dev.cloudfunctions.net/authGoogle";

        const response = await fetch(functionsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            googleId: pendingSignup.data.googleId,
            email: pendingSignup.data.email,
            name: pendingSignup.data.name,
            picture: pendingSignup.data.picture,
            isNewOrg: true,
            orgName: pendingSignup.data.orgName,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create organization");
        }

        const {
          user: createdUser,
          organizationId,
          token,
        } = await response.json();

        localStorage.setItem("authToken", token);
        localStorage.setItem("organizationId", organizationId);
        localStorage.setItem("userId", createdUser.id);

        onLogin(true, false);
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "Failed to create organization");
    } finally {
      setIsLoading(false);
      setIsGoogleLoading(false);
      setPendingSignup(null);
      setExistingUser(null);
    }
  };

  const handleGoToLogin = () => {
    setShowEmailWarning(false);
    setPendingSignup(null);
    setExistingUser(null);
    setMode("login");
    // Pre-fill email if available
    if (formData.email) {
      // Email is already in formData, so it will be shown in login form
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-900 relative overflow-hidden items-center justify-center text-white p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center space-x-2 mb-8">
            <Logo className="w-10 h-10" />
            <span className="font-bold text-2xl uppercase tracking-tight">
              Meant2Grow
            </span>
          </div>
          <h1 className="text-5xl font-bold mb-6">
            Grow your career with confidence.
          </h1>
          <p className="text-emerald-100 text-lg leading-relaxed mb-8">
            Join thousands of professionals and mentors connecting, learning,
            and advancing together.
          </p>
          <div className="space-y-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-emerald-400 mr-3" />{" "}
              <span>Smart Mentor Matching</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-emerald-400 mr-3" />{" "}
              <span>Professional Goal Tracking</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-emerald-400 mr-3" />{" "}
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
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">
              {mode === "choose"
                ? "Get Started"
                : mode === "login"
                  ? "Welcome back"
                  : mode === "org-signup"
                    ? "Start Your Program"
                    : "Join Your Organization"}
            </h2>
            {mode !== "choose" && (
              <p className="mt-2 text-sm text-slate-600">
                {mode === "login" ? (
                  <>
                    New to Meant2Grow?{" "}
                    <button
                      onClick={() => setMode("choose")}
                      className="font-medium text-emerald-600 hover:text-emerald-500"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => setMode("login")}
                      className="font-medium text-emerald-600 hover:text-emerald-500"
                    >
                      Log in
                    </button>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Choose Mode - Show signup options prominently */}
          {mode === "choose" && (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => setMode("org-signup")}
                  className="p-6 border-2 border-emerald-200 hover:border-emerald-500 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-all text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Building className="w-5 h-5 text-emerald-600 mr-2" />
                        <h3 className="font-bold text-lg text-slate-900">
                          Launch a Program
                        </h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        Start a mentorship program for your organization. You'll
                        be the Organization Admin.
                      </p>
                      <div className="flex items-center text-xs text-emerald-600 font-medium">
                        Get started{" "}
                        <ArrowLeft className="w-3 h-3 ml-1 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setMode("participant-signup")}
                  className="p-6 border-2 border-slate-200 hover:border-emerald-500 rounded-xl bg-white hover:bg-slate-50 transition-all text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <UserIcon className="w-5 h-5 text-emerald-600 mr-2" />
                        <h3 className="font-bold text-lg text-slate-900">
                          Join as Participant
                        </h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        Join an existing mentorship program as a mentor or
                        mentee.
                      </p>
                      <div className="flex items-center text-xs text-emerald-600 font-medium">
                        Join now{" "}
                        <ArrowLeft className="w-3 h-3 ml-1 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">
                    Already have an account?
                  </span>
                </div>
              </div>

              <button
                onClick={() => setMode("login")}
                className="w-full py-3 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Role Selection for Participant Signup */}
          {mode === "participant-signup" && (
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                I am joining as:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setParticipantRole("MENTOR")}
                  className={`p-3 rounded-lg border-2 transition-all ${participantRole === "MENTOR"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-emerald-300"
                    }`}
                >
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Mentor
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Sharing expertise
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setParticipantRole("MENTEE")}
                  className={`p-3 rounded-lg border-2 transition-all ${participantRole === "MENTEE"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-emerald-300"
                    }`}
                >
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Mentee
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Seeking guidance
                  </div>
                </button>
              </div>
            </div>
          )}

          {mode !== "choose" && (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Social Logins */}
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading || !googleAuthReady}
                    className={`w-full flex items-center justify-center px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors bg-white relative group disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <img
                      src="https://www.svgrepo.com/show/475656/google-color.svg"
                      alt=""
                      className="w-5 h-5 mr-3"
                    />
                    {isGoogleLoading
                      ? "Signing in..."
                      : mode === "login"
                        ? "Continue with Google"
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
                  {mode === "org-signup" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Organization Name
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          className={INPUT_CLASS + " pl-10"}
                          placeholder="My Company Inc."
                          value={formData.orgName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              orgName: e.target.value,
                            })
                          }
                          required
                        />
                        <Building className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                      </div>
                    </div>
                  )}

                  {mode === "participant-signup" && (
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
                  )}

                  {mode === "participant-signup" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Organization Code
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          className={INPUT_CLASS + " pl-10"}
                          placeholder="ABC123"
                          value={formData.orgCode}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              orgCode: e.target.value,
                            })
                          }
                          required
                        />
                        <Building className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Get this code from your Organization Admin
                      </p>
                    </div>
                  )}
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

                  {mode === "login" && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded bg-white"
                        />
                        <label className="ml-2 block text-sm text-slate-900">
                          Remember me
                        </label>
                      </div>
                      <div className="text-sm">
                        <a
                          href="#"
                          className="font-medium text-emerald-600 hover:text-emerald-500"
                        >
                          Forgot password?
                        </a>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={
                      BUTTON_PRIMARY +
                      " w-full py-2.5 text-base shadow-lg shadow-emerald-900/10"
                    }
                  >
                    {isLoading
                      ? "Processing..."
                      : mode === "login"
                        ? "Sign In"
                        : mode === "org-signup"
                          ? "Create Organization"
                          : `Join as ${participantRole === "MENTOR" ? "Mentor" : "Mentee"
                          }`}
                  </button>
                </form>
              </div>
            </>
          )}

          <p className="mt-8 text-center text-xs text-slate-500">
            By clicking continue, you agree to our{" "}
            <button
              onClick={() => onNavigate("legal")}
              className="underline hover:text-slate-800"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              onClick={() => onNavigate("legal")}
              className="underline hover:text-slate-800"
            >
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </div>

      {/* Email Warning Modal */}
      {showEmailWarning && existingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-200">
            <div className="flex items-start mb-4">
              <AlertCircle className="w-6 h-6 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Email Already Registered
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  This email address ({pendingSignup?.type === 'google' ? pendingSignup.data?.email : formData.email}) is already registered
                  with an account in another organization ({existingUser.company || 'another organization'}).
                </p>
                <p className="text-sm text-slate-600 mb-6">
                  You can still create a new organization with this email, which will create a separate
                  account. Alternatively, you can sign in to your existing account.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGoToLogin}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Sign In Instead
              </button>
              <button
                onClick={handleProceedWithSignup}
                disabled={isLoading || isGoogleLoading}
                className={`${BUTTON_PRIMARY} flex-1 px-4 py-2.5 text-sm font-medium`}
              >
                {(isLoading || isGoogleLoading) ? "Creating..." : "Create New Organization"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Authentication;
