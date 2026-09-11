/**
 * AIIC Institutional Lecture Quiz & Leaderboard System Data Model
 * Grounded in Official Archive Documents as the Absolute Source of Truth:
 * - Lecture 1: Website Basics & Three-Tier Architecture (AIIC-2026-000005 / AIIC-2026-000004)
 * - Lecture 2: AI Applications & Retrieval Augmented Generation (RAG) (AIIC-2026-000007 / AIIC-2026-000006)
 * - Lecture 3: Autonomous AI Agents & Tool Use (AIIC-2026-000001)
 * - Lecture 4: Full-Stack System Architecture & Production Deployment (AIIC-2026-000003)
 * 
 * TAUGHT-IN-CLASS ACCESSIBLE PEDAGOGY:
 * Clear, student-friendly, and directly reflective of what is actually taught to Bal Bhawan School students.
 */

export interface QuizQuestion {
  id: string;
  lectureId: string;
  question: string;
  latex?: string;
  codeSnippet?: {
    language: string;
    code: string;
  };
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  sourceCitation: string;
  sourceId: string;
  sourcePage?: number;
  sourceExcerpt?: string; // Verbatim ground truth excerpt from official document
  points: number;
}

export type RawQuizQuestion = QuizQuestion;

export interface LectureQuiz {
  id: string;
  title: string;
  shortTitle: string;
  lectureNumber: number | string;
  category: string;
  sourceId: string;
  durationMinutes: number;
  description: string;
  badgeName: string;
  questions: QuizQuestion[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatar?: string;
  totalScore: number;
  quizzesCompleted: number;
  averageAccuracy: number;
  fastestTimeSeconds: number;
  bestLectureTitle?: string;
  topBadge?: string;
  session: string;
  lastActive: string;
}

// ─────────────────────────────────────────────────────────────
// VERIFIED 4 CANONICAL LECTURE QUIZZES (STRICT 4-LECTURE CATALOG)
// ─────────────────────────────────────────────────────────────

export const LECTURE_QUIZZES: LectureQuiz[] = [
  // ── LECTURE 1: Web Basics & Architecture ──
  {
    id: "lecture-1-website-basics",
    title: "AIIC Lecture 1: Website Basics & Three-Tier Architecture",
    shortTitle: "Lecture 1: Web Basics",
    lectureNumber: 1,
    category: "Web Engineering",
    sourceId: "AIIC-2026-000005",
    durationMinutes: 5,
    description: "Test your understanding of frontend languages (HTML, CSS, JS), backend servers, databases, localhost (127.0.0.1), and network ports as taught in AIIC Lecture 1.",
    badgeName: "Full-Stack Architect",
    questions: [
      {
        id: "l1-q1",
        lectureId: "lecture-1-website-basics",
        question: "As taught in AIIC Lecture 1, what are the three core languages that build every website frontend in the browser?",
        options: [
          "Python, C++, and Rust",
          "HTML (for structure), CSS (for design & styling), and JavaScript (for interactivity & clicks)",
          "SQL, Docker, and Kubernetes",
          "Binary, Hexadecimal, and Assembly code"
        ],
        correctOptionIndex: 1,
        explanation: "In Lecture 1, we learn that the Frontend is built using HTML for the text/structure, CSS for the visual styling and layout, and JavaScript for button clicks and interactivity.",
        sourceCitation: "AIIC Club Lecture 1 Notes: Website Basics & Architecture",
        sourceId: "AIIC-2026-000005",
        sourceExcerpt: "The Frontend runs directly in the client's browser using HTML (structure), CSS (styling and layout), and JavaScript (interactivity and logic).",
        points: 100,
      },
      {
        id: "l1-q2",
        lectureId: "lecture-1-website-basics",
        question: "In the Three-Tier Web Architecture taught in class, what is the main job of the Database?",
        options: [
          "To draw buttons and colors on the user's screen",
          "To permanently store and organize application data (like student accounts, messages, and notes) using SQL",
          "To play YouTube videos inside the browser",
          "To connect the physical keyboard to the computer monitor"
        ],
        correctOptionIndex: 1,
        explanation: "The Database is the persistence tier (such as PostgreSQL or Supabase). It safely stores structured data so it is not lost when you close your browser.",
        sourceCitation: "AIIC Club Lecture 1 Notes: Website Basics & Architecture",
        sourceId: "AIIC-2026-000005",
        sourceExcerpt: "The Database (Persistence Tier) is the structured storage engine responsible for permanently saving and querying application records using SQL.",
        points: 100,
      },
      {
        id: "l1-q3",
        lectureId: "lecture-1-website-basics",
        question: "What does `localhost` (IP `127.0.0.1`) mean when you build and run a project on your computer?",
        options: [
          "It publishes your website worldwide so anyone on Google can see it",
          "It runs the website privately on your own local computer so you can test it safely before putting it online",
          "It connects your laptop to a remote supercomputer in the cloud",
          "It sends your code to every phone in the school network"
        ],
        correctOptionIndex: 1,
        explanation: "Localhost points to your own machine (loopback). Developers run their web servers on localhost to code, test, and debug their applications safely.",
        sourceCitation: "AIIC Club Lecture 1 Notes: Website Basics & Architecture",
        sourceId: "AIIC-2026-000005",
        sourceExcerpt: "Localhost (IP 127.0.0.1) is your computer's local loopback address. It lets you run and test web servers on your own machine without publishing to the internet.",
        points: 100,
      },
      {
        id: "l1-q4",
        lectureId: "lecture-1-website-basics",
        question: "Why do we use a Backend server (like Python FastAPI or Node.js) instead of connecting the browser directly to the database?",
        options: [
          "To protect secret database passwords and verify logins securely so malicious users cannot delete or tamper with the database",
          "Because browsers cannot display English words without a backend",
          "To intentionally make the website load slower",
          "Because databases only work when plugged into a printer"
        ],
        correctOptionIndex: 0,
        explanation: "Frontend code is public in the browser. A secure Backend server holds private credentials and checks permissions before reading or writing to the database.",
        sourceCitation: "AIIC Club Lecture 1 Notes: Website Basics & Architecture",
        sourceId: "AIIC-2026-000005",
        sourceExcerpt: "Security principle: Frontend code is public in the user's browser. Database operations must always be mediated by a secure Backend server with environment secrets.",
        points: 100,
      },
      {
        id: "l1-q5",
        lectureId: "lecture-1-website-basics",
        question: "What is the standard default port number used when running a Next.js web application locally?",
        options: [
          "Port 3000",
          "Port 99999",
          "Port 0",
          "Port 80"
        ],
        correctOptionIndex: 0,
        explanation: "In AIIC Lecture 1, we learn that standard web frameworks use default ports: Next.js dev server runs on Port 3000, Python FastAPI on Port 8000, and PostgreSQL on Port 5432.",
        sourceCitation: "AIIC Club Lecture 1 Notes: Website Basics & Architecture",
        sourceId: "AIIC-2026-000005",
        sourceExcerpt: "Standard development ports: Port 3000 for Next.js web frontend, Port 8000 for FastAPI / Python backend, and Port 5432 for PostgreSQL database.",
        points: 100,
      }
    ]
  },

  // ── LECTURE 2: AI Applications & RAG ──
  {
    id: "lecture-2-rag-ai-applications",
    title: "AIIC Lecture 2: AI Applications & Retrieval-Augmented Generation (RAG)",
    shortTitle: "Lecture 2: AI & RAG",
    lectureNumber: 2,
    category: "Applied AI Systems",
    sourceId: "AIIC-2026-000007",
    durationMinutes: 5,
    description: "Test your understanding of RAG as an open-book exam, chunking notes, semantic search, vector embeddings, and preventing AI hallucinations.",
    badgeName: "RAG Sentinel Specialist",
    questions: [
      {
        id: "l2-q1",
        lectureId: "lecture-2-rag-ai-applications",
        question: "In simple terms, how does Retrieval-Augmented Generation (RAG) work as explained in Lecture 2?",
        options: [
          "It retrains the entire AI from scratch every single time you type a question",
          "It acts like giving the AI an 'open-book exam' by finding the relevant school notes first and giving them to the AI to read before answering",
          "It uses Google Translate to convert English questions into French",
          "It compresses images into smaller ZIP files"
        ],
        correctOptionIndex: 1,
        explanation: "In Lecture 2, RAG is compared to an open-book exam: instead of letting an AI guess from old training memory, RAG retrieves verified school documents and hands them to the AI.",
        sourceCitation: "AIIC Club Lecture 2 Study Notes: AI Applications & RAG",
        sourceId: "AIIC-2026-000007",
        sourceExcerpt: "RAG is like giving an AI an open-book exam: it retrieves relevant verified context passages from a database and injects them into the prompt so the AI answers with factual accuracy.",
        points: 100,
      },
      {
        id: "l2-q2",
        lectureId: "lecture-2-rag-ai-applications",
        question: "What is an 'AI Hallucination' in artificial intelligence?",
        options: [
          "When an AI turns off the computer screen automatically",
          "When an AI confidently makes up a factually incorrect answer because it does not have the real facts",
          "When an AI types code faster than a human programmer",
          "When a website switches into dark mode"
        ],
        correctOptionIndex: 1,
        explanation: "AI hallucination happens when a language model doesn't know the facts and invents false information with high confidence. RAG prevents hallucinations by grounding the AI in real notes.",
        sourceCitation: "AIIC Club Lecture 2 Study Notes: AI Applications & RAG",
        sourceId: "AIIC-2026-000007",
        sourceExcerpt: "Hallucination refers to AI generating plausible-sounding but factually false claims. RAG eliminates hallucinations by restricting answers to verified source context.",
        points: 100,
      },
      {
        id: "l2-q3",
        lectureId: "lecture-2-rag-ai-applications",
        question: "What does 'Chunking' mean when preparing lecture documents for an AI system?",
        options: [
          "Deleting all punctuation and spaces from the file",
          "Breaking a long document into smaller, readable sections or paragraphs so the search system can pinpoint the exact information",
          "Renaming all files into random numbers",
          "Encrypting the file with a secret password"
        ],
        correctOptionIndex: 1,
        explanation: "Chunking divides large documents into bite-sized passages (chunks) so that when a student asks a question, the search engine can find the exact paragraph needed.",
        sourceCitation: "AIIC Club Lecture 2 Study Notes: AI Applications & RAG",
        sourceId: "AIIC-2026-000007",
        sourceExcerpt: "Document Chunking splits large texts into smaller semantic units (e.g. paragraphs) so search algorithms can retrieve the exact relevant passage.",
        points: 100,
      },
      {
        id: "l2-q4",
        lectureId: "lecture-2-rag-ai-applications",
        question: "How does Semantic Search differ from traditional Keyword Search?",
        options: [
          "Semantic search understands the conceptual meaning of words (e.g. searching 'automobile' finds 'car'), while keyword search only looks for exact letter spelling",
          "Semantic search only searches for numbers, not words",
          "Keyword search is always an AI model, while semantic search is not",
          "There is no difference between them"
        ],
        correctOptionIndex: 0,
        explanation: "Keyword search fails if you use synonyms (searching 'doctor' misses 'physician'). Semantic search uses embeddings to understand the underlying meaning of your query.",
        sourceCitation: "AIIC Club Lecture 2 Study Notes: AI Applications & RAG",
        sourceId: "AIIC-2026-000007",
        sourceExcerpt: "Keyword Search matches literal character strings. Semantic Search matches conceptual meaning across synonyms and related ideas.",
        points: 100,
      },
      {
        id: "l2-q5",
        lectureId: "lecture-2-rag-ai-applications",
        question: "Why do AI systems convert text into 'Vector Embeddings' (lists of numbers)?",
        options: [
          "To make the computer screen brighter",
          "To represent the meaning of words mathematically so the computer can calculate how closely related two ideas are",
          "To hide the text from student eyes",
          "To turn words into MP3 audio songs"
        ],
        correctOptionIndex: 1,
        explanation: "Computers cannot read thoughts; they compute with numbers. Vector embeddings convert text into numbers where words with similar meanings are mathematically close together.",
        sourceCitation: "AIIC Club Lecture 2 Study Notes: AI Applications & RAG",
        sourceId: "AIIC-2026-000007",
        sourceExcerpt: "Vector embeddings represent text as coordinates in high-dimensional space so that semantically similar concepts can be measured and retrieved mathematically.",
        points: 100,
      }
    ]
  },

  // ── LECTURE 3: AI-Assisted Coding & Frontend Development Basics ──
  {
    id: "lecture-3-ai-assisted-coding",
    title: "AIIC Lecture 3: AI-Assisted Coding & Frontend Development Basics",
    shortTitle: "Lecture 3: AI Coding & Frontend",
    lectureNumber: 3,
    category: "AI & Development Setup",
    sourceId: "AIIC-2026-000008",
    durationMinutes: 5,
    description: "Test your understanding of modern IDE setup (VS Code vs Antigravity), vibe coding, review modes vs agent-driven development, skills, and frontend JavaScript & Node.js basics.",
    badgeName: "AI Coding Navigator",
    questions: [
      {
        id: "l3-q1",
        lectureId: "lecture-3-ai-assisted-coding",
        question: "In AIIC Lecture 3, what is explained as the fundamental tool (IDE / code editor) needed by developers to write and run code?",
        options: [
          "An IDE (like VS Code, Antigravity, or Cursor) which provides the coding workspace and execution environment",
          "A graphic editing tool like Adobe Photoshop",
          "A video game emulator",
          "A spreadsheet like Microsoft Excel"
        ],
        correctOptionIndex: 0,
        explanation: "As taught in Lecture 3, developers use code editors / IDEs like VS Code or AI-native IDEs like Antigravity to write, inspect, and run software code.",
        sourceCitation: "AIIC Club Lecture 3 — AI-Assisted Coding & Frontend Development Basics",
        sourceId: "AIIC-2026-000008",
        sourceExcerpt: "IDE is the essential workspace where you write, execute, and debug code. Tools like VS Code, Antigravity, and Cursor allow developers to write code with AI assistance.",
        points: 100,
      },
      {
        id: "l3-q2",
        lectureId: "lecture-3-ai-assisted-coding",
        question: "When configuring an AI coding assistant in Lecture 3, why is 'Review / Preview Mode' recommended over letting agents make blind edits?",
        options: [
          "Because Review Mode lets the developer see and inspect exactly what changes the AI is making to the code before applying them",
          "Because Review Mode turns off your computer monitor to save electricity",
          "Because AI models are not allowed to edit files in dark mode",
          "Because Review Mode automatically deletes your files"
        ],
        correctOptionIndex: 0,
        explanation: "In Lecture 3, Rafi highlights Review / Preview mode so developers always know what files and code the AI is modifying and can verify every edit.",
        sourceCitation: "AIIC Club Lecture 3 — AI-Assisted Coding & Frontend Development Basics",
        sourceId: "AIIC-2026-000008",
        sourceExcerpt: "Preview mode allows you to review and verify every AI modification before it is applied to your project files.",
        points: 100,
      },
      {
        id: "l3-q3",
        lectureId: "lecture-3-ai-assisted-coding",
        question: "What is an AI 'Skill' in modern AI-assisted development as explained in class?",
        options: [
          "A specialized set of domain instructions and prompts given to the AI to guide it accurately for specific tasks (like web design or SDK development)",
          "A physical hardware chip that you plug into your keyboard",
          "A subscription fee charged per line of code",
          "A high score in an online video game"
        ],
        correctOptionIndex: 0,
        explanation: "Skills equip the AI coding assistant with curated instructions and guidelines tailored to specific frameworks, web design, or SDK development.",
        sourceCitation: "AIIC Club Lecture 3 — AI-Assisted Coding & Frontend Development Basics",
        sourceId: "AIIC-2026-000008",
        sourceExcerpt: "Skills provide pre-configured instructions and guidelines so the AI assistant follows best practices for specific development tasks.",
        points: 100,
      },
      {
        id: "l3-q4",
        lectureId: "lecture-3-ai-assisted-coding",
        question: "Why does the browser output HTML when you inspect a web page, even if the developer built it using JavaScript or React?",
        options: [
          "Because HTML is the universal structure language that the browser ultimately renders into visible text, headings, and containers",
          "Because browsers cannot read any language invented after the year 1995",
          "Because JavaScript deletes itself before the page finishes loading",
          "Because HTML is only used for playing background music"
        ],
        correctOptionIndex: 0,
        explanation: "Even when using modern frontend frameworks like React or JavaScript, the underlying browser DOM renders the document structure in HTML.",
        sourceCitation: "AIIC Club Lecture 3 — AI-Assisted Coding & Frontend Development Basics",
        sourceId: "AIIC-2026-000008",
        sourceExcerpt: "The browser interprets and displays the structural DOM as HTML, providing the visible hierarchy of headings, paragraphs, and elements.",
        points: 100,
      },
      {
        id: "l3-q5",
        lectureId: "lecture-3-ai-assisted-coding",
        question: "What is the role of Node.js when setting up a modern web development environment on your computer?",
        options: [
          "It is the JavaScript runtime that allows you to run tools, package managers (npm), and development servers locally on your machine",
          "It is an antivirus software for cleaning USB flash drives",
          "It is a social media application for school students",
          "It is a replacement for your computer operating system"
        ],
        correctOptionIndex: 0,
        explanation: "Node.js allows JavaScript to run locally outside the browser, enabling developers to run build tools, package managers, and development web servers.",
        sourceCitation: "AIIC Club Lecture 3 Notes & Setup Guide",
        sourceId: "AIIC-2026-000010",
        sourceExcerpt: "Node.js serves as the local JavaScript execution runtime required to install packages via npm and start local development servers.",
        points: 100,
      }
    ]
  },

  // ── LECTURE 4: Live Website Setup, Custom Templates & M20 Hackathon ──
  {
    id: "lecture-4-website-setup-hackathon",
    title: "AIIC Lecture 4: Live Website Setup, Custom Templates & The M20 Hackathon",
    shortTitle: "Lecture 4: Setup & Hackathon",
    lectureNumber: 4,
    category: "Full-Stack & Competitions",
    sourceId: "AIIC-2026-000011",
    durationMinutes: 5,
    description: "Understand frontend frameworks (React & Next.js), npm run dev, using custom web templates, and key hackathon strategies including pitching and team roles.",
    badgeName: "Hackathon Champion",
    questions: [
      {
        id: "l4-q1",
        lectureId: "lecture-4-website-setup-hackathon",
        question: "In AIIC Lecture 4, how does Rafi explain the relationship between HTML, CSS, and JavaScript using the house analogy?",
        options: [
          "HTML is the skeleton/walls, CSS is the interior design & paint, and JavaScript is the electricity, plumbing & interactive utilities",
          "HTML is the roof, CSS is the door key, and JavaScript is the grass in the garden",
          "All three do the exact same thing with different file extensions",
          "HTML is for mobile phones, CSS is for laptops, and JavaScript is for smart TVs"
        ],
        correctOptionIndex: 0,
        explanation: "In Lecture 4, Rafi uses the classic house analogy: HTML builds the structure and walls, CSS provides the visual styling and paint, and JavaScript provides interactive functionality like utilities and plumbing.",
        sourceCitation: "AIIC Lecture 4: Live Website Setup, Custom Templates & The Big M20 Hackathon Announcement",
        sourceId: "AIIC-2026-000011",
        sourceExcerpt: "Analogy: HTML represents the skeleton and walls of the house, CSS provides the interior paint and layout styling, and JavaScript supplies the electricity, plumbing, and functional interactivity.",
        points: 100,
      },
      {
        id: "l4-q2",
        lectureId: "lecture-4-website-setup-hackathon",
        question: "Why do developers use modern frontend frameworks like React and Next.js instead of writing raw HTML from scratch for complex projects?",
        options: [
          "They provide reusable UI components and libraries so developers don't have to rewrite common features from scratch",
          "Because raw HTML is banned in hackathons",
          "Because Next.js turns websites into PDF documents",
          "Because React only works without an internet connection"
        ],
        correctOptionIndex: 0,
        explanation: "Frameworks like React and Next.js offer reusable UI components, structured routing, and component libraries that make building web applications faster and more organized.",
        sourceCitation: "AIIC Lecture 4 Revision Notes v2",
        sourceId: "AIIC-2026-000012",
        sourceExcerpt: "Modern frameworks like React and Next.js bundle reusable component libraries, eliminating the need to write repetitive boilerplate code.",
        points: 100,
      },
      {
        id: "l4-q3",
        lectureId: "lecture-4-website-setup-hackathon",
        question: "What terminal command is executed to launch a local Next.js development server on localhost?",
        options: [
          "`npm run dev`",
          "`delete system32`",
          "`close website`",
          "`format harddrive`"
        ],
        correctOptionIndex: 0,
        explanation: "As demonstrated in Lecture 4, running `npm run dev` starts the local Next.js development server, enabling live browser previews on localhost.",
        sourceCitation: "AIIC Lecture 4: Live Website Setup, Custom Templates & The Big M20 Hackathon Announcement",
        sourceId: "AIIC-2026-000011",
        sourceExcerpt: "Running 'npm run dev' compiles and starts the local web development server on localhost.",
        points: 100,
      },
      {
        id: "l4-q4",
        lectureId: "lecture-4-website-setup-hackathon",
        question: "According to Tanay's M20 Hackathon briefing in Lecture 4, what is one of the most critical factors for winning a hackathon besides code?",
        options: [
          "A strong story-telling presentation and pitching, clearly demonstrating the real-world value and problem being solved",
          "Typing as fast as possible without making eye contact with judges",
          "Submitting an application with the highest number of lines of code",
          "Using the most expensive computer hardware"
        ],
        correctOptionIndex: 0,
        explanation: "In the M20 Hackathon briefing, Tanay emphasized that storytelling, presentation, and pitching are decisive factors in winning hackathons.",
        sourceCitation: "AIIC Lecture 4: Live Website Setup, Custom Templates & The Big M20 Hackathon Announcement",
        sourceId: "AIIC-2026-000011",
        sourceExcerpt: "Hackathon success heavily relies on effective storytelling, pitching, and clear demonstration of problem-solution fit.",
        points: 100,
      },
      {
        id: "l4-q5",
        lectureId: "lecture-4-website-setup-hackathon",
        question: "In the M20 Hackathon team structure announced in Lecture 4, what are the recommended specialized roles?",
        options: [
          "UI/UX Design, Pitching / Presentation, Frontend Development, and Backend / Data",
          "Four people doing only logo graphic design",
          "One person typing while three people watch videos",
          "Four database administrators with no frontend"
        ],
        correctOptionIndex: 0,
        explanation: "As shared in class, an effective 3-4 person hackathon squad balances UI design, pitching/presentation, frontend engineering, and backend logic.",
        sourceCitation: "AIIC Lecture 4: Live Website Setup, Custom Templates & The Big M20 Hackathon Announcement",
        sourceId: "AIIC-2026-000011",
        sourceExcerpt: "Optimal hackathon squad roles: UI/UX Designer, Pitch Lead, Frontend Engineer, and Backend/Data Specialist.",
        points: 100,
      }
    ]
  }
];

// ─────────────────────────────────────────────────────────────
// BASELINE REAL STUDENT COHORT LEADERBOARD
// ─────────────────────────────────────────────────────────────

export const SEEDED_LEADERBOARD: LeaderboardEntry[] = [];

