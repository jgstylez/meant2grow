import React, { useState } from "react";
import {
  ArrowLeft,
  Check,
  Shield,
  Lock,
  FileText,
  Building,
  UserPlus,
  Search,
  MessageSquare,
  TrendingUp,
  HelpCircle,
  Users,
  BookOpen,
  ExternalLink,
  Calendar,
  MapPin,
  Globe,
  Mail,
  Phone,
  Zap,
  Target,
  BarChart,
  Users2,
  Sparkles,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { CARD_CLASS, INPUT_CLASS, BUTTON_PRIMARY } from "../styles/common";
import { BlogPost } from "../types";

// Input styling for better contrast
const FORM_INPUT_CLASS =
  "w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors";

interface PublicPagesProps {
  page: string;
  onNavigate: (page: string) => void;
  onSignup: () => void;
  onLogin: () => void;
  blogPosts?: BlogPost[];
}

const PublicPages: React.FC<PublicPagesProps> = ({
  page,
  onNavigate,
  onSignup,
  onLogin,
  blogPosts = [],
}) => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const Header = () => {
    const navItems = [
      { label: "Features", route: "features" },
      { label: "How It Works", route: "how-it-works" },
      { label: "Pricing", route: "pricing" },
      { label: "Resources", route: "blog" },
    ];

    return (
      <nav className="bg-white border-b border-slate-100 py-3 sm:py-4 px-4 sm:px-6 flex justify-between items-center sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => onNavigate("landing")}
        >
          <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
          <span className="font-bold text-base sm:text-lg uppercase tracking-tight text-slate-900">
            Meant2Grow
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.route}
              onClick={() => onNavigate(item.route)}
              className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onNavigate("contact")}
            className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5"
          >
            Contact
          </button>
          <button
            onClick={onLogin}
            className="bg-emerald-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Log In
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </nav>
    );
  };

  const Footer = () => (
    <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center space-x-2 mb-4">
            <Logo className="w-6 h-6" />
            <span className="font-bold text-white uppercase tracking-tight">
              Meant2Grow
            </span>
          </div>
          <p className="text-sm mb-4">
            Connecting professionals for a better future.
          </p>
          <h4 className="font-bold text-white mb-2 text-sm uppercase tracking-wider">
            STAY CONNECTED
          </h4>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter email for updates"
              className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs w-full sm:max-w-[200px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-white placeholder-slate-400 transition-colors"
            />
            <button className="bg-emerald-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-emerald-700 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">
            Platform
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <button
                onClick={() => onNavigate("how-it-works")}
                className="hover:text-emerald-500"
              >
                How It Works
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate("landing")}
                className="hover:text-emerald-500"
              >
                Features
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate("pricing")}
                className="hover:text-emerald-500"
              >
                Pricing
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate("enterprise")}
                className="hover:text-emerald-500"
              >
                Enterprise
              </button>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">
            Resources
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <button
                onClick={() => onNavigate("blog")}
                className="hover:text-emerald-500"
              >
                Blog
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate("community")}
                className="hover:text-emerald-500"
              >
                Community Hub
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate("help")}
                className="hover:text-emerald-500"
              >
                Help Center
              </button>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">
            Legal
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <button
                onClick={() => onNavigate("legal")}
                className="hover:text-emerald-500"
              >
                Privacy Policy
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate("legal")}
                className="hover:text-emerald-500"
              >
                Terms of Service
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-center text-xs">
        &copy; 2025 Meant2Grow. All rights reserved.
      </div>
    </footer>
  );

  const Content = () => {
    switch (page) {
      case "how-it-works":
        return (
          <div className="animate-in fade-in">
            <section className="bg-emerald-900 text-white py-12 sm:py-16 md:py-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
                  How Meant2Grow Works
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-emerald-100 max-w-2xl mx-auto">
                  A simple, effective journey from connection to career
                  advancement.
                </p>
              </div>
            </section>

            <section className="py-12 sm:py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8 relative">
                {/* Connector Line */}
                <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-0.5 bg-slate-200 -z-10"></div>

                {[
                  {
                    icon: UserPlus,
                    title: "1. Create Profile",
                    text: "Sign up and set your professional goals, interests, and availability.",
                  },
                  {
                    icon: Search,
                    title: "2. Smart Match",
                    text: "Our smart matching system pairs you with the perfect mentor or mentee based on compatibility.",
                  },
                  {
                    icon: MessageSquare,
                    title: "3. Connect",
                    text: "Start chatting, schedule video calls, and share resources securely.",
                  },
                  {
                    icon: TrendingUp,
                    title: "4. Track Growth",
                    text: "Set milestones, track progress, and celebrate achievements together.",
                  },
                ].map((step, i) => (
                  <div
                    key={i}
                    className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center"
                  >
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                      <step.icon className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                    <p className="text-slate-600 text-sm">{step.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="py-16 bg-slate-50">
              <div className="max-w-4xl mx-auto px-6">
                <h2 className="text-3xl font-bold text-center mb-12">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-6">
                  {[
                    {
                      q: "How long does a mentorship cycle last?",
                      a: "Typically 6 months, but you can choose to extend or end early based on your goals.",
                    },
                    {
                      q: "Is it free for mentees?",
                      a: "Yes! The Community plan is free forever for individual professionals.",
                    },
                    {
                      q: "How are mentors vetted?",
                      a: "We verify employment status and experience level for all mentors joining the platform.",
                    },
                  ].map((faq, i) => (
                    <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                      <h3 className="font-bold text-lg mb-2 flex items-center">
                        <HelpCircle className="w-5 h-5 mr-2 text-emerald-500" />{" "}
                        {faq.q}
                      </h3>
                      <p className="text-slate-600 pl-7">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="py-20 text-center">
              <h2 className="text-3xl font-bold mb-6">
                Ready to start your journey?
              </h2>
              <button
                onClick={onSignup}
                className="bg-emerald-600 text-white px-8 py-4 rounded-full font-bold hover:bg-emerald-700 shadow-lg"
              >
                Get Started Now
              </button>
            </section>
          </div>
        );
      case "pricing":
        // Calculate annual prices (2 months free = 10 months of monthly price)
        const monthlyPrices = { starter: 99, professional: 199, business: 299 };
        const annualPrices = {
          starter: monthlyPrices.starter * 10,
          professional: monthlyPrices.professional * 10,
          business: monthlyPrices.business * 10,
        };
        const prices = billingPeriod === "monthly" ? monthlyPrices : annualPrices;
        const periodLabel = billingPeriod === "monthly" ? "/mo" : "/yr";

        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
            <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 md:mb-16">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">
                Simple, Transparent Pricing
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-6">
                Choose the plan that fits your organization size. All plans
                include a 14-day free trial.
              </p>
              
              {/* Billing Period Toggle */}
              <div className="flex items-center justify-center mb-4">
                <div className="inline-flex items-center rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setBillingPeriod("monthly")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      billingPeriod === "monthly"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingPeriod("annual")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 relative ${
                      billingPeriod === "annual"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Annual
                    {billingPeriod === "annual" && (
                      <span className="absolute -top-1 -right-1 text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-semibold">
                        2mo free
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
              {/* Tier 1: Starter */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Starter
                </h3>
                <div className="text-4xl font-bold text-slate-900 mb-2">
                  ${prices.starter.toLocaleString()}
                  <span className="text-base font-normal text-slate-500">
                    {periodLabel}
                  </span>
                </div>
                {billingPeriod === "annual" && (
                  <p className="text-xs text-emerald-600 font-medium mb-1">
                    ${monthlyPrices.starter}/mo billed annually
                  </p>
                )}
                <p className="text-sm text-slate-500 mb-6">1-99 participants</p>
                <p className="text-slate-600 mb-8 text-sm">
                  Perfect for small teams and growing organizations.
                </p>
                <button
                  onClick={onSignup}
                  className="w-full py-3 bg-emerald-600 rounded-xl font-bold text-white hover:bg-emerald-700 transition-colors mb-3"
                >
                  Start Free Trial
                </button>
                <p className="text-xs text-center text-slate-500 mb-6">
                  14-day free trial
                </p>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />{" "}
                    Manual Mentor/Mentee Matching
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />{" "}
                    Unlimited Goals & Tracking
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />{" "}
                    Private Messaging & Video
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />{" "}
                    Advanced Analytics
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />{" "}
                    Admin Dashboard
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />{" "}
                    Customization Options
                  </li>
                </ul>
              </div>
              {/* Tier 2: Professional */}
              <div className="bg-slate-900 text-white p-8 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden transform md:-translate-y-4">
                <div className="absolute top-0 right-0 bg-emerald-500 text-xs font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  Popular
                </div>
                <h3 className="text-lg font-bold mb-2">Professional</h3>
                <div className="text-4xl font-bold mb-2">
                  ${prices.professional.toLocaleString()}
                  <span className="text-base font-normal text-slate-400">
                    {periodLabel}
                  </span>
                </div>
                {billingPeriod === "annual" && (
                  <p className="text-xs text-emerald-400 font-medium mb-1">
                    ${monthlyPrices.professional}/mo billed annually
                  </p>
                )}
                <p className="text-sm text-slate-400 mb-6">
                  100-399 participants
                </p>
                <p className="text-slate-400 mb-8 text-sm">
                  Ideal for mid-size organizations with growing mentorship
                  programs.
                </p>
                <button
                  onClick={onSignup}
                  className="w-full py-3 bg-emerald-600 rounded-xl font-bold hover:bg-emerald-700 transition-colors mb-3"
                >
                  Start Free Trial
                </button>
                <p className="text-xs text-center text-slate-400 mb-6">
                  14-day free trial
                </p>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />{" "}
                    Everything in Starter
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />{" "}
                    Smart Auto Matching
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />{" "}
                    Bulk Member Management
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />{" "}
                    Custom Resources
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />{" "}
                    Priority Support
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />{" "}
                    Advanced Reporting
                  </li>
                </ul>
              </div>
              {/* Tier 3: Business */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Business
                </h3>
                <div className="text-4xl font-bold text-slate-900 mb-2">
                  ${prices.business.toLocaleString()}
                  <span className="text-base font-normal text-slate-500">
                    {periodLabel}
                  </span>
                </div>
                {billingPeriod === "annual" && (
                  <p className="text-xs text-emerald-600 font-medium mb-1">
                    ${monthlyPrices.business}/mo billed annually
                  </p>
                )}
                <p className="text-sm text-slate-500 mb-6">
                  400-999 participants
                </p>
                <p className="text-slate-600 mb-8 text-sm">
                  For large organizations with comprehensive mentorship needs.
                </p>
                <button
                  onClick={onSignup}
                  className="w-full py-3 bg-emerald-600 rounded-xl font-bold text-white hover:bg-emerald-700 transition-colors mb-3"
                >
                  Start Free Trial
                </button>
                <p className="text-xs text-center text-slate-500 mb-6">
                  14-day free trial
                </p>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />{" "}
                    Everything in Professional
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />{" "}
                    Dedicated Account Manager
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />{" "}
                    Custom Integrations
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />{" "}
                    SLA Guarantee
                  </li>
                </ul>
              </div>
            </div>

            {/* Enterprise Option - Compact */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building className="w-6 h-6 text-emerald-600" />
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        Enterprise
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      For organizations with 1000+ participants or custom
                      requirements. Includes SSO, custom contracts, and
                      dedicated support.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate("enterprise")}
                    className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors whitespace-nowrap"
                  >
                    Contact Sales
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case "enterprise":
        return (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
            <div className="text-center mb-8 sm:mb-12">
              <Building className="w-12 h-12 sm:w-16 sm:h-16 text-emerald-600 mx-auto mb-4" />
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">
                Partner with Meant2Grow
              </h1>
              <p className="text-base sm:text-lg text-slate-600">
                Empower your entire community with structured mentorship.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
              <form className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      className={FORM_INPUT_CLASS}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className={FORM_INPUT_CLASS}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    className={FORM_INPUT_CLASS}
                    placeholder="john@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Organization / Community Name
                  </label>
                  <input
                    type="text"
                    className={FORM_INPUT_CLASS}
                    placeholder="Your Organization"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Community Size (Members)
                  </label>
                  <select className={FORM_INPUT_CLASS}>
                    <option>1-50</option>
                    <option>51-200</option>
                    <option>201-1000</option>
                    <option>1000+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    How can we help?
                  </label>
                  <textarea
                    rows={4}
                    className={FORM_INPUT_CLASS + " resize-y"}
                    placeholder="Tell us about your mentorship program needs..."
                  ></textarea>
                </div>
                <button
                  type="button"
                  className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg"
                >
                  Request Demo
                </button>
              </form>
            </div>
          </div>
        );
      case "blog":
        return (
          <div className="max-w-7xl mx-auto px-6 py-16 animate-in fade-in">
            <div className="text-center mb-16">
              <span className="text-emerald-600 font-bold tracking-wider text-sm uppercase mb-2 block">
                Our Blog
              </span>
              <h1 className="text-4xl font-bold text-slate-900 mb-4">
                Latest Insights
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Expert advice on mentorship, career development, and leadership.
              </p>
            </div>

            {blogPosts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">
                  No blog posts available at this time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {blogPosts.map((post) => (
                  <div key={post.id} className="group cursor-pointer">
                    <div className="rounded-2xl overflow-hidden mb-4 relative aspect-[4/3] bg-slate-200 dark:bg-slate-800">
                      <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/0 transition-colors z-10"></div>
                      <img
                        src={post.imageUrl}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        alt={post.title}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          // Check if we've already attempted a fallback to prevent infinite loop
                          if (!target.src.includes('via.placeholder.com')) {
                            // Fallback to a placeholder if image fails to load
                            target.src = `https://via.placeholder.com/800x600/10b981/ffffff?text=${encodeURIComponent(
                              post.title
                            )}`;
                          } else {
                            // If placeholder also fails, set to empty string to prevent infinite loop
                            target.src = '';
                            target.style.display = 'none';
                          }
                        }}
                      />
                      <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-800 uppercase tracking-wide z-20">
                        {post.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors mb-2">
                      {post.title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">
                      {post.excerpt ||
                        "Discover strategies and personal stories that illuminate the path to professional excellence..."}
                    </p>
                    <div className="mt-4 flex items-center text-emerald-600 text-sm font-medium">
                      Read Article{" "}
                      <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case "community":
        return (
          <div className="animate-in fade-in">
            <section className="bg-indigo-900 text-white py-20 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
              <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  Community Hub
                </h1>
                <p className="text-xl text-indigo-100 max-w-2xl mx-auto mb-8">
                  Connect with thousands of professionals worldwide outside of
                  your direct mentorship.
                </p>
                <div className="flex justify-center gap-4">
                  <button className="bg-white text-indigo-900 px-6 py-3 rounded-full font-bold hover:bg-indigo-50">
                    Join Discord
                  </button>
                  <button className="bg-indigo-700 text-white border border-indigo-500 px-6 py-3 rounded-full font-bold hover:bg-indigo-600">
                    Upcoming Events
                  </button>
                </div>
              </div>
            </section>

            <section className="py-20 max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className={CARD_CLASS + " border-t-4 border-t-indigo-500"}>
                  <Users className="w-10 h-10 text-indigo-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Peer Circles</h3>
                  <p className="text-slate-600 mb-4">
                    Join small groups based on industry or role for weekly
                    check-ins.
                  </p>
                  <a
                    href="#"
                    className="text-indigo-600 font-medium hover:underline"
                  >
                    Find a Circle &rarr;
                  </a>
                </div>
                <div
                  className={CARD_CLASS + " border-t-4 border-t-emerald-500"}
                >
                  <Calendar className="w-10 h-10 text-emerald-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Public Webinars</h3>
                  <p className="text-slate-600 mb-4">
                    Free workshops on leadership, negotiation, and tech trends.
                  </p>
                  <a
                    href="#"
                    className="text-emerald-600 font-medium hover:underline"
                  >
                    View Calendar &rarr;
                  </a>
                </div>
                <div className={CARD_CLASS + " border-t-4 border-t-amber-500"}>
                  <MapPin className="w-10 h-10 text-amber-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Local Meetups</h3>
                  <p className="text-slate-600 mb-4">
                    Meet mentors and mentees in your city for coffee and
                    networking.
                  </p>
                  <a
                    href="#"
                    className="text-amber-600 font-medium hover:underline"
                  >
                    Find Events Near You &rarr;
                  </a>
                </div>
              </div>
            </section>
          </div>
        );
      case "help":
        return (
          <div className="animate-in fade-in">
            <div className="bg-slate-100 py-16 text-center">
              <h1 className="text-3xl font-bold text-slate-900 mb-6">
                How can we help you?
              </h1>
              <div className="max-w-xl mx-auto relative px-4">
                <Search className="absolute left-7 top-3.5 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search articles, guides, and FAQs..."
                  className="w-full pl-12 pr-4 py-3 rounded-full border border-slate-300 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div className="max-w-5xl mx-auto px-6 py-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    title: "Getting Started",
                    items: [
                      "Creating an account",
                      "Setting up your profile",
                      "Importing LinkedIn data",
                    ],
                  },
                  {
                    title: "Matching",
                    items: [
                      "How the algorithm works",
                      "Requesting a specific mentor",
                      "Changing your match",
                    ],
                  },
                  {
                    title: "Troubleshooting",
                    items: [
                      "Video call issues",
                      "Resetting password",
                      "Notification settings",
                    ],
                  },
                  {
                    title: "For Admins",
                    items: [
                      "Bulk uploading users",
                      "Exporting reports",
                      "Customizing fields",
                    ],
                  },
                  {
                    title: "Best Practices",
                    items: [
                      "First meeting agenda",
                      "Setting SMART goals",
                      "Ending a mentorship",
                    ],
                  },
                  {
                    title: "Billing",
                    items: [
                      "Managing subscription",
                      "Invoices",
                      "Enterprise plans",
                    ],
                  },
                ].map((cat, i) => (
                  <div
                    key={i}
                    className="bg-white p-6 rounded-xl border border-slate-200"
                  >
                    <h3 className="font-bold text-lg text-slate-900 mb-4">
                      {cat.title}
                    </h3>
                    <ul className="space-y-3">
                      {cat.items.map((item, idx) => (
                        <li key={idx}>
                          <a
                            href="#"
                            className="text-slate-600 hover:text-emerald-600 text-sm flex items-center"
                          >
                            <FileText className="w-3 h-3 mr-2 text-slate-400" />{" "}
                            {item}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case "features":
        return (
          <div className="animate-in fade-in">
            <section className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white py-20 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds.png')] opacity-10"></div>
              <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  Everything You Need to Run Successful Mentorship Programs
                </h1>
                <p className="text-xl text-emerald-100 max-w-3xl mx-auto">
                  Powerful tools designed to help organizations create, manage,
                  and scale mentorship programs that drive real results.
                </p>
              </div>
            </section>

            <section className="py-20 max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  {
                    icon: Sparkles,
                    title: "Smart Auto Matching",
                    description:
                      "Our intelligent algorithm analyzes skills, goals, and compatibility to create perfect mentor-mentee pairs that drive meaningful growth.",
                    bgClass: "bg-emerald-100 dark:bg-emerald-900/30",
                    iconClass: "text-emerald-600 dark:text-emerald-400",
                  },
                  {
                    icon: Target,
                    title: "Goal Tracking & Analytics",
                    description:
                      "Monitor progress, measure program impact, and gain insights into engagement with comprehensive dashboards and reporting.",
                    bgClass: "bg-blue-100 dark:bg-blue-900/30",
                    iconClass: "text-blue-600 dark:text-blue-400",
                  },
                  {
                    icon: MessageSquare,
                    title: "Built-in Communication",
                    description:
                      "Secure messaging, video calls, and group chats keep mentors and mentees connected without leaving the platform.",
                    bgClass: "bg-indigo-100 dark:bg-indigo-900/30",
                    iconClass: "text-indigo-600 dark:text-indigo-400",
                  },
                  {
                    icon: Calendar,
                    title: "Calendar Integration",
                    description:
                      "Sync with Google Calendar to schedule sessions and never miss a meeting. Outlook and Apple Calendar coming soon.",
                    bgClass: "bg-purple-100 dark:bg-purple-900/30",
                    iconClass: "text-purple-600 dark:text-purple-400",
                  },
                  {
                    icon: BookOpen,
                    title: "Resource Library",
                    description:
                      "Curated templates, guides, and recommended reading to support professional development journeys.",
                    bgClass: "bg-amber-100 dark:bg-amber-900/30",
                    iconClass: "text-amber-600 dark:text-amber-400",
                  },
                  {
                    icon: BarChart,
                    title: "Program Analytics",
                    description:
                      "Track participation rates, satisfaction scores, and program ROI with detailed analytics and reporting tools.",
                    bgClass: "bg-rose-100 dark:bg-rose-900/30",
                    iconClass: "text-rose-600 dark:text-rose-400",
                  },
                  {
                    icon: Users2,
                    title: "Bulk Management",
                    description:
                      "Easily invite and manage hundreds of participants with CSV uploads and automated workflows.",
                    bgClass: "bg-teal-100 dark:bg-teal-900/30",
                    iconClass: "text-teal-600 dark:text-teal-400",
                  },
                  {
                    icon: Zap,
                    title: "Customization Options",
                    description:
                      "Customize your program with custom logos, colors, and branded portals that match your organization's identity.",
                    bgClass: "bg-violet-100 dark:bg-violet-900/30",
                    iconClass: "text-violet-600 dark:text-violet-400",
                  },
                  {
                    icon: Shield,
                    title: "Enterprise Security",
                    description:
                      "SOC 2 compliant with SSO integration, data encryption, and comprehensive privacy controls for enterprise needs.",
                    bgClass: "bg-slate-100 dark:bg-slate-800",
                    iconClass: "text-slate-600 dark:text-slate-400",
                  },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className={`${CARD_CLASS} hover:shadow-lg transition-all group`}
                  >
                    <div
                      className={`w-12 h-12 ${feature.bgClass} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <feature.icon
                        className={`w-6 h-6 ${feature.iconClass}`}
                      />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="py-20 bg-slate-50 dark:bg-slate-900">
              <div className="max-w-4xl mx-auto px-6 text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
                  Ready to see it in action?
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                  Schedule a demo to see how Meant2Grow can transform your
                  mentorship program.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => onNavigate("enterprise")}
                    className={BUTTON_PRIMARY + " px-8 py-3 text-base"}
                  >
                    Request Demo <ArrowRight className="w-5 h-5 ml-2 inline" />
                  </button>
                  <button
                    onClick={onSignup}
                    className="px-8 py-3 text-base border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Start Free Trial
                  </button>
                </div>
              </div>
            </section>
          </div>
        );
      case "contact":
        return (
          <div className="animate-in fade-in">
            <section className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white py-20 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds.png')] opacity-10"></div>
              <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  Get in Touch
                </h1>
                <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
                  Have questions? We're here to help. Reach out and we'll get
                  back to you as soon as possible.
                </p>
              </div>
            </section>

            <section className="py-20 max-w-6xl mx-auto px-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                  <div className={CARD_CLASS}>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                      Send us a message
                    </h2>
                    <form className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            First Name
                          </label>
                          <input
                            type="text"
                            className={INPUT_CLASS}
                            placeholder="John"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Last Name
                          </label>
                          <input
                            type="text"
                            className={INPUT_CLASS}
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          className={INPUT_CLASS}
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Organization
                        </label>
                        <input
                          type="text"
                          className={INPUT_CLASS}
                          placeholder="Your Company Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Subject
                        </label>
                        <select className={INPUT_CLASS}>
                          <option>General Inquiry</option>
                          <option>Sales & Pricing</option>
                          <option>Technical Support</option>
                          <option>Partnership Opportunities</option>
                          <option>Feature Request</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Message
                        </label>
                        <textarea
                          rows={6}
                          className={INPUT_CLASS}
                          placeholder="Tell us how we can help..."
                        ></textarea>
                      </div>
                      <button
                        type="submit"
                        className={BUTTON_PRIMARY + " w-full py-3 text-base"}
                      >
                        Send Message{" "}
                        <ArrowRight className="w-5 h-5 ml-2 inline" />
                      </button>
                    </form>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className={CARD_CLASS}>
                    <Mail className="w-8 h-8 text-emerald-600 mb-4" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">
                      Email Us
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                      Send us an email anytime!
                    </p>
                    <a
                      href="mailto:support@meant2grow.com"
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      support@meant2grow.com
                    </a>
                  </div>

                  <div className={CARD_CLASS}>
                    <Phone className="w-8 h-8 text-emerald-600 mb-4" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">
                      Call Us
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                      Mon-Fri from 9am to 5pm EST
                    </p>
                    <a
                      href="tel:+1-555-0123"
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      +1 (555) 012-3456
                    </a>
                  </div>

                  <div className={CARD_CLASS}>
                    <Building className="w-8 h-8 text-emerald-600 mb-4" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">
                      Enterprise Sales
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                      Interested in enterprise features?
                    </p>
                    <button
                      onClick={() => onNavigate("enterprise")}
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Request Demo →
                    </button>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
                    <h3 className="font-bold text-emerald-900 dark:text-emerald-300 mb-2">
                      Response Time
                    </h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      We typically respond within 24 hours during business days.
                      For urgent matters, please call our support line.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );
      case "legal":
        return (
          <div className="max-w-4xl mx-auto px-6 py-20">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
              Legal Documents
            </h1>
            <div className="space-y-12">
              <section>
                <h2 className="flex items-center text-xl font-bold text-slate-800 dark:text-white mb-4">
                  <Shield className="w-5 h-5 mr-2" /> Privacy Policy
                </h2>
                <div className="prose text-slate-600 dark:text-slate-400">
                  <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                    Last updated: January 2025
                  </p>
                  <p className="mb-4">
                    Your privacy is important to us. It is Meant2Grow's policy
                    to respect your privacy regarding any information we may
                    collect from you across our website and platform.
                  </p>
                  <p className="mb-4">
                    We only ask for personal information when we truly need it
                    to provide a service to you. We collect it by fair and
                    lawful means, with your knowledge and consent.
                  </p>
                  <h3 className="font-bold text-slate-900 dark:text-white mt-6 mb-3">
                    Information We Collect
                  </h3>
                  <p className="mb-4">
                    We collect information that you provide directly to us,
                    including name, email address, professional information, and
                    any other information you choose to provide when using our
                    services.
                  </p>
                  <h3 className="font-bold text-slate-900 dark:text-white mt-6 mb-3">
                    How We Use Your Information
                  </h3>
                  <p className="mb-4">
                    We use the information we collect to provide, maintain, and
                    improve our services, process transactions, send
                    communications, and comply with legal obligations.
                  </p>
                  <h3 className="font-bold text-slate-900 dark:text-white mt-6 mb-3">
                    Data Security
                  </h3>
                  <p className="mb-4">
                    We implement appropriate technical and organizational
                    measures to protect your personal information against
                    unauthorized access, alteration, disclosure, or destruction.
                  </p>
                </div>
              </section>
              <section>
                <h2 className="flex items-center text-xl font-bold text-slate-800 dark:text-white mb-4">
                  <FileText className="w-5 h-5 mr-2" /> Terms of Service
                </h2>
                <div className="prose text-slate-600 dark:text-slate-400">
                  <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                    Last updated: January 2025
                  </p>
                  <p className="mb-4">
                    By accessing the website at meant2grow.com and using our
                    platform, you are agreeing to be bound by these terms of
                    service, all applicable laws and regulations, and agree that
                    you are responsible for compliance with any applicable local
                    laws.
                  </p>
                  <h3 className="font-bold text-slate-900 dark:text-white mt-6 mb-3">
                    Use License
                  </h3>
                  <p className="mb-4">
                    Permission is granted to temporarily access and use
                    Meant2Grow's platform for personal or organizational
                    mentorship purposes. This is the grant of a license, not a
                    transfer of title.
                  </p>
                  <h3 className="font-bold text-slate-900 dark:text-white mt-6 mb-3">
                    User Accounts
                  </h3>
                  <p className="mb-4">
                    You are responsible for maintaining the confidentiality of
                    your account credentials and for all activities that occur
                    under your account.
                  </p>
                  <h3 className="font-bold text-slate-900 dark:text-white mt-6 mb-3">
                    Prohibited Uses
                  </h3>
                  <p className="mb-4">
                    You may not use our platform in any way that violates
                    applicable laws, infringes on others' rights, or interferes
                    with the operation of the service.
                  </p>
                  <h3 className="font-bold text-slate-900 dark:text-white mt-6 mb-3">
                    Termination
                  </h3>
                  <p className="mb-4">
                    We reserve the right to terminate or suspend access to our
                    platform immediately, without prior notice, for conduct that
                    we believe violates these Terms of Service or is harmful to
                    other users.
                  </p>
                </div>
              </section>
            </div>
          </div>
        );
      default:
        return <div className="p-20 text-center">Page Not Found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans overflow-x-hidden w-full">
      <Header />
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-white border-b border-slate-200 shadow-xl animate-in slide-in-from-top"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
              <span className="font-bold text-sm text-slate-900">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="px-4 py-4 space-y-1">
              {[
                { label: "Features", route: "features" },
                { label: "How It Works", route: "how-it-works" },
                { label: "Pricing", route: "pricing" },
                { label: "Resources", route: "blog" },
              ].map((item) => (
                <button
                  key={item.route}
                  onClick={() => {
                    onNavigate(item.route);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-2 mt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    onNavigate("contact");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Content />
      <Footer />
    </div>
  );
};

export default PublicPages;
