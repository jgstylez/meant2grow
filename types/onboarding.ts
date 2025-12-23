/**
 * Type definitions for onboarding forms
 * Replaces `any` types in onboarding handlers
 */

import { Role } from '../types';

/**
 * Mentor onboarding form data
 */
export interface MentorOnboardingData {
    // Personal Information
    name: string;
    email: string;
    avatar?: string;

    // Professional Information
    jobTitle: string;
    company: string;
    department?: string;
    yearsOfExperience: number;

    // Expertise & Skills
    expertise: string[];
    skills: string[];
    industries: string[];

    // Mentorship Preferences
    mentoringGoals: string[];
    preferredMenteeLevel?: 'junior' | 'mid' | 'senior' | 'any';
    maxMentees?: number;
    availableHoursPerWeek?: number;

    // Communication Preferences
    preferredCommunication?: ('chat' | 'video' | 'phone' | 'email')[];
    timezone?: string;

    // Bio & Introduction
    bio?: string;
    linkedinUrl?: string;

    // Onboarding Status
    onboardingCompleted: boolean;
    onboardingCompletedAt?: string;
}

/**
 * Mentee onboarding form data
 */
export interface MenteeOnboardingData {
    // Personal Information
    name: string;
    email: string;
    avatar?: string;

    // Professional Information
    jobTitle: string;
    company: string;
    department?: string;
    yearsOfExperience: number;

    // Learning Goals
    careerGoals: string[];
    learningObjectives: string[];
    skillsToImprove: string[];

    // Mentor Preferences
    preferredMentorExpertise?: string[];
    preferredIndustries?: string[];
    mentorshipStyle?: 'structured' | 'flexible' | 'project-based' | 'any';

    // Communication Preferences
    preferredCommunication?: ('chat' | 'video' | 'phone' | 'email')[];
    timezone?: string;
    availableHoursPerWeek?: number;

    // Background
    bio?: string;
    linkedinUrl?: string;

    // Onboarding Status
    onboardingCompleted: boolean;
    onboardingCompletedAt?: string;
}

/**
 * Organization admin onboarding form data
 */
export interface AdminOnboardingData {
    // Personal Information
    name: string;
    email: string;
    avatar?: string;

    // Organization Information
    organizationName: string;
    organizationSize?: 'small' | 'medium' | 'large' | 'enterprise';
    industry?: string;

    // Program Goals
    programGoals?: string[];
    expectedParticipants?: number;

    // Onboarding Status
    onboardingCompleted: boolean;
    onboardingCompletedAt?: string;
}

/**
 * Union type for all onboarding data
 */
export type OnboardingData = MentorOnboardingData | MenteeOnboardingData | AdminOnboardingData;

/**
 * Type guard to check if data is mentor onboarding data
 */
export function isMentorOnboardingData(
    data: OnboardingData,
    role: Role
): data is MentorOnboardingData {
    return role === Role.MENTOR && 'expertise' in data;
}

/**
 * Type guard to check if data is mentee onboarding data
 */
export function isMenteeOnboardingData(
    data: OnboardingData,
    role: Role
): data is MenteeOnboardingData {
    return role === Role.MENTEE && 'careerGoals' in data;
}

/**
 * Type guard to check if data is admin onboarding data
 */
export function isAdminOnboardingData(
    data: OnboardingData,
    role: Role
): data is AdminOnboardingData {
    return role === Role.ADMIN && 'organizationName' in data;
}

/**
 * Partial onboarding data for updates
 */
export type PartialMentorOnboardingData = Partial<MentorOnboardingData>;
export type PartialMenteeOnboardingData = Partial<MenteeOnboardingData>;
export type PartialAdminOnboardingData = Partial<AdminOnboardingData>;
