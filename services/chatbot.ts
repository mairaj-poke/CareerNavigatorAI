import type { ChatMessage, UserProfile } from "@/types";
import { createId } from "@/utils/profile";

const SKILL_TO_ROLES: Record<string, string[]> = {
  python: ["Python Developer", "Backend Engineer", "Data Analyst", "ML Engineer"],
  javascript: ["Frontend Developer", "Full-stack Developer", "React Developer", "Node.js Engineer"],
  typescript: ["Frontend Engineer", "Full-stack TypeScript Developer", "React Engineer"],
  react: ["Frontend Developer", "React Developer", "UI Engineer"],
  "react native": ["Mobile Developer", "React Native Engineer", "Cross-platform Developer"],
  "node.js": ["Backend Engineer", "Node.js Developer", "API Engineer"],
  java: ["Java Developer", "Backend Engineer", "Android Developer"],
  sql: ["Data Analyst", "Database Administrator", "BI Analyst"],
  aws: ["Cloud Engineer", "DevOps Engineer", "Solutions Architect"],
  devops: ["DevOps Engineer", "Site Reliability Engineer", "Cloud Engineer"],
  marketing: ["Digital Marketer", "SEO Specialist", "Content Strategist", "Performance Marketing Manager"],
  "digital marketing": ["Digital Marketing Manager", "SEO Specialist", "Performance Marketer", "Social Media Manager"],
  finance: ["Financial Analyst", "Accountant", "Investment Banker", "Equity Research Analyst"],
  excel: ["Financial Analyst", "Operations Analyst", "Business Analyst"],
  design: ["UI Designer", "UX Designer", "Product Designer", "Visual Designer"],
  figma: ["UI/UX Designer", "Product Designer"],
  sales: ["Sales Executive", "Account Executive", "Business Development Manager"],
  hr: ["HR Generalist", "Talent Acquisition Specialist", "HR Business Partner"],
  data: ["Data Analyst", "Data Engineer", "Data Scientist"],
  "machine learning": ["Machine Learning Engineer", "AI Researcher", "Data Scientist"],
  android: ["Android Developer", "Mobile Engineer"],
  ios: ["iOS Developer", "Mobile Engineer"],
  product: ["Product Manager", "Associate Product Manager", "Product Analyst"],
  testing: ["QA Engineer", "SDET", "Automation Tester"],
};

const SALARY_TABLE: Record<string, { entry: string; mid: string; senior: string }> = {
  "software developer": { entry: "₹4 – ₹8 LPA", mid: "₹10 – ₹22 LPA", senior: "₹25 – ₹50 LPA" },
  "frontend developer": { entry: "₹4 – ₹9 LPA", mid: "₹10 – ₹22 LPA", senior: "₹25 – ₹45 LPA" },
  "backend engineer": { entry: "₹5 – ₹10 LPA", mid: "₹12 – ₹25 LPA", senior: "₹28 – ₹55 LPA" },
  "data analyst": { entry: "₹3.5 – ₹7 LPA", mid: "₹8 – ₹16 LPA", senior: "₹18 – ₹32 LPA" },
  "data scientist": { entry: "₹6 – ₹12 LPA", mid: "₹14 – ₹28 LPA", senior: "₹32 – ₹60 LPA" },
  "financial analyst": { entry: "₹4 – ₹7 LPA", mid: "₹9 – ₹18 LPA", senior: "₹22 – ₹40 LPA" },
  "digital marketer": { entry: "₹3 – ₹6 LPA", mid: "₹7 – ₹15 LPA", senior: "₹18 – ₹35 LPA" },
  "product manager": { entry: "₹8 – ₹14 LPA", mid: "₹18 – ₹32 LPA", senior: "₹35 – ₹70 LPA" },
  "ui designer": { entry: "₹3.5 – ₹7 LPA", mid: "₹8 – ₹16 LPA", senior: "₹18 – ₹32 LPA" },
  "qa engineer": { entry: "₹3 – ₹6 LPA", mid: "₹7 – ₹14 LPA", senior: "₹16 – ₹28 LPA" },
  default: { entry: "₹3 – ₹7 LPA", mid: "₹8 – ₹18 LPA", senior: "₹20 – ₹40 LPA" },
};

type Intent =
  | "greeting"
  | "jobs"
  | "resume"
  | "skills"
  | "interview"
  | "salary"
  | "switch"
  | "support"
  | "thanks"
  | "menu"
  | "fallback";

const INTENT_KEYWORDS: { intent: Intent; words: string[] }[] = [
  { intent: "greeting", words: ["hi", "hello", "hey", "hola", "namaste", "good morning", "good evening"] },
  { intent: "thanks", words: ["thank", "thanks", "thx", "appreciate"] },
  { intent: "menu", words: ["menu", "options", "help me", "what can you do", "start"] },
  { intent: "jobs", words: ["job", "jobs", "role", "roles", "career options", "what can i apply", "apply for", "suggest job", "recommend"] },
  { intent: "resume", words: ["resume", "cv", "improve my profile", "review my", "fix my resume"] },
  { intent: "skills", words: ["skill", "skills", "learn", "course", "study", "grow my career", "upskill"] },
  { intent: "interview", words: ["interview", "questions", "prepare", "prep", "hr round", "technical round"] },
  { intent: "salary", words: ["salary", "pay", "package", "ctc", "earning", "compensation", "stipend"] },
  { intent: "switch", words: ["switch career", "change career", "career change", "transition", "move to", "shift career"] },
  { intent: "support", words: ["support", "contact", "human", "team", "agent", "email", "complaint"] },
];

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase().trim();
  if (!lower) return "fallback";
  for (const entry of INTENT_KEYWORDS) {
    if (entry.words.some((word) => lower.includes(word))) return entry.intent;
  }
  return "fallback";
}

function pickRoles(profile: UserProfile | null): string[] {
  const roles = new Set<string>();
  const skills = (profile?.skills || []).map((s) => s.toLowerCase());
  for (const skill of skills) {
    const matched = SKILL_TO_ROLES[skill];
    if (matched) matched.forEach((role) => roles.add(role));
  }
  if (profile?.targetRole) roles.add(profile.targetRole);
  if (!roles.size) {
    ["Software Developer", "Business Analyst", "Customer Support Specialist"].forEach((r) => roles.add(r));
  }
  return Array.from(roles).slice(0, 6);
}

function salaryFor(profile: UserProfile | null) {
  const role = (profile?.targetRole || "").toLowerCase();
  for (const key of Object.keys(SALARY_TABLE)) {
    if (role.includes(key)) return { role: profile?.targetRole || key, ...SALARY_TABLE[key] };
  }
  return { role: profile?.targetRole || "your role", ...SALARY_TABLE.default };
}

function formatSkills(profile: UserProfile | null) {
  return profile?.skills?.length ? profile.skills.slice(0, 6).join(", ") : "your current skills";
}

const SUGGESTION_SETS: Record<Intent, string[]> = {
  greeting: ["Suggest jobs for me", "Improve my resume", "Interview tips"],
  jobs: ["Improve my resume", "Skills I should learn", "Salary expectations"],
  resume: ["Suggest jobs for me", "Interview preparation", "Skills I should learn"],
  skills: ["Suggest jobs for me", "Interview preparation", "Career switch advice"],
  interview: ["Common HR questions", "Improve my resume", "Salary expectations"],
  salary: ["Suggest jobs for me", "Skills I should learn", "Career switch advice"],
  switch: ["Suggest jobs for me", "Skills I should learn", "Improve my resume"],
  support: ["Suggest jobs for me", "Improve my resume", "Interview tips"],
  thanks: ["Suggest jobs for me", "Improve my resume", "Interview tips"],
  menu: ["Find Jobs", "Improve Resume", "Learn Skills", "Interview Prep"],
  fallback: ["Find Jobs", "Improve Resume", "Learn Skills", "Interview Prep"],
};

export function welcomeMessage(profile: UserProfile | null): ChatMessage {
  const name = profile?.name?.split(" ")[0] || "there";
  return {
    id: createId(),
    role: "assistant",
    createdAt: new Date().toISOString(),
    content: `Hi ${name}! I am your Career Navigator AI assistant. I can help with:\n\n1. Find Jobs that match your skills\n2. Improve your Resume\n3. Suggest Skills to learn\n4. Interview Preparation\n5. Salary insights\n\nWhat would you like help with?`,
    suggestions: SUGGESTION_SETS.menu,
  };
}

export function answerQuestion(text: string, profile: UserProfile | null): ChatMessage {
  const intent = detectIntent(text);
  const skills = formatSkills(profile);
  const roles = pickRoles(profile);

  let content = "";
  switch (intent) {
    case "greeting": {
      const name = profile?.name?.split(" ")[0] || "there";
      content = `Hello ${name}! How can I help your career today?\n\nYou can ask me about jobs, resume tips, skills, interview prep, or salaries.`;
      break;
    }
    case "thanks":
      content = "You are welcome! If you need more career guidance, just ask.";
      break;
    case "menu":
      content = "What would you like help with?\n\n1. Find Jobs\n2. Improve Resume\n3. Learn Skills\n4. Interview Prep\n5. Salary Insights";
      break;
    case "jobs": {
      const list = roles.map((role) => `• ${role}`).join("\n");
      content = `Based on your skills (${skills}), here are roles you can explore:\n\n${list}\n\nWould you like help with resume improvement, interview prep, or skill development next?`;
      break;
    }
    case "resume":
      content = "Here are practical ways to improve your resume:\n\n• Add measurable achievements (e.g., increased sales by 20%)\n• Highlight your top 6-8 skills clearly at the top\n• Keep formatting clean, single column, and ATS friendly\n• Tailor the summary line to the job you are applying for\n• Remove generic phrases like \"hardworking team player\"\n\nWant role-specific resume tips? Tell me the role.";
      break;
    case "skills": {
      const next = roles.slice(0, 3).map((role) => `• Skills required for ${role}`).join("\n") || "• Advanced skills in your current domain";
      content = `Based on your profile, here are recommended next steps to grow:\n\n${next}\n• Industry tools relevant to your role\n• Soft skills like communication and problem-solving\n\nStaying updated with industry trends will boost your career fast.`;
      break;
    }
    case "interview":
      content = "Interview preparation tips:\n\n• Understand the job description in depth\n• Prepare 3-4 STAR stories from past projects\n• Practice common questions:\n  - Tell me about yourself\n  - Strengths and weaknesses\n  - Why this company / role\n  - A challenging project you led\n• Have 2 thoughtful questions ready for the interviewer\n\nWant role-specific interview questions? Tell me the role.";
      break;
    case "salary": {
      const sal = salaryFor(profile);
      content = `Salary depends on experience, skills, and location. Typical India ranges for ${sal.role}:\n\n• Entry-level: ${sal.entry}\n• Mid-level: ${sal.mid}\n• Senior: ${sal.senior}\n\nUpskilling and switching companies every 2-3 years usually increases pay faster.`;
      break;
    }
    case "switch":
      content = "Switching careers is possible with the right plan:\n\n1. Identify transferable skills from your current role\n2. Learn the must-have skills for the new field\n3. Build small projects or earn 1-2 certifications\n4. Update your resume and LinkedIn for the new field\n5. Start with entry-level or hybrid roles in the new field\n\nTell me the field you want to switch to and I will guide you better.";
      break;
    case "support":
      content = "For human support, please contact us at:\n\nsupport@careernavigator.ai\n\nFor anything career related, I am here to help.";
      break;
    default:
      content = "I am not fully sure about that, but I can help with:\n\n• Job recommendations\n• Resume improvement\n• Skill development\n• Interview preparation\n• Salary insights\n\nFor anything else, please contact: support@careernavigator.ai";
  }

  return {
    id: createId(),
    role: "assistant",
    createdAt: new Date().toISOString(),
    content,
    suggestions: SUGGESTION_SETS[intent],
  };
}
