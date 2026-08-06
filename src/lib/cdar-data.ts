export type Role = "student" | "lecturer" | "admin";

export type MaterialType =
  | "lecture_note"
  | "past_question"
  | "assignment"
  | "manual"
  | "project"
  | "tutorial"
  | "research_paper";

export const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: "lecture_note", label: "Lecture Note" },
  { value: "past_question", label: "Past Question" },
  { value: "assignment", label: "Assignment" },
  { value: "manual", label: "Practical Manual" },
  { value: "project", label: "Project Report" },
  { value: "tutorial", label: "Tutorial" },
  { value: "research_paper", label: "Research Paper" },
];

export const typeLabel = (t: string) => MATERIAL_TYPES.find((m) => m.value === t)?.label ?? t;

export const LEVELS = [100, 200, 300, 400];
export const SEMESTERS = [1, 2];

export type Course = {
  id: number;
  course_code: string;
  course_title: string;
  department: string;
  program: string;
};

export type Material = {
  id: number;
  title: string;
  type: MaterialType;
  course_code: string;
  department: string;
  program: string;
  level: number;
  semester: number;
  file_url: string;
  file_ext: "PDF" | "DOCX" | "PPTX" | "ZIP";
  size_mb: number;
  file_hash?: string;
  uploaded_by: string;
  download_count: number;
  created_at: string;
};

export type Notification = {
  id: number;
  title: string;
  body: string;
  kind: "new_material" | "upload_confirmed" | "system";
  read: boolean;
  created_at: string;
};

export type User = {
  id: number;
  student_id: string | null;
  full_name: string;
  email: string;
  role: Role;
  department: string;
  created_at: string;
  active: boolean;
};

export const relativeDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export type BlogPost = {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  read_minutes: number;
  published_at: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 1,
    title: "How to revise with past questions without memorising answers",
    excerpt:
      "A five-step method for turning five years of past examination papers into a structured revision plan that actually builds understanding.",
    category: "Study skills",
    author: "Dr. K. Mensah",
    read_minutes: 6,
    published_at: "2026-07-28T09:00:00Z",
  },
  {
    id: 2,
    title: "Inside the networking lab: what employers look for in your projects",
    excerpt:
      "Routing tables, documentation and version history — the three things technical interviewers open first when reviewing a student project.",
    category: "Careers",
    author: "Eng. A. Boateng",
    read_minutes: 8,
    published_at: "2026-07-19T09:00:00Z",
  },
  {
    id: 3,
    title: "Why departments are moving lecture notes off WhatsApp",
    excerpt:
      "Informal channels lose files, versions and context. Here is what a structured repository changes for lecturers and class reps alike.",
    category: "Campus",
    author: "Repository Team",
    read_minutes: 4,
    published_at: "2026-07-05T09:00:00Z",
  },
];

export type Ad = {
  id: number;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  tone: "primary" | "gold" | "crimson";
};

export const ADS: Ad[] = [
  {
    id: 1,
    eyebrow: "Sponsored",
    title: "Semester revision bootcamp",
    body: "Six weekend sessions covering the highest-weighted topics across Level 200 and 300 core courses.",
    cta: "Reserve a seat",
    tone: "primary",
  },
  {
    id: 2,
    eyebrow: "Campus notice",
    title: "Print & bind at student rates",
    body: "Bring any downloaded manual or past-question bundle to the campus press for discounted binding.",
    cta: "See rates",
    tone: "gold",
  },
  {
    id: 3,
    eyebrow: "Sponsored",
    title: "CCNA lab access, evenings",
    body: "Book physical router and switch racks for hands-on practice before your practical assessment.",
    cta: "Book a slot",
    tone: "crimson",
  },
];
