export type Plan = "free" | "premium";

export type ResumeEducation = {
  degree: string;
  institution?: string;
  year?: string;
};

export type ResumeData = {
  skills: string[];
  experience_years: number;
  roles: string[];
  industries: string[];
  education: ResumeEducation[];
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
  resumeFileName: string;
  resumeData?: ResumeData;
  education: ResumeEducation[];
  photoUrl: string;
  plan: Plan;
  applyMonthKey: string;
  applyMonthCount: number;
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
  isIndia?: boolean;
};

export type JobFilters = {
  jobType: string;
  experience: string;
  workMode: string;
  includeInternational: boolean;
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
  suggestions?: string[];
};
