import { Role, User, Match, MatchStatus, Goal, Rating, Invitation } from "./types";

export const MOCK_USERS: User[] = [
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@techcorp.com',
    role: Role.MENTOR,
    avatar: 'https://picsum.photos/100/100?random=1',
    title: 'VP of Marketing',
    company: 'TechCorp Solutions',
    skills: ['Brand Strategy', 'Team Leadership', 'Digital Marketing', 'Public Speaking'],
    bio: '15+ years leading global marketing teams. Passionate about helping emerging leaders find their voice and navigate corporate strategy.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u2',
    name: 'David Chen',
    email: 'david.c@innovate.io',
    role: Role.MENTOR,
    avatar: 'https://picsum.photos/100/100?random=2',
    title: 'Senior Software Architect',
    company: 'Innovate.io',
    skills: ['System Design', 'Cloud Architecture', 'Python', 'Mentoring Junior Devs'],
    bio: 'Tech veteran with a love for clean code and scalable systems. I enjoy helping engineers bridge the gap to senior roles.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u3',
    name: 'Elena Rodriguez',
    email: 'elena.r@designstudio.com',
    role: Role.MENTEE,
    avatar: 'https://picsum.photos/100/100?random=3',
    title: 'Junior UX Designer',
    company: "Creative Design Studio",
    skills: ['Figma', 'User Research', 'Prototyping'],
    goals: ['Master Design Systems', 'Improve Presentation Skills', 'Lead a Project'],
    bio: 'Creative designer with 1 year of experience. Eager to learn how to advocate for design decisions in cross-functional teams.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u4',
    name: 'Michael Chang',
    email: 'mike.c@salesforce.net',
    role: Role.MENTEE,
    avatar: 'https://picsum.photos/100/100?random=4',
    title: 'Sales Associate',
    company: 'Global Sales Force',
    skills: ['CRM', 'Negotiation', 'Cold Calling'],
    goals: ['Close Enterprise Deals', 'Sales Management', 'Strategic Partnerships'],
    bio: 'High-energy sales professional looking to move from mid-market to enterprise sales. Need guidance on handling complex negotiations.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'a1',
    name: 'Admin Alice',
    email: 'admin@meant2grow.com',
    role: Role.ADMIN,
    avatar: 'https://picsum.photos/100/100?random=5',
    title: 'People Operations Director',
    company: 'Meant2Grow Admin',
    skills: ['Talent Development', 'Program Management'],
    bio: 'Program Coordinator'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u5',
    name: 'Jessica Williams',
    email: 'jess.w@fintech.com',
    role: Role.MENTEE,
    avatar: 'https://picsum.photos/100/100?random=6',
    title: 'Customer Success Manager',
    company: 'FinTech Startup',
    skills: ['Client Relations', 'Problem Solving'],
    goals: ['Product Management Transition', 'Data Analysis', 'Time Management'],
    bio: 'Customer-obsessed CSM looking to pivot into Product Management. I want to learn how to translate user feedback into features.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u6',
    name: 'Marcus Johnson',
    email: 'marcus.j@hrpro.org',
    role: Role.MENTEE,
    avatar: 'https://picsum.photos/100/100?random=7',
    title: 'HR Specialist',
    company: 'Enterprise HR',
    skills: ['Recruiting', 'Employee Relations'],
    goals: ['SHRM Certification', 'People Analytics', 'Leadership'],
    bio: 'HR professional with 3 years experience. Currently working on certification and looking for mentorship in strategic HR.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u7',
    name: 'Olivia Smith',
    email: 'olivia.s@intern.com',
    role: Role.MENTEE,
    avatar: 'https://picsum.photos/100/100?random=8',
    title: 'Marketing Intern',
    company: 'StartUp Inc.',
    skills: ['Social Media', 'Content Writing'],
    goals: ['Secure Full-Time Role', 'SEO Mastery', 'Networking'],
    bio: 'Recent grad and current intern. Looking for guidance on how to turn this internship into a permanent position.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u8',
    name: 'Thomas Brown',
    email: 't.brown@data.io',
    role: Role.MENTEE,
    avatar: 'https://picsum.photos/100/100?random=9',
    title: 'Data Analyst',
    company: "Data Corp",
    skills: ['SQL', 'Tableau', 'Excel'],
    goals: ['Learn Machine Learning', 'Data Storytelling', 'Public Speaking'],
    bio: 'Data analyst interested in moving into data science. I want to improve my ability to present complex data to non-technical stakeholders.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u9',
    name: 'Emily Davis',
    email: 'emily.d@product.net',
    role: Role.MENTEE,
    avatar: 'https://picsum.photos/100/100?random=10',
    title: 'Associate Product Manager',
    company: "Product Led Co.",
    skills: ['Agile', 'User Stories'],
    goals: ['Senior PM Role', 'Product Strategy', 'Stakeholder Management'],
    bio: 'Passionate about building great products. Aspiring to lead my own product line within the next 2 years.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u10',
    name: 'Robert Wilson',
    email: 'r.wilson@corp.org',
    role: Role.MENTOR,
    avatar: 'https://picsum.photos/100/100?random=11',
    title: 'Chief Operating Officer',
    company: 'Global Corp',
    skills: ['Operations', 'Executive Leadership', 'Strategy', 'Scaling Teams'],
    bio: 'COO with 20 years experience scaling organizations. I enjoy helping rising stars understand the operational backbone of a business.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u11',
    name: 'Linda Martinez',
    email: 'linda.m@finance.com',
    role: Role.MENTOR,
    avatar: 'https://picsum.photos/100/100?random=12',
    title: 'CFO',
    company: 'Finance Solutions',
    skills: ['Financial Planning', 'Mergers & Acquisitions', 'Board Relations'],
    bio: 'Dedicated to financial excellence. I love teaching others about the financial levers that drive business growth.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u12',
    name: 'Kevin O\'Connor',
    email: 'kevin.o@logistics.org',
    role: Role.MENTOR,
    avatar: 'https://picsum.photos/100/100?random=13',
    title: 'Supply Chain Director',
    company: 'Logistics Giant',
    skills: ['Logistics', 'Team Management', 'Crisis Management'],
    bio: 'Thrives in chaos. I help managers develop the steely calm needed for high-pressure operational roles.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u13',
    name: 'Rachel Green',
    email: 'rachel.g@creative.edu',
    role: Role.MENTEE,
    avatar: 'https://picsum.photos/100/100?random=14',
    title: 'Graphic Designer',
    company: 'Creative Agency',
    skills: ['Adobe Suite', 'Typography'],
    goals: ['Art Direction', 'Motion Graphics', 'Client Management'],
    bio: 'Designer looking to step up into Art Direction. Looking for advice on how to manage creative teams.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u14',
    name: 'James Miller',
    email: 'james.m@consulting.com',
    role: Role.MENTEE,
    avatar: 'https://picsum.photos/100/100?random=15',
    title: 'Management Consultant',
    company: 'Top Tier Consulting',
    skills: ['Analysis', 'Slide Building', 'Research'],
    goals: ['MBA Application', 'Project Leadership', 'Industry Exit'],
    bio: 'Consultant looking to eventually transition into industry strategy. Seeking mentorship on career pathing.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u15',
    name: 'Sophia Liu',
    email: 'sophia.l@biotech.org',
    role: Role.MENTOR,
    avatar: 'https://picsum.photos/100/100?random=16',
    title: 'Head of R&D',
    company: 'BioTech Innovations',
    skills: ['Research', 'Innovation Management', 'Patents', 'Leadership'],
    bio: 'Bridging the gap between science and business. I can help you navigate technical career ladders.'
  },
  {
    organizationId: 'org1', createdAt: '2023-01-01T00:00:00.000Z', id: 'u16',
    name: 'Daniel Kim',
    email: 'daniel.k@legal.org',
    role: Role.MENTEE,
    avatar: 'https://picsum.photos/100/100?random=17',
    title: 'Legal Associate',
    company: 'Law Firm LLP',
    skills: ['Contract Law', 'Research'],
    goals: ['Partner Track', 'Corporate Law', 'Negotiation'],
    bio: 'Associate at a busy firm. Working towards partnership and looking for mentorship on work-life balance and client development.'
  }
];

export const MOCK_MATCHES: Match[] = [
  {
    organizationId: 'org1', id: 'm1',
    mentorId: 'u1',
    menteeId: 'u4',
    status: MatchStatus.ACTIVE,
    startDate: '2023-10-15',
  }
];

export const MOCK_GOALS: Goal[] = [
  {
    organizationId: 'org1', id: 'g1',
    userId: 'u3',
    title: 'Master Design Systems',
    description: 'Complete advanced Figma course and build a sample system.',
    progress: 35,
    status: 'In Progress',
    dueDate: '2023-12-31'
  },
  {
    organizationId: 'org1', id: 'g2',
    userId: 'u4',
    title: 'Close Enterprise Deals',
    description: 'Shadow 5 enterprise calls and lead one negotiation.',
    progress: 60,
    status: 'In Progress',
    dueDate: '2023-11-20'
  }
];

export const MOCK_RATINGS: Rating[] = [
  {
    organizationId: 'org1', id: 'r1',
    fromUserId: 'u4',
    toUserId: 'u1',
    score: 5,
    comment: 'Sarah gave me incredible advice on how to handle the objection handling in my recent pitch!',
    isApproved: false,
    date: '2023-10-20'
  }
];

export const MOCK_INVITATIONS: Invitation[] = [
  {
    organizationId: 'org1', id: 'i1',
    email: 'jessica.lee@example.com',
    name: 'Jessica Lee',
    role: Role.MENTEE,
    status: 'Pending',
    sentDate: '2023-10-25',
    inviterId: 'u1',
    token: 'mock-token-1'
  },
  {
    organizationId: 'org1', id: 'i2',
    email: 'alex.chen@example.com',
    name: 'Alex Chen',
    role: Role.MENTOR,
    status: 'Accepted',
    sentDate: '2023-10-20',
    inviterId: 'u1',
    token: 'mock-token-2'
  }
];

// Predefined skills list for dropdown selection
export const PREDEFINED_SKILLS = [
  // Leadership & Management
  'Leadership',
  'Team Management',
  'People Management',
  'Executive Leadership',
  'Strategic Planning',
  'Change Management',
  'Crisis Management',
  'Project Management',
  'Program Management',
  
  // Product & Strategy
  'Product Strategy',
  'Product Management',
  'Product Development',
  'Agile',
  'Scrum',
  'User Stories',
  'Roadmap Planning',
  'Stakeholder Management',
  
  // Technical Skills
  'Software Development',
  'System Design',
  'Cloud Architecture',
  'Python',
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'SQL',
  'Machine Learning',
  'Data Science',
  'DevOps',
  'Cybersecurity',
  
  // Marketing & Sales
  'Digital Marketing',
  'Brand Strategy',
  'Content Marketing',
  'SEO',
  'Social Media',
  'Public Speaking',
  'Sales',
  'Negotiation',
  'Client Relations',
  'CRM',
  
  // Design & Creative
  'UX Design',
  'UI Design',
  'User Research',
  'Figma',
  'Prototyping',
  'Design Systems',
  'Graphic Design',
  'Adobe Suite',
  'Typography',
  'Motion Graphics',
  
  // Business & Finance
  'Business Strategy',
  'Financial Planning',
  'Mergers & Acquisitions',
  'Operations',
  'Supply Chain',
  'Logistics',
  'Analytics',
  'Data Analysis',
  'Business Development',
  
  // HR & People
  'Talent Development',
  'Recruiting',
  'Employee Relations',
  'People Analytics',
  'Performance Management',
  
  // Communication & Soft Skills
  'Communication',
  'Presentation Skills',
  'Public Speaking',
  'Networking',
  'Mentoring',
  'Coaching',
  'Time Management',
  'Problem Solving',
  
  // Industry Specific
  'Healthcare',
  'Legal',
  'Contract Law',
  'Compliance',
  'Regulatory Affairs',
  'Research',
  'Innovation Management',
  'Patents',
];