export type Plan = "free" | "premium";

export type ResumeData = {
  skills: string[];
  experience_years: number;
  roles: string[];
  industries: string[];
  education: string[];
  location: string;
};

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  targetRole: string;
  experience: string;
  skills: string[];
  resumeText: string;
  resumeData?: ResumeData;
  resumeHash?: string;
  plan: Plan;
  analysesUsedToday: number;
  analysesDate: string; // ISO date string "YYYY-MM-DD"
  createdAt: string;
  updatedAt: string;
};

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  category: string;
  salary: string;
  description: string;
  url: string;
  source: string;
  postedAt: string;
  tags: string[];
  matchScore: number;
  matchReasons: string[];
  matchPercentage?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
};

export type ApplicationRecord = {
  id: string;
  jobId: string;
  title: string;
  company: string;
  url: string;
  status: "applied" | "saved";
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};
