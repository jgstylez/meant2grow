import React, { useState } from "react";
import { Logo } from "./Logo";
import { optimizeImage } from "../services/utils";
import {
  ArrowRight,
  CheckCircle,
  Users,
  GraduationCap,
  Building,
  Globe,
  Target,
  BarChart3,
  MessageSquare,
  Calendar,
  Shield,
  Zap,
  Star,
  Quote,
  TrendingUp,
  Clock,
  Award,
  Menu,
  X,
} from "lucide-react";

interface LandingPageProps {
  onSignup: () => void;
  onLogin: () => void;
  onNavigate: (page: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSignup, onLogin, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden w-full">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onNavigate("landing")}
        >
          <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
          <span className="font-bold text-lg sm:text-xl uppercase tracking-tight">
            Meant2Grow
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <button
            onClick={() => onNavigate("how-it-works")}
            className="hover:text-emerald-600 transition-colors"
          >
            How it Works
          </button>
          <button
            onClick={() => onNavigate("pricing")}
            className="hover:text-emerald-600 transition-colors"
          >
            Pricing
          </button>
          <button
            onClick={() => onNavigate("blog")}
            className="hover:text-emerald-600 transition-colors"
          >
            Resources
          </button>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onLogin}
            className="hidden sm:block text-sm font-bold text-slate-700 hover:text-emerald-600 px-4 py-2"
          >
            Log In
          </button>
          <button
            onClick={onSignup}
            className="bg-emerald-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold hover:bg-emerald-700 transition-shadow shadow-lg shadow-emerald-900/10"
          >
            Get Started
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </nav>

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
              <button
                onClick={() => {
                  onNavigate("how-it-works");
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                How it Works
              </button>
              <button
                onClick={() => {
                  onNavigate("pricing");
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => {
                  onNavigate("blog");
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Resources
              </button>
              <div className="pt-2 mt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    onLogin();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Log In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="relative z-10 animate-in slide-in-from-left duration-700">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-4 sm:mb-6">
              <span className="text-slate-900">A Space Where Leaders</span>{" "}
              <br />
              <span className="text-emerald-600"> Mentor Future Leaders.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 mb-6 sm:mb-8 leading-relaxed max-w-lg">
              Launch and manage powerful mentorship programs that drive
              retention, accelerate career growth, and build stronger teams. All
              in one platform designed for organizations like yours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={onSignup}
                className="bg-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-base sm:text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 flex items-center justify-center"
              >
                Start Your Program{" "}
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </button>
              <button
                onClick={() => onNavigate("how-it-works")}
                className="bg-white text-slate-700 border border-slate-200 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-base sm:text-lg hover:bg-slate-50 transition-colors flex items-center justify-center"
              >
                See How It Works
              </button>
            </div>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <img
                    key={i}
                    src={`https://i.pravatar.cc/100?img=${i + 10}`}
                    alt=""
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white"
                  />
                ))}
              </div>
              <p>Trusted by organizations worldwide</p>
            </div>
          </div>
          <div className="relative lg:h-[600px] hidden md:block animate-in slide-in-from-right duration-1000">
            <div className="absolute top-0 right-0 w-4/5 h-full bg-slate-100 rounded-[40px] -rotate-3"></div>
            <img
              src={optimizeImage("https://images.unsplash.com/photo-1522202176988-66273c2fd55f", 1200)}
              alt="Mentorship"
              className="absolute top-10 right-10 w-4/5 h-4/5 object-cover rounded-[32px] shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500"
            />
            <div className="absolute bottom-20 left-0 bg-white p-6 rounded-2xl shadow-xl max-w-xs animate-bounce [animation-duration:3s]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">New Match!</p>
                  <p className="text-xs text-slate-500">
                    You matched with Sarah.
                  </p>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">
              Everything you need to run successful mentorship programs
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              From smart matching to progress tracking, our platform gives you
              the tools to create meaningful connections that drive real
              results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Community */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Smart Matching
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Smart algorithms analyze skills, goals, and compatibility
                to create perfect mentor-mentee pairs that drive meaningful
                growth.
              </p>
              <button
                onClick={() => onNavigate("community")}
                className="text-emerald-600 font-bold flex items-center group-hover:gap-2 transition-all"
              >
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>

            {/* Card 2: Education */}
            <div className="rounded-3xl relative overflow-hidden group shadow-lg bg-indigo-900 min-h-[320px]">
              <div className="absolute inset-0">
                <img
                  src={optimizeImage("https://images.unsplash.com/photo-1541339907198-e08756dedf3f", 800)}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60"
                  alt="University"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 via-indigo-900/50 to-transparent"></div>
              </div>
              <div className="relative z-10 h-full p-8 flex flex-col justify-end">
                <div className="bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/10">
                  <GraduationCap className="w-6 h-6 text-indigo-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Goal Tracking & Analytics
                </h3>
                <p className="text-indigo-100 text-sm mb-4">
                  Monitor progress, measure program impact, and gain insights
                  into engagement with comprehensive dashboards and reporting.
                </p>
                <button
                  onClick={() => onNavigate("enterprise")}
                  className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold w-max hover:bg-white/20 transition-colors"
                >
                  Learn More
                </button>
              </div>
            </div>

            {/* Card 3: Enterprise */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Building className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Complete Program Management
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Customize your program with branded portals, flexible signup
                forms, and powerful admin tools to manage participants at scale.
              </p>
              <button
                onClick={() => onNavigate("enterprise")}
                className="text-blue-600 font-bold flex items-center group-hover:gap-2 transition-all"
              >
                Explore Features <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">
              Proven results for organizations
            </h2>
            <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
              See how mentorship programs powered by Meant2Grow drive measurable
              impact across organizations.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 mb-2">
                87%
              </div>
              <p className="text-slate-600 font-medium text-sm sm:text-base">
                Employee Retention
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Average increase in retention
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 mb-2">
                4.8x
              </div>
              <p className="text-slate-600 font-medium text-sm sm:text-base">
                Career Growth
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Faster promotion rates
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 mb-2">
                92%
              </div>
              <p className="text-slate-600 font-medium text-sm sm:text-base">
                Satisfaction Rate
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Participants recommend program
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 mb-2">
                2.5k+
              </div>
              <p className="text-slate-600 font-medium text-sm sm:text-base">
                Active Matches
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Successful mentor-mentee pairs
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">
              Get started in minutes, not months
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Our streamlined process makes it easy to launch your mentorship
              program quickly and effectively.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Set Up Your Program",
                description:
                  "Configure your program settings, customize branding, and define participant fields. Our intuitive setup wizard guides you through every step.",
                icon: Building,
              },
              {
                step: "2",
                title: "Invite Participants",
                description:
                  "Send invitations to mentors and mentees via email. Participants complete their profiles with skills, goals, and preferences.",
                icon: Users,
              },
              {
                step: "3",
                title: "Smart Auto Matching",
                description:
                  "Our intelligent matching algorithm analyzes compatibility factors and automatically suggests optimal mentor-mentee pairs.",
                icon: Zap,
              },
              {
                step: "4",
                title: "Launch & Grow",
                description:
                  "Participants connect, set goals, schedule meetings, and track progress. Admins monitor engagement and program health in real-time.",
                icon: TrendingUp,
              },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 h-full">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-lg">
                      {item.step}
                    </div>
                    <item.icon className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {idx < 3 && (
                  <div className="hidden md:block absolute top-12 -right-4 z-10">
                    <ArrowRight className="w-8 h-8 text-slate-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Powerful features for every need
            </h2>
            <p className="text-slate-600 text-lg">
              Comprehensive tools that support every aspect of your mentorship
              program.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MessageSquare,
                title: "Built-in Messaging",
                desc: "Secure, in-platform communication between mentors and mentees with message history and notifications.",
              },
              {
                icon: Calendar,
                title: "Meeting Scheduler",
                desc: "Integrated calendar system for scheduling sessions, sending reminders, and tracking meeting attendance.",
              },
              {
                icon: Target,
                title: "Goal Management",
                desc: "Set, track, and achieve goals with progress monitoring and milestone celebrations.",
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                desc: "Real-time insights into program health, engagement metrics, and participant progress.",
              },
              {
                icon: Shield,
                title: "Security & Privacy",
                desc: "Enterprise-grade security with role-based access control and data encryption.",
              },
              {
                icon: Award,
                title: "Recognition System",
                desc: "Celebrate achievements with ratings, reviews, and recognition badges for outstanding mentors.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                  <feature.icon className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gradient-to-br from-emerald-50 via-teal-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Trusted by leading organizations
            </h2>
            <p className="text-slate-600 text-lg">
              See what program administrators and participants are saying about
              Meant2Grow.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Chen",
                role: "HR Director, TechCorp",
                content:
                  "Meant2Grow transformed our mentorship program. The matching algorithm is incredibly accurate, and our employee retention has improved by 40% since launch.",
                rating: 5,
                avatar: "https://i.pravatar.cc/100?img=12",
              },
              {
                name: "Michael Rodriguez",
                role: "Program Manager, EduVentures",
                content:
                  "The platform is intuitive and powerful. We went from manual matching spreadsheets to a fully automated system in just two weeks. Our mentors love the goal tracking features.",
                rating: 5,
                avatar: "https://i.pravatar.cc/100?img=15",
              },
              {
                name: "Emily Watson",
                role: "Mentee, FinanceFirst",
                content:
                  "I've been matched with an incredible mentor who has helped me navigate my career transition. The platform makes it so easy to schedule meetings and track my progress.",
                rating: 5,
                avatar: "https://i.pravatar.cc/100?img=20",
              },
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <Quote className="w-8 h-8 text-emerald-200 mb-4" />
                <p className="text-slate-700 mb-6 leading-relaxed italic">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-bold text-slate-900">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Perfect for organizations of all sizes
            </h2>
            <p className="text-slate-600 text-lg">
              Whether you're a startup or enterprise, Meant2Grow scales with
              your needs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 text-white">
              <Building className="w-12 h-12 text-emerald-400 mb-6" />
              <h3 className="text-2xl font-bold mb-4">
                Enterprise Organizations
              </h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Scale mentorship across multiple departments and locations.
                Advanced admin controls, custom branding, and enterprise SSO
                integration help you manage programs at scale.
              </p>
              <ul className="space-y-3">
                {[
                  "Multi-department support",
                  "Advanced analytics & reporting",
                  "SSO & security compliance",
                  "Dedicated support",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-10 border border-emerald-100">
              <Users className="w-12 h-12 text-emerald-600 mb-6" />
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Growing Companies
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Launch your first mentorship program quickly and affordably.
                Perfect for startups and mid-size companies looking to boost
                retention and employee development.
              </p>
              <ul className="space-y-3">
                {[
                  "Quick setup & onboarding",
                  "Affordable pricing",
                  "Essential features included",
                  "Community support",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4 sm:mb-6">
            Ready to transform your mentorship program?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-emerald-50 mb-6 sm:mb-8 md:mb-10 leading-relaxed">
            Join hundreds of organizations using Meant2Grow to build stronger
            teams, improve retention, and accelerate career growth.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={onSignup}
              className="bg-white text-emerald-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-base sm:text-lg hover:bg-emerald-50 transition-all shadow-xl flex items-center justify-center"
            >
              Start Free Trial{" "}
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </button>
            <button
              onClick={() => onNavigate("pricing")}
              className="bg-emerald-700/30 backdrop-blur-sm text-white border-2 border-white/30 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-base sm:text-lg hover:bg-emerald-700/50 transition-all flex items-center justify-center"
            >
              View Pricing
            </button>
          </div>
          <p className="mt-6 sm:mt-8 text-emerald-100 text-xs sm:text-sm">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8 sm:py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Logo className="w-6 h-6" />
              <span className="font-bold text-white uppercase tracking-tight">
                Meant2Grow
              </span>
            </div>
            <p className="text-sm mb-4">
              Empowering organizations to build successful mentorship programs
              that drive growth and retention.
            </p>
            <h4 className="font-bold text-white mb-2 text-sm uppercase tracking-wider">
              STAY CONNECTED
            </h4>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter email for updates"
                className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs w-full max-w-[200px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-white placeholder-slate-400 transition-colors"
              />
              <button className="bg-emerald-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-emerald-700">
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
                  className="hover:text-emerald-500 transition-colors"
                  onClick={() => onNavigate("features")}
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  className="hover:text-emerald-500 transition-colors"
                  onClick={() => onNavigate("how-it-works")}
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  className="hover:text-emerald-500 transition-colors"
                  onClick={() => onNavigate("pricing")}
                >
                  Pricing
                </button>
              </li>
              <li>
                <button
                  className="hover:text-emerald-500 transition-colors"
                  onClick={() => onNavigate("enterprise")}
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
                  className="hover:text-emerald-500 transition-colors"
                  onClick={() => onNavigate("blog")}
                >
                  Blog
                </button>
              </li>
              <li>
                <button
                  className="hover:text-emerald-500 transition-colors"
                  onClick={() => onNavigate("community")}
                >
                  Community Hub
                </button>
              </li>
              <li>
                <button
                  className="hover:text-emerald-500 transition-colors"
                  onClick={() => onNavigate("help")}
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
                  className="hover:text-emerald-500 transition-colors"
                  onClick={() => onNavigate("legal")}
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  className="hover:text-emerald-500 transition-colors"
                  onClick={() => onNavigate("legal")}
                >
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-xs">
          <p>&copy; 2025 Meant2Grow. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Globe className="w-4 h-4" />
            <span>English (US)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
