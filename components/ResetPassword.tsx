import React, { useState, useEffect } from "react";
import { INPUT_CLASS, BUTTON_PRIMARY } from "../styles/common";
import { ArrowLeft, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Logo } from "./Logo";
import { getErrorMessage } from "../utils/errors";

interface ResetPasswordProps {
  onNavigate: (page: string) => void;
  onBack: () => void;
  token?: string;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate, onBack, token }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Get token from URL if not provided as prop
  useEffect(() => {
    if (!token) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("token");
      if (!urlToken) {
        setTokenError("Invalid or missing reset token. Please request a new password reset link.");
        setIsValidatingToken(false);
      } else {
        setIsValidatingToken(false);
      }
    } else {
      setIsValidatingToken(false);
    }
  }, [token]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(pwd)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(pwd)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(pwd)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      // Validate password strength
      const passwordError = validatePassword(password);
      if (passwordError) {
        throw new Error(passwordError);
      }

      const resetToken = token || new URLSearchParams(window.location.search).get("token");
      if (!resetToken) {
        throw new Error("Invalid reset token");
      }

      // Call API to reset password
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          password: password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err: unknown) {
      console.error("Password reset error:", err);
      setError(getErrorMessage(err) || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen flex bg-white overflow-x-hidden w-full">
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Invalid Reset Link</h2>
            </div>
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{tokenError}</p>
            </div>
            <button
              onClick={() => {
                onNavigate("auth");
                onBack();
              }}
              className={BUTTON_PRIMARY + " w-full py-2.5 text-base"}
            >
              Go to Login
            </button>
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  onNavigate("forgot-password");
                }}
                className="text-sm text-emerald-600 hover:text-emerald-500 font-medium"
              >
                Request a new reset link
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex bg-white overflow-x-hidden w-full">
        {/* Left Side - Visual */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center text-white p-12 bg-emerald-600">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-20"></div>
          <div className="relative z-10 max-w-lg">
            <div className="flex items-center space-x-2 mb-8">
              <Logo className="w-10 h-10" />
              <span className="font-bold text-2xl uppercase tracking-tight">
                Meant2Grow
              </span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              Password Reset Successful
            </h1>
            <p className="text-white/90 text-lg leading-relaxed">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
          </div>
        </div>

        {/* Right Side - Success Message */}
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">
                Password Reset Successful
              </h2>
            </div>
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-900 mb-1">
                    Your password has been reset
                  </p>
                  <p className="text-sm text-emerald-700">
                    You can now sign in with your new password.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                onNavigate("auth");
                onBack();
              }}
              className={BUTTON_PRIMARY + " w-full py-2.5 text-base shadow-lg shadow-emerald-900/10"}
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white overflow-x-hidden w-full">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center text-white p-12 bg-emerald-600">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center space-x-2 mb-8">
            <Logo className="w-10 h-10" />
            <span className="font-bold text-2xl uppercase tracking-tight">
              Meant2Grow
            </span>
          </div>
          <h1 className="text-5xl font-bold mb-6">
            Create New Password
          </h1>
          <p className="text-white/90 text-lg leading-relaxed">
            Enter your new password below. Make sure it's strong and secure.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <button
          onClick={onBack}
          className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 flex items-center text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>

        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">
              Reset Password
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter your new password below. Make sure it's at least 8 characters and includes uppercase, lowercase, and numbers.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={INPUT_CLASS + " pl-10 pr-10"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Must be at least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={INPUT_CLASS + " pl-10 pr-10"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className={BUTTON_PRIMARY + " w-full py-2.5 text-base shadow-lg shadow-emerald-900/10 disabled:opacity-50"}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onBack}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
