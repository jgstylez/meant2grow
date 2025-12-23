/**
 * Migration script to seed platform resources (discussion guides, templates, videos)
 * Run with: npx ts-node scripts/migrate-platform-resources.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
try {
  // Check if already initialized
  admin.app();
} catch (error) {
  // Not initialized, so initialize it
  // Try to use service account key file if it exists
  const serviceAccountPath = resolve(__dirname, '../meant2grow-dev-dfcfbc9ebeaa.json');
  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'meant2grow-dev',
    });
    console.log('✅ Initialized Firebase Admin with service account');
  } catch (fileError) {
    // Fallback to default credentials (if running on GCP or with GOOGLE_APPLICATION_CREDENTIALS)
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'meant2grow-dev',
    });
    console.log('✅ Initialized Firebase Admin with default credentials');
  }
}

const db = admin.firestore();

// Platform Discussion Guides (from mock data)
const platformGuides = [
  {
    title: 'The First Meeting Checklist',
    readTime: '5 min read',
    description: 'Everything you need to cover in your kickoff session to start on the right foot.',
    author: 'Sarah Jenkins',
    date: 'Oct 12, 2023',
    content: `
      <h3 class="text-xl font-bold mb-4">Setting the Stage</h3>
      <p class="mb-4">The first meeting sets the tone for the entire mentorship. It's not just about logistics; it's about building rapport and psychological safety.</p>
      
      <h4 class="font-bold mb-2">1. Get to Know Each Other</h4>
      <p class="mb-4">Spend the first 15 minutes just talking. Ask about their background, their day-to-day, and what they enjoy outside of work. Authentic connection drives trust.</p>

      <h4 class="font-bold mb-2">2. Define Expectations</h4>
      <p class="mb-4">Discuss communication styles. Do you prefer email, Slack, or text? How often will you meet? Be realistic about time commitments.</p>

      <h4 class="font-bold mb-2">3. Set Initial Goals</h4>
      <p class="mb-4">You don't need a full career plan yet, but identify one "Quick Win" you can tackle in the first month.</p>
      
      <div class="bg-emerald-50 p-4 rounded-lg border-l-4 border-emerald-500 my-6">
        <p class="font-italic text-emerald-800">"The best mentorships are partnerships, not lectures."</p>
      </div>
    `,
    isPlatform: true,
  },
  {
    title: 'Navigating Career Transitions',
    readTime: '10 min read',
    description: 'How to support a mentee changing roles, industries, or seeking promotion.',
    author: 'David Chen',
    date: 'Nov 01, 2023',
    content: `
      <h3 class="text-xl font-bold mb-4">The Pivot Point</h3>
      <p class="mb-4">Career transitions are vulnerable moments. A mentee might feel like an imposter in their new space.</p>
      
      <h4 class="font-bold mb-2">Transferable Skills</h4>
      <p class="mb-4">Help them map their existing skills to the new role's requirements. Often, soft skills like communication and project management are universal.</p>
      
      <h4 class="font-bold mb-2">Networking Strategy</h4>
      <p class="mb-4">Who do they need to know? Help them identify 3 key people in their new desired field and draft outreach messages.</p>
    `,
    isPlatform: true,
  },
  {
    title: 'Giving Constructive Feedback',
    readTime: '8 min read',
    description: 'Frameworks like SBI (Situation-Behavior-Impact) for difficult but necessary conversations.',
    author: 'Admin Team',
    date: 'Sep 15, 2023',
    content: `
      <h3 class="text-xl font-bold mb-4">The SBI Framework</h3>
      <p class="mb-4">Constructive feedback is essential for growth, but it must be delivered thoughtfully.</p>
      
      <h4 class="font-bold mb-2">Situation</h4>
      <p class="mb-4">Describe the specific situation where the behavior occurred. Be objective and factual.</p>
      
      <h4 class="font-bold mb-2">Behavior</h4>
      <p class="mb-4">Focus on the observable behavior, not assumptions about intent or character.</p>
      
      <h4 class="font-bold mb-2">Impact</h4>
      <p class="mb-4">Explain the impact of the behavior on you, the team, or the project. Use "I" statements.</p>
    `,
    isPlatform: true,
  },
  {
    title: 'Ending the Relationship Gracefully',
    readTime: '6 min read',
    description: 'How to wrap up a mentorship cycle positively and maintain the network.',
    author: 'Admin Team',
    date: 'Aug 20, 2023',
    content: `
      <h3 class="text-xl font-bold mb-4">A Graceful Conclusion</h3>
      <p class="mb-4">Every mentorship has a natural end. Ending well preserves the relationship and opens doors for future collaboration.</p>
      
      <h4 class="font-bold mb-2">Celebrate Progress</h4>
      <p class="mb-4">Reflect on what was accomplished together. Acknowledge growth and achievements.</p>
      
      <h4 class="font-bold mb-2">Stay Connected</h4>
      <p class="mb-4">Agree on how you'll stay in touch. This might be quarterly check-ins or simply being available for questions.</p>
    `,
    isPlatform: true,
  },
  {
    title: 'Imposter Syndrome Toolkit',
    readTime: '12 min read',
    description: 'Strategies to help mentees overcome feelings of inadequacy.',
    author: 'Admin Team',
    date: 'Jul 10, 2023',
    content: `
      <h3 class="text-xl font-bold mb-4">Understanding Imposter Syndrome</h3>
      <p class="mb-4">Many high-achievers experience imposter syndrome. It's the feeling that you're not as competent as others perceive you to be.</p>
      
      <h4 class="font-bold mb-2">Normalize the Experience</h4>
      <p class="mb-4">Share that many successful people feel this way. It's not a sign of incompetence.</p>
      
      <h4 class="font-bold mb-2">Reframe Thoughts</h4>
      <p class="mb-4">Help them challenge negative self-talk. Ask: "What evidence do you have that you're not capable?"</p>
      
      <h4 class="font-bold mb-2">Focus on Growth</h4>
      <p class="mb-4">Shift from "I should know this" to "I'm learning this." Growth mindset over fixed mindset.</p>
    `,
    isPlatform: true,
  },
];

// Platform Career Templates
const platformTemplates = [
  {
    title: 'Mentorship Agreement',
    type: 'PDF',
    size: '1.2 MB',
    description: 'Establish clear expectations, confidentiality, and goals for your mentorship relationship.',
    content: `
      <h2>MENTORSHIP AGREEMENT</h2>
      <h3>1. Purpose</h3>
      <p>The purpose of this agreement is to outline the goals and expectations for our mentorship relationship.</p>
      <h3>2. Expectations</h3>
      <p>Both mentor and mentee commit to regular meetings and open communication.</p>
      <h3>3. Confidentiality</h3>
      <p>All discussions are confidential unless otherwise agreed upon.</p>
      <h3>4. Goals</h3>
      <p>Primary goals for this mentorship period:</p>
      <ul>
        <li>Goal 1: [To be filled]</li>
        <li>Goal 2: [To be filled]</li>
        <li>Goal 3: [To be filled]</li>
      </ul>
    `,
    isPlatform: true,
  },
  {
    title: 'Goal Setting Worksheet',
    type: 'DOCX',
    size: '450 KB',
    description: 'A structured framework for setting SMART professional goals and tracking milestones.',
    content: `
      <h2>SMART GOAL WORKSHEET</h2>
      <h3>Specific: What exactly do you want to accomplish?</h3>
      <p>[Your answer here]</p>
      <h3>Measurable: How will you know when you've achieved it?</h3>
      <p>[Your answer here]</p>
      <h3>Achievable: Is this goal realistic given your resources?</h3>
      <p>[Your answer here]</p>
      <h3>Relevant: Does this align with your broader career objectives?</h3>
      <p>[Your answer here]</p>
      <h3>Time-bound: What is your deadline?</h3>
      <p>[Your answer here]</p>
    `,
    isPlatform: true,
  },
  {
    title: 'Meeting Agenda Template',
    type: 'DOCX',
    size: '200 KB',
    description: 'Keep your sessions focused and productive with this standard meeting structure.',
    content: `
      <h2>MEETING AGENDA</h2>
      <p><strong>Date:</strong> [Date]</p>
      <p><strong>Attendees:</strong> [Names]</p>
      <h3>1. Check-in (5 min)</h3>
      <p>How are things going? Any updates since last meeting?</p>
      <h3>2. Review of Action Items (10 min)</h3>
      <p>What progress has been made on previous commitments?</p>
      <h3>3. Core Discussion (30 min)</h3>
      <p>[Main topic for today]</p>
      <h3>4. Action Items & Next Steps (10 min)</h3>
      <p>What will we commit to before next meeting?</p>
      <h3>5. Wrap-up (5 min)</h3>
      <p>Key takeaways and schedule next meeting.</p>
    `,
    isPlatform: true,
  },
  {
    title: 'Individual Development Plan',
    type: 'PDF',
    size: '2.5 MB',
    description: 'Comprehensive long-term career planning document for mentees.',
    content: `
      <h2>INDIVIDUAL DEVELOPMENT PLAN</h2>
      <p><strong>Name:</strong> [Name]</p>
      <p><strong>Role:</strong> [Role]</p>
      <h3>Short-term Goals (6 months):</h3>
      <ul>
        <li>[Goal 1]</li>
        <li>[Goal 2]</li>
        <li>[Goal 3]</li>
      </ul>
      <h3>Long-term Goals (2 years):</h3>
      <ul>
        <li>[Goal 1]</li>
        <li>[Goal 2]</li>
      </ul>
      <h3>Development Areas:</h3>
      <ul>
        <li>[Area 1]</li>
        <li>[Area 2]</li>
      </ul>
    `,
    isPlatform: true,
  },
  {
    title: 'SWOT Analysis Form',
    type: 'PDF',
    size: '800 KB',
    description: 'Identify Strengths, Weaknesses, Opportunities, and Threats in your career path.',
    content: `
      <h2>SWOT ANALYSIS</h2>
      <h3>Strengths:</h3>
      <p>What do you do better than anyone else?</p>
      <ul>
        <li>[Strength 1]</li>
        <li>[Strength 2]</li>
      </ul>
      <h3>Weaknesses:</h3>
      <p>What could you improve?</p>
      <ul>
        <li>[Weakness 1]</li>
        <li>[Weakness 2]</li>
      </ul>
      <h3>Opportunities:</h3>
      <p>What trends or changes could benefit you?</p>
      <ul>
        <li>[Opportunity 1]</li>
        <li>[Opportunity 2]</li>
      </ul>
      <h3>Threats:</h3>
      <p>What challenges might you face?</p>
      <ul>
        <li>[Threat 1]</li>
        <li>[Threat 2]</li>
      </ul>
    `,
    isPlatform: true,
  },
];

// Platform Training Videos
const platformVideos = [
  {
    title: 'The Art of Active Listening',
    duration: '12:45',
    description: 'Improve your communication skills instantly by learning how to truly listen.',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    isPlatform: true,
  },
  {
    title: 'Leadership vs Management',
    duration: '18:20',
    description: 'Understanding the core differences and when to apply each skill set.',
    thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    isPlatform: true,
  },
  {
    title: 'Building Your Personal Brand',
    duration: '15:10',
    description: 'How to stand out in your organization and industry authentically.',
    thumbnail: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    isPlatform: true,
  },
  {
    title: 'Strategic Thinking for Leaders',
    duration: '22:00',
    description: 'Moving beyond day-to-day execution to big picture planning.',
    thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    isPlatform: true,
  },
];

async function migratePlatformResources() {
  console.log('🚀 Starting platform resources migration...\n');

  try {
    // Migrate Discussion Guides
    console.log('📚 Migrating Discussion Guides...');
    for (const guide of platformGuides) {
      const guideRef = db.collection('discussionGuides').doc();
      await guideRef.set({
        ...guide,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  ✅ Created: ${guide.title}`);
    }

    // Migrate Career Templates
    console.log('\n📄 Migrating Career Templates...');
    for (const template of platformTemplates) {
      const templateRef = db.collection('careerTemplates').doc();
      await templateRef.set({
        ...template,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  ✅ Created: ${template.title}`);
    }

    // Migrate Training Videos
    console.log('\n🎥 Migrating Training Videos...');
    for (const video of platformVideos) {
      const videoRef = db.collection('trainingVideos').doc();
      await videoRef.set({
        ...video,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  ✅ Created: ${video.title}`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log(`\nSummary:`);
    console.log(`  - ${platformGuides.length} Discussion Guides`);
    console.log(`  - ${platformTemplates.length} Career Templates`);
    console.log(`  - ${platformVideos.length} Training Videos`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migratePlatformResources()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

