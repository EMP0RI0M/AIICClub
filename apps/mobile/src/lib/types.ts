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

export type ChannelType = "text" | "voice" | "announcement" | "forum" | "stage" | "board" | "docs" | "github" | "canvas" | "incident";
export type Presence = "online" | "idle" | "dnd" | "offline";

export interface SpaceSummary {
  id: string;
  name: string;
  icon?: string | null;
  unread?: boolean;
}

export interface ChannelSummary {
  id: string;
  name: string;
  type: ChannelType;
  unread?: boolean;
  participants?: { id: string; name: string; avatar?: string | null }[];
}

export interface ChannelSection {
  id: string;
  name: string;
  channels: ChannelSummary[];
}

export interface MemberRef {
  id: string;
  name: string;
  avatar?: string | null;
  presence?: Presence;
  roleColor?: string;
}

export interface DMSummary {
  id: string;
  peerId?: string;
  name: string;
  avatar?: string | null;
  presence?: Presence;
  unreadCount?: number;
  lastLabel?: string;
  snippet?: string;
  group?: { id: string; name: string; avatar?: string | null }[];
}

export interface FriendEntry {
  id: string;
  name: string;
  avatar?: string | null;
  presence: Presence;
  status?: string;
  pending?: "incoming" | "outgoing";
}

export interface ChatMessage {
  id: string;
  author: MemberRef;
  at: string;
  text: string;
  pinned?: boolean;
  edited?: boolean;
  replyTo?: { id: string; authorName: string; text: string };
  attachments?: { kind: "image" | "video" | "file" | "gif"; name: string; url?: string; size?: string }[];
  reactions?: { emoji: string; count: number; reacted?: boolean }[];
}

export interface BoardCard {
  id: string;
  title: string;
  label?: string;
  assignee?: MemberRef;
  dueDate?: string;
  overdue?: boolean;
  description?: string;
}

export interface BoardColumn {
  id: string;
  title: string;
  cards: BoardCard[];
}

export interface BoardData {
  id: string;
  name: string;
  sprint?: string;
  columns: BoardColumn[];
}

export interface DocBlock {
  id: string;
  type: "p" | "h1" | "h2" | "h3" | "bullet" | "numbered" | "code" | "quote" | "callout" | "divider";
  text?: string;
  items?: string[];
}

export interface DocContent {
  id: string;
  title: string;
  author: MemberRef;
  editedLabel: string;
  blocks: DocBlock[];
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  repo: string;
  author: string;
  updatedAt: string;
  status: "open" | "draft" | "review" | "merged" | "closed";
}

export interface IncidentMeta {
  status: "active" | "monitoring" | "resolved";
  severity: "P0" | "P1" | "P2" | "P3";
  commander?: MemberRef;
  services: string[];
  duration: string;
  timeline: { at: string; text: string }[];
}
