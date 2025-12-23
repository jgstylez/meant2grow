
import React, { useState, useEffect } from 'react';
import { User, Resource, Role, BlogPost, DiscussionGuide, CareerTemplate, TrainingVideo } from '../types';
import { BookOpen, File, Book, PlayCircle, ArrowRight } from 'lucide-react';
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

  // Recommended resources state
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Permission checks
  const isPlatformAdmin = user.role === Role.PLATFORM_ADMIN;
  const isOrgAdmin = user.role === Role.ADMIN;
  const canManage = isOrgAdmin || isPlatformAdmin;

  // Load recommended reading resources from Gemini
  useEffect(() => {
    const loadRecommended = async () => {
      setLoading(true);
      try {
        const res = await getRecommendedResources(user);
        // Combine custom resources with AI recommendations
        const allResources = [...customResources, ...res];
        setResources(allResources);
      } catch (error) {
        console.error('Error loading recommended resources:', error);
      } finally {
        setLoading(false);
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
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading recommendations...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.length > 0 ? resources.map((res, i) => (
              <ResourceCard key={i} resource={res} />
            )) : (
              <p className="text-slate-500 col-span-full">No recommendations found at this time.</p>
            )}
          </div>
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
          title="Career Templates"
          icon={<File className="w-6 h-6 text-emerald-500" />}
          onManageClick={canManage ? () => { setView('manage'); setManageTab('templates'); } : undefined}
          manageLabel="Manage Templates"
        />
        <ResourceFilters
          currentFilter={resourceFilter}
          onFilterChange={setResourceFilter}
        />
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No templates found.</div>
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
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading guides...</div>
        ) : filteredGuides.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No discussion guides found.</div>
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
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading videos...</div>
        ) : filteredVideos.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No videos found.</div>
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
