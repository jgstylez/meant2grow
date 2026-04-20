
import React, { useState, useEffect } from 'react';
import { User, Resource, Role, BlogPost, DiscussionGuide, CareerTemplate, TrainingVideo } from '../types';
import { BookOpen, File, Book, PlayCircle } from 'lucide-react';
import { getRecommendedResources } from '../services/geminiService';

// Decomposed Components
import { BackButton } from './resources/BackButton';
import { ResourceCard } from './resources/ResourceCard';
import { ResourceHeader } from './resources/ResourceHeader';
import { ResourceFilters, ResourceFilterType } from './resources/ResourceFilters';
import { ResourceLibraryHome } from './resources/ResourceLibraryHome';
import { ResourceManagement } from './resources/ResourceManagement';
import { CareerTemplateView } from './resources/CareerTemplateView';
import { DiscussionGuideView } from './resources/DiscussionGuideView';
import { TrainingVideoView } from './resources/TrainingVideoView';
import { TemplateList } from './resources/TemplateList';
import { GuideList } from './resources/GuideList';
import { VideoList } from './resources/VideoList';
import { ResourceSectionEmptyState } from './resources/ResourceSectionEmptyState';

interface ResourcesProps {
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
}

const Resources: React.FC<ResourcesProps> = ({
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
  onDeleteTrainingVideo
}) => {
  const [view, setView] = useState<'home' | 'recommended' | 'templates' | 'guides' | 'videos' | 'manage'>('home');
  const [manageTab, setManageTab] = useState<'resources' | 'blog' | 'guides' | 'templates' | 'videos'>('resources');
  const [resourceFilter, setResourceFilter] = useState<ResourceFilterType>('all');

  // Detail views state
  const [activeTemplate, setActiveTemplate] = useState<CareerTemplate | null>(null);
  const [activeGuide, setActiveGuide] = useState<DiscussionGuide | null>(null);
  const [activeVideo, setActiveVideo] = useState<TrainingVideo | null>(null);
  const [templateContent, setTemplateContent] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Recommended resources state (async Gemini fetch — only applies to Recommended Reading)
  const [resources, setResources] = useState<any[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  // Permission checks
  const isPlatformOperator = user.role === Role.PLATFORM_OPERATOR;
  const isOrgAdmin = user.role === Role.ADMIN;
  const canManage = isOrgAdmin || isPlatformOperator;

  // Load recommended reading resources from Gemini
  useEffect(() => {
    const loadRecommended = async () => {
      setRecommendedLoading(true);
      try {
        const res = await getRecommendedResources(user);
        // Combine custom resources with AI recommendations
        const allResources = [...customResources, ...res];
        setResources(allResources);
      } catch (error) {
        console.error('Error loading recommended resources:', error);
      } finally {
        setRecommendedLoading(false);
      }
    };
    loadRecommended();
  }, [user, customResources]);

  // Sync template content when activeTemplate changes
  useEffect(() => {
    if (activeTemplate) {
      const initialContent = activeTemplate.content || '';
      const htmlContent = initialContent.includes('<')
        ? initialContent
        : initialContent.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<p><br></p>').join('');
      setTemplateContent(htmlContent || '<p></p>');
    }
  }, [activeTemplate]);

  // Filter helpers
  const getFilteredGuides = () => {
    if (resourceFilter === 'platform') return discussionGuides.filter(g => g.isPlatform);
    if (resourceFilter === 'organization') return discussionGuides.filter(g => !g.isPlatform);
    return discussionGuides;
  };

  const getFilteredTemplates = () => {
    if (resourceFilter === 'platform') return careerTemplates.filter(t => t.isPlatform);
    if (resourceFilter === 'organization') return careerTemplates.filter(t => !t.isPlatform);
    return careerTemplates;
  };

  const getFilteredVideos = () => {
    if (resourceFilter === 'platform') return trainingVideos.filter(v => v.isPlatform);
    if (resourceFilter === 'organization') return trainingVideos.filter(v => !v.isPlatform);
    return trainingVideos;
  };

  const filteredLibraryEmptyCopy = (
    kind: 'templates' | 'guides' | 'videos'
  ): { title: string; description: string } => {
    const byKind = {
      templates: {
        titleAll: 'No documents yet',
        titlePlatform: 'No platform documents',
        titleOrg: 'No organization documents',
        noun: 'documents',
      },
      guides: {
        titleAll: 'No discussion guides yet',
        titlePlatform: 'No platform discussion guides',
        titleOrg: 'No organization discussion guides',
        noun: 'discussion guides',
      },
      videos: {
        titleAll: 'No training videos yet',
        titlePlatform: 'No platform training videos',
        titleOrg: 'No organization training videos',
        noun: 'training videos',
      },
    }[kind];

    if (resourceFilter === 'platform') {
      return {
        title: byKind.titlePlatform,
        description: `There are no platform-wide ${byKind.noun} to show. Try switching the filter to see organization items or all resources.`,
      };
    }
    if (resourceFilter === 'organization') {
      return {
        title: byKind.titleOrg,
        description: `Your organization has not added ${byKind.noun} yet.`,
      };
    }
    return {
      title: byKind.titleAll,
      description: `There are no ${byKind.noun} in the library yet.`,
    };
  };

  // --- RENDERERS ---

  if (activeTemplate) {
    return (
      <CareerTemplateView
        template={activeTemplate}
        content={templateContent}
        setContent={setTemplateContent}
        onBack={() => { setActiveTemplate(null); setTemplateContent(''); }}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
      />
    );
  }

  if (activeGuide) {
    return (
      <DiscussionGuideView
        guide={activeGuide}
        onBack={() => setActiveGuide(null)}
      />
    );
  }

  if (activeVideo) {
    return (
      <TrainingVideoView
        video={activeVideo}
        allVideos={trainingVideos}
        onBack={() => setActiveVideo(null)}
        onSelectVideo={setActiveVideo}
      />
    );
  }

  if (view === 'home') {
    return <ResourceLibraryHome user={user} onViewChange={setView} />;
  }

  if (view === 'manage' && canManage) {
    return (
      <ResourceManagement
        user={user}
        customResources={customResources}
        onAddResource={onAddResource}
        blogPosts={blogPosts}
        onAddBlogPost={onAddBlogPost}
        onUpdateBlogPost={onUpdateBlogPost}
        onDeleteBlogPost={onDeleteBlogPost}
        discussionGuides={discussionGuides}
        onAddDiscussionGuide={onAddDiscussionGuide}
        onUpdateDiscussionGuide={onUpdateDiscussionGuide}
        onDeleteDiscussionGuide={onDeleteDiscussionGuide}
        careerTemplates={careerTemplates}
        onAddCareerTemplate={onAddCareerTemplate}
        onUpdateCareerTemplate={onUpdateCareerTemplate}
        onDeleteCareerTemplate={onDeleteCareerTemplate}
        trainingVideos={trainingVideos}
        onAddTrainingVideo={onAddTrainingVideo}
        onUpdateTrainingVideo={onUpdateTrainingVideo}
        onDeleteTrainingVideo={onDeleteTrainingVideo}
        onBack={() => setView('home')}
        initialTab={manageTab}
        onTemplateSelected={setActiveTemplate}
      />
    );
  }

  if (view === 'recommended') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
        <BackButton onClick={() => setView('home')} />
        <ResourceHeader
          title="Recommended Reading"
          icon={<BookOpen className="w-6 h-6 text-indigo-500" />}
        />
        {recommendedLoading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">Loading recommendations...</div>
        ) : resources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((res, i) => (
              <ResourceCard key={i} resource={res} />
            ))}
          </div>
        ) : (
          <ResourceSectionEmptyState
            icon={BookOpen}
            iconClassName="text-indigo-500 dark:text-indigo-400"
            iconWrapClassName="bg-indigo-50 dark:bg-indigo-950/50"
            title="No reading recommendations yet"
            description={
              canManage
                ? 'Curated picks and custom links will appear here. Add organization resources in the library manager, or check back when suggestions are ready.'
                : 'Nothing is listed yet. Check back later, or ask your administrator if your organization shares custom reading links.'
            }
            action={
              canManage
                ? {
                    label: 'Manage library',
                    onClick: () => {
                      setManageTab('resources');
                      setView('manage');
                    },
                  }
                : undefined
            }
          />
        )}
      </div>
    );
  }

  if (view === 'templates') {
    const filteredTemplates = getFilteredTemplates();
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
        <BackButton onClick={() => setView('home')} />
        <ResourceHeader
          title="Documents"
          icon={<File className="w-6 h-6 text-emerald-500" />}
          onManageClick={canManage ? () => { setView('manage'); setManageTab('templates'); } : undefined}
          manageLabel="Manage documents"
        />
        <ResourceFilters
          currentFilter={resourceFilter}
          onFilterChange={setResourceFilter}
        />
        {filteredTemplates.length === 0 ? (
          <ResourceSectionEmptyState
            icon={File}
            iconClassName="text-emerald-500 dark:text-emerald-400"
            iconWrapClassName="bg-emerald-50 dark:bg-emerald-950/50"
            {...filteredLibraryEmptyCopy('templates')}
            action={
              canManage
                ? {
                    label: 'Manage documents',
                    onClick: () => {
                      setManageTab('templates');
                      setView('manage');
                    },
                    className:
                      'mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-600 dark:bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-colors',
                  }
                : undefined
            }
          />
        ) : (
          <TemplateList templates={filteredTemplates} onSelect={setActiveTemplate} />
        )}
      </div>
    );
  }

  if (view === 'guides') {
    const filteredGuides = getFilteredGuides();
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
        <BackButton onClick={() => setView('home')} />
        <ResourceHeader
          title="Discussion Guides"
          icon={<Book className="w-6 h-6 text-blue-500" />}
          onManageClick={canManage ? () => { setView('manage'); setManageTab('guides'); } : undefined}
          manageLabel="Manage Guides"
          manageColorClass="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600"
        />
        <ResourceFilters
          currentFilter={resourceFilter}
          onFilterChange={setResourceFilter}
          activeColorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
        />
        {filteredGuides.length === 0 ? (
          <ResourceSectionEmptyState
            icon={Book}
            iconClassName="text-blue-500 dark:text-blue-400"
            iconWrapClassName="bg-blue-50 dark:bg-blue-950/50"
            {...filteredLibraryEmptyCopy('guides')}
            action={
              canManage
                ? {
                    label: 'Manage guides',
                    onClick: () => {
                      setManageTab('guides');
                      setView('manage');
                    },
                    className:
                      'mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors',
                  }
                : undefined
            }
          />
        ) : (
          <GuideList guides={filteredGuides} onSelect={setActiveGuide} />
        )}
      </div>
    );
  }

  if (view === 'videos') {
    const filteredVideos = getFilteredVideos();
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
        <BackButton onClick={() => setView('home')} />
        <ResourceHeader
          title="Training Videos"
          icon={<PlayCircle className="w-6 h-6 text-amber-500" />}
          onManageClick={canManage ? () => { setView('manage'); setManageTab('videos'); } : undefined}
          manageLabel="Manage Videos"
          manageColorClass="bg-amber-600 dark:bg-amber-700 hover:bg-amber-700 dark:hover:bg-amber-600"
        />
        <ResourceFilters
          currentFilter={resourceFilter}
          onFilterChange={setResourceFilter}
          activeColorClass="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        />
        {filteredVideos.length === 0 ? (
          <ResourceSectionEmptyState
            icon={PlayCircle}
            iconClassName="text-amber-500 dark:text-amber-400"
            iconWrapClassName="bg-amber-50 dark:bg-amber-950/50"
            {...filteredLibraryEmptyCopy('videos')}
            action={
              canManage
                ? {
                    label: 'Manage videos',
                    onClick: () => {
                      setManageTab('videos');
                      setView('manage');
                    },
                    className:
                      'mt-6 inline-flex items-center justify-center rounded-lg bg-amber-600 dark:bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 dark:hover:bg-amber-400 transition-colors',
                  }
                : undefined
            }
          />
        ) : (
          <VideoList videos={filteredVideos} onSelect={setActiveVideo} />
        )}
      </div>
    );
  }

  return (
    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
      <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">Coming Soon</h2>
      <p>This section is under development.</p>
    </div>
  );
}

export default Resources;
