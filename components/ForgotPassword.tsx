import React, { useState } from "react";
import { INPUT_CLASS, BUTTON_PRIMARY } from "../styles/common";
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Logo } from "./Logo";
import { findUserByEmail } from "../services/database";
import { getErrorMessage } from "../utils/errors";

interface ForgotPasswordProps {
  onNavigate: (page: string) => void;
  onBack: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onNavigate, onBack }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!email.trim()) {
        throw new Error("Please enter your email address");
      }

      // Check if user exists
      const user = await findUserByEmail(email.trim());
      if (!user) {
        // Don't reveal if email exists for security - show success anyway
        setSuccess(true);
        setIsLoading(false);
        return;
      }

      // Call API to send password reset email
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send reset email");
      }

      setSuccess(true);
    } catch (err: unknown) {
      console.error("Password reset error:", err);
      // Still show success for security (don't reveal if email exists)
      setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

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
            Reset Your Password
          </h1>
          <p className="text-white/90 text-lg leading-relaxed">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <button
          onClick={onBack}
          className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 flex items-center text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
        </button>

        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">
              Forgot Password?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              No worries! Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success ? (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-900 mb-1">
                    Check your email
                  </p>
                  <p className="text-sm text-emerald-700">
                    If an account exists with {email}, we've sent a password reset link to your email address.
                    Please check your inbox and follow the instructions to reset your password.
                  </p>
                  <p className="text-xs text-emerald-600 mt-2">
                    Didn't receive the email? Check your spam folder or try again.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                  setError(null);
                }}
                className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Send another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    className={INPUT_CLASS + " pl-10"}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={BUTTON_PRIMARY + " w-full py-2.5 text-base shadow-lg shadow-emerald-900/10"}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={onBack}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium"
            >
              ← Back to Sign In
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            Remember your password?{" "}
            <button
              onClick={onBack}
              className="font-medium text-emerald-600 hover:text-emerald-500"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
