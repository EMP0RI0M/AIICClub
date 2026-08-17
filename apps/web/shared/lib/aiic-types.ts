export interface AIICEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  startAt: string;
  endAt?: string;
  location: string;
  type: "Workshop" | "Competition" | "Seminar" | "Talk" | "Hackathon" | "Meeting" | "Recruitment" | "Exhibition" | "Internal" | "Other";
  status: "Upcoming" | "Ongoing" | "Past";
  coverImage?: string;
  organizer: string;
  registrationUrl?: string;
  capacity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AIICProject {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: "Research" | "Prototype" | "Active" | "Completed" | "Archived";
  category: "AI" | "Software" | "Hardware" | "Research" | "Robotics" | "Data" | "Security" | "Innovation" | "Other";
  coverImage?: string;
  gallery?: string[];
  technologies: string[];
  repositoryUrl?: string;
  demoUrl?: string;
  documentationUrl?: string;
  team: string[];
  startDate?: string;
  endDate?: string;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIICAchievement {
  id: string;
  title: string;
  description: string;
  recipient: string;
  category: "Competition" | "Research" | "Academic" | "Engineering" | "Hackathon" | "Publication" | "Leadership" | "Club" | "Other";
  date: string;
  organization: string;
  rankResult?: string;
  proofLink?: string;
  image?: string;
  featured?: boolean;
  createdAt: string;
}

export interface AIICMemberProfile {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  role: string;
  year?: string;
  section?: string;
  bio?: string;
  interests?: string[];
  skills?: string[];
  githubUrl?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  isLeadership?: boolean;
  leadershipTitle?: string;
  leadershipOrder?: number;
}

export interface AIICAnnouncement {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string;
  coverImage?: string;
  publishedAt: string;
  category: "Club" | "General" | "Workshop" | "Alert" | "Milestone" | "Release" | "Event" | "Achievement";
  priority?: "normal" | "important" | "urgent" | "pinned";
  isPinned?: boolean;
  featured?: boolean;
}

export interface AIICArchiveEntry {
  id: string;
  year: number;
  date: string;
  title: string;
  description: string;
  category: "Event" | "Project" | "Achievement" | "Leadership" | "Milestone" | "Document";
  coverImage?: string;
  link?: string;
}

export interface AIICResource {
  id: string;
  title: string;
  description: string;
  category: "Tutorial" | "Research Paper" | "Guide" | "Workshop Material" | "Template" | "Documentation";
  author: string;
  url: string;
  visibility: "public" | "members";
  createdAt: string;
}

export interface AIICApplication {
  id: string;
  name: string;
  email: string;
  classYear: string;
  section?: string;
  interests: string[];
  skills: string[];
  projects?: string;
  whyJoin: string;
  portfolioUrl?: string;
  githubUrl?: string;
  additionalInfo?: string;
  status: "Submitted" | "Under Review" | "Interview" | "Accepted" | "Rejected" | "Waitlisted";
  notes?: string;
  createdAt: string;
}
