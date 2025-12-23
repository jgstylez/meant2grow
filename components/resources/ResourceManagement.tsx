
import React, { useState } from 'react';
import { BackButton } from './BackButton';
import { ManageRecommended } from './ManageRecommended';
import { ManageBlog } from './ManageBlog';
import { ManageGuides } from './ManageGuides';
import { ManageTemplates } from './ManageTemplates';
import { ManageVideos } from './ManageVideos';
import { User, Resource, Role, BlogPost, DiscussionGuide, CareerTemplate, TrainingVideo } from '../../types';

interface ResourceManagementProps {
    user: User;
    customResources: Resource[];
    onAddResource: (r: any) => void;
    blogPosts: BlogPost[];
    onAddBlogPost: (post: Omit<BlogPost, 'id' | 'createdAt'>) => void;
    onUpdateBlogPost: (id: string, updates: Partial<BlogPost>) => void;
    onDeleteBlogPost: (id: string) => void;
    discussionGuides: DiscussionGuide[];
    onAddDiscussionGuide: (guide: Omit<DiscussionGuide, 'id' | 'createdAt'>) => void;
    onUpdateDiscussionGuide: (id: string, updates: Partial<DiscussionGuide>) => void;
    onDeleteDiscussionGuide: (id: string) => void;
    careerTemplates: CareerTemplate[];
    onAddCareerTemplate: (template: Omit<CareerTemplate, 'id' | 'createdAt'>) => void;
    onUpdateCareerTemplate: (id: string, updates: Partial<CareerTemplate>) => void;
    onDeleteCareerTemplate: (id: string) => void;
    trainingVideos: TrainingVideo[];
    onAddTrainingVideo: (video: Omit<TrainingVideo, 'id' | 'createdAt'>) => void;
    onUpdateTrainingVideo: (id: string, updates: Partial<TrainingVideo>) => void;
    onDeleteTrainingVideo: (id: string) => void;
    onBack: () => void;
    initialTab?: 'resources' | 'blog' | 'guides' | 'templates' | 'videos';
    onTemplateSelected?: (template: CareerTemplate) => void;
}

export const ResourceManagement: React.FC<ResourceManagementProps> = ({
    user,
    customResources,
    onAddResource,
    blogPosts,
    onAddBlogPost,
    onUpdateBlogPost,
    onDeleteBlogPost,
    discussionGuides,
    onAddDiscussionGuide,
    onUpdateDiscussionGuide,
    onDeleteDiscussionGuide,
    careerTemplates,
    onAddCareerTemplate,
    onUpdateCareerTemplate,
    onDeleteCareerTemplate,
    trainingVideos,
    onAddTrainingVideo,
    onUpdateTrainingVideo,
    onDeleteTrainingVideo,
    onBack,
    initialTab = 'resources',
    onTemplateSelected
}) => {
    const [manageTab, setManageTab] = useState(initialTab);

    const isPlatformAdmin = user.role === Role.PLATFORM_ADMIN;
    const isOrgAdmin = user.role === Role.ADMIN;
    const canManagePlatform = isPlatformAdmin;
    const canManageOrg = isOrgAdmin || isPlatformAdmin;

    if (!canManageOrg && !canManagePlatform) return null;

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 max-w-4xl mx-auto">
            <BackButton onClick={onBack} />

            <div className="mb-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Resource Management</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {isPlatformAdmin
                        ? "You are a Platform Operator. You can manage resources across all organizations and create platform-wide content."
                        : "You are an Organization Admin. You can manage resources specific to your organization."}
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                {canManageOrg && (
                    <button
                        onClick={() => setManageTab('resources')}
                        className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${manageTab === 'resources'
                            ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        Recommended Reading
                    </button>
                )}
                {canManagePlatform && (
                    <button
                        onClick={() => setManageTab('blog')}
                        className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${manageTab === 'blog'
                            ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        Public Blog
                    </button>
                )}
                {canManageOrg && (
                    <>
                        <button
                            onClick={() => setManageTab('guides')}
                            className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${manageTab === 'guides'
                                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            Discussion Guides
                        </button>
                        <button
                            onClick={() => setManageTab('templates')}
                            className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${manageTab === 'templates'
                                ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            Career Templates
                        </button>
                        <button
                            onClick={() => setManageTab('videos')}
                            className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${manageTab === 'videos'
                                ? 'border-b-2 border-amber-600 text-amber-600 dark:text-amber-400'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            Training Videos
                        </button>
                    </>
                )}
            </div>

            <div className="mt-6">
                {manageTab === 'resources' && canManageOrg && (
                    <ManageRecommended
                        customResources={customResources}
                        onAddResource={onAddResource}
                    />
                )}

                {manageTab === 'blog' && canManagePlatform && (
                    <ManageBlog
                        blogPosts={blogPosts}
                        onAdd={onAddBlogPost}
                        onUpdate={onUpdateBlogPost}
                        onDelete={onDeleteBlogPost}
                    />
                )}

                {manageTab === 'guides' && canManageOrg && (
                    <ManageGuides
                        discussionGuides={discussionGuides}
                        onAdd={onAddDiscussionGuide}
                        onUpdate={onUpdateDiscussionGuide}
                        onDelete={onDeleteDiscussionGuide}
                        canManagePlatform={canManagePlatform}
                        userOrganizationId={user.organizationId}
                        userName={user.name}
                    />
                )}

                {manageTab === 'templates' && canManageOrg && (
                    <ManageTemplates
                        careerTemplates={careerTemplates}
                        onAdd={onAddCareerTemplate}
                        onUpdate={onUpdateCareerTemplate}
                        onDelete={onDeleteCareerTemplate}
                        canManagePlatform={canManagePlatform}
                        userOrganizationId={user.organizationId}
                        onTemplateSelected={onTemplateSelected}
                    />
                )}

                {manageTab === 'videos' && canManageOrg && (
                    <ManageVideos
                        trainingVideos={trainingVideos}
                        onAdd={onAddTrainingVideo}
                        onUpdate={onUpdateTrainingVideo}
                        onDelete={onDeleteTrainingVideo}
                        canManagePlatform={canManagePlatform}
                        userOrganizationId={user.organizationId}
                    />
                )}
            </div>
        </div>
    );
};
