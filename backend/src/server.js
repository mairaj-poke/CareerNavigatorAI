import express from "express";
import cors from "cors";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const app = express();

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json({ limit: "12mb" }));

app.get("/", (_req, res) => res.send("Career Navigator AI Backend is Running"));
app.get("/health", (_req, res) => res.json({ status: "ok", message: "Career Navigator AI Backend Running" }));

// ===================== EXPANDED SKILL DICTIONARY =====================
const SKILL_DICTIONARY = [
  // Web Frontend
  "javascript", "typescript", "react", "react.js", "next.js", "vue", "vue.js", "angular", "svelte",
  "html", "html5", "css", "css3", "tailwind", "tailwindcss", "bootstrap", "sass", "scss", "less",
  "webpack", "vite", "babel", "jquery", "redux", "zustand", "mobx", "recoil",
  // Mobile
  "react native", "expo", "flutter", "dart", "swift", "swiftui", "kotlin", "android", "ios",
  "ionic", "xamarin", "jetpack compose",
  // Backend
  "node.js", "node", "express", "express.js", "nestjs", "fastify", "koa",
  "python", "django", "flask", "fastapi", "celery",
  "java", "spring", "spring boot", "maven", "gradle",
  "c#", ".net", "asp.net", "dotnet",
  "php", "laravel", "symfony", "wordpress",
  "ruby", "ruby on rails", "rails",
  "go", "golang", "rust", "scala", "elixir",
  // Databases
  "sql", "mysql", "postgresql", "postgres", "sqlite", "oracle", "mssql", "sql server",
  "mongodb", "mongoose", "firebase", "firestore", "dynamodb", "cassandra", "redis", "elasticsearch",
  "supabase", "prisma", "sequelize", "typeorm",
  // Cloud & DevOps
  "aws", "amazon web services", "azure", "gcp", "google cloud",
  "docker", "kubernetes", "k8s", "jenkins", "github actions", "gitlab ci", "circleci",
  "terraform", "ansible", "nginx", "apache", "linux", "bash", "shell scripting",
  "ci/cd", "devops", "sre", "cloudformation",
  // Data & AI
  "machine learning", "deep learning", "data science", "artificial intelligence", "ai", "ml",
  "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy", "matplotlib", "seaborn",
  "nlp", "natural language processing", "computer vision", "llm", "langchain", "openai",
  "power bi", "tableau", "data visualization", "excel", "r", "hadoop", "spark", "kafka",
  // Tools
  "git", "github", "gitlab", "bitbucket", "jira", "confluence", "trello", "notion",
  "figma", "sketch", "adobe xd", "invision", "zeplin",
  "postman", "swagger", "graphql", "rest api", "restful", "soap", "grpc", "websocket",
  // Testing
  "jest", "mocha", "cypress", "selenium", "playwright", "testing", "unit testing", "tdd",
  "pytest", "junit", "testng",
  // Soft Skills / Domain
  "agile", "scrum", "kanban", "project management", "product management",
  "ui design", "ux design", "user research", "wireframing", "prototyping",
  "seo", "digital marketing", "content marketing", "social media marketing", "google analytics",
  "sales", "crm", "salesforce", "hubspot",
  "accounting", "finance", "tally", "ms excel",
  "communication", "leadership", "problem solving", "teamwork",
  // India-specific
  "mean stack", "mern stack", "lamp stack", "full stack", "backend development", "frontend development",
  "mobile development", "web development", "software engineering",
];

// ===================== EXPERIENCE LEVEL DETECTION =====================
const EXPERIENCE_LEVELS = [
  { label: "Fresher", patterns: ["fresher", "0 year", "0-1", "no experience", "fresh graduate", "entry level", "junior", "intern", "internship"] },
  { label: "1-3 years", patterns: ["1 year", "2 year", "3 year", "1-2", "2-3", "1 to 2", "2 to 3", "junior", "associate"] },
  { label: "4-6 years", patterns: ["4 year", "5 year", "6 year", "3-5", "4-6", "mid level", "mid-level", "intermediate"] },
  { label: "7-10 years", patterns: ["7 year", "8 year", "9 year", "10 year", "6-8", "7-10", "senior", "lead", "sr."] },
  { label: "10+ years", patterns: ["11 year", "12 year", "13 year", "14 year", "15 year", "10+ year", "principal", "architect", "director", "head of", "vp", "chief", "manager"] },
];

function detectExperience(text) {
  const lower = text.toLowerCase();
  for (const level of EXPERIENCE_LEVELS) {
    for (const pattern of level.patterns) {
      if (lower.includes(pattern)) return level.label;
    }
  }
  return "";
}

// ===================== SKILL EXTRACTION =====================
function extractSkills(text) {
  const lower = text.toLowerCase();
  const found = new Set();
  for (const skill of SKILL_DICTIONARY) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i");
    if (regex.test(lower)) {
      found.add(skill.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
    }
  }
  return Array.from(found);
}

// ===================== NAME EXTRACTION =====================
function extractName(text) {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line.length >= 3 && line.length <= 60 && /^[A-Z][a-zA-Z.\s'-]{2,}$/.test(line) && !/\d/.test(line) && !/[@|•|:|\|]/.test(line) && !/resume|curriculum|cv|profile|objective|summary/i.test(line)) {
      return line;
    }
  }
  return "";
}

// ===================== PHONE EXTRACTION =====================
function extractPhone(text) {
  const patterns = [
    /(?:\+91[\s-]?)?[6-9]\d{9}/,
    /\+?\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].replace(/\s+/g, " ").trim();
  }
  return "";
}

// ===================== EMAIL EXTRACTION =====================
function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : "";
}

// ===================== LOCATION EXTRACTION =====================
const INDIA_CITIES = ["mumbai", "delhi", "bangalore", "bengaluru", "hyderabad", "chennai", "kolkata", "pune", "ahmedabad", "jaipur", "surat", "lucknow", "kanpur", "nagpur", "noida", "gurgaon", "gurugram", "chandigarh", "bhopal", "patna", "vadodara", "coimbatore", "indore", "thiruvananthapuram", "kochi", "visakhapatnam", "agra", "nashik", "madurai", "faridabad", "meerut", "mysuru", "mysore", "bhubaneswar", "varanasi", "rajkot", "ranchi", "amritsar", "allahabad", "prayagraj", "howrah", "jabalpur", "gwalior", "vijayawada"];

function extractLocation(text) {
  const lower = text.toLowerCase();
  for (const city of INDIA_CITIES) {
    if (lower.includes(city)) {
      return city.charAt(0).toUpperCase() + city.slice(1) + ", India";
    }
  }
  const locationMatch = text.match(/(?:location|address|city)[:\s]+([A-Za-z\s,]+)/i);
  if (locationMatch) return locationMatch[1].trim().slice(0, 50);
  return "";
}

// ===================== TARGET ROLE EXTRACTION =====================
const COMMON_ROLES = [
  "software engineer", "software developer", "full stack developer", "frontend developer", "backend developer",
  "mobile developer", "android developer", "ios developer", "react native developer",
  "data scientist", "data analyst", "data engineer", "machine learning engineer", "ai engineer",
  "devops engineer", "cloud engineer", "site reliability engineer",
  "product manager", "project manager", "business analyst",
  "ui designer", "ux designer", "ui/ux designer", "graphic designer",
  "digital marketer", "seo specialist", "content writer", "social media manager",
  "sales executive", "business development executive", "account manager",
  "hr executive", "recruiter", "hr manager",
  "quality assurance engineer", "qa engineer", "test engineer",
  "database administrator", "system administrator", "network engineer",
  "cybersecurity analyst", "information security analyst",
  "financial analyst", "investment analyst", "chartered accountant",
  "java developer", "python developer", "node.js developer", "react developer",
];

function extractTargetRole(text) {
  const lower = text.toLowerCase();
  for (const role of COMMON_ROLES) {
    if (lower.includes(role)) {
      return role.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }
  const objectiveMatch = text.match(/(?:objective|seeking|applying for|position)[:\s]+([^\n.]{5,80})/i);
  if (objectiveMatch) return objectiveMatch[1].trim();
  return "";
}

// ===================== EDUCATION EXTRACTION =====================
function extractEducation(text) {
  const education = [];
  const degreePatterns = [
    /(?:B\.?Tech|B\.?E\.?|B\.?Sc\.?|B\.?Com\.?|B\.?A\.?|M\.?Tech|M\.?E\.?|M\.?Sc\.?|M\.?Com\.?|M\.?B\.?A\.?|Ph\.?D\.?|B\.?C\.?A\.?|M\.?C\.?A\.?|Diploma|PGDM|LLB|MBBS)(?:[\s,.-]+(?:in|from|at|,)?[\s,.-]+([^\n]{3,60}))?/gi,
  ];
  for (const pattern of degreePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const degree = match[0].split(/\n/)[0].trim().slice(0, 100);
      const institution = match[1]?.trim();
      if (degree.length > 2) {
        education.push({ degree, institution: institution || undefined });
      }
      if (education.length >= 4) break;
    }
  }
  return education;
}

// ===================== FILE PARSER =====================
async function parseBuffer(buffer, mimeType) {
  const type = (mimeType || "").toLowerCase();
  if (type.includes("pdf")) {
    const data = await pdfParse(buffer);
    return data.text || "";
  }
  if (type.includes("word") || type.includes("docx")) {
    const data = await mammoth.extractRawText({ buffer });
    return data.value || "";
  }
  return buffer.toString("utf-8");
}

// ===================== RESUME PARSE API =====================
app.post("/api/parse-resume", async (req, res) => {
  try {
    const { fileBase64, mimeType, fileName } = req.body;
    if (!fileBase64) return res.status(400).json({ error: "fileBase64 required" });

    const buffer = Buffer.from(fileBase64, "base64");
    const text = await parseBuffer(buffer, mimeType);
    const trimmedText = text.slice(0, 8000);

    const skills = extractSkills(trimmedText);
    const name = extractName(trimmedText);
    const phone = extractPhone(trimmedText);
    const email = extractEmail(trimmedText);
    const location = extractLocation(trimmedText);
    const experience = detectExperience(trimmedText);
    const targetRole = extractTargetRole(trimmedText);
    const education = extractEducation(trimmedText);

    return res.json({
      fileName: fileName || "resume",
      text: trimmedText,
      name,
      phone,
      email,
      location,
      targetRole,
      experience,
      skills,
      education,
    });
  } catch (err) {
    console.error("parse-resume error:", err);
    res.status(500).json({ error: "Failed to parse resume" });
  }
});

// ===================== AI ANALYSIS =====================
app.post("/api/analyze-resume", async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText) return res.status(400).json({ error: "resumeText required" });
    const skills = extractSkills(resumeText);
    const experience = detectExperience(resumeText);
    const education = extractEducation(resumeText);
    return res.json({ resumeData: { summary: resumeText.slice(0, 500), skills, experience, education } });
  } catch (err) {
    console.error("analyze-resume error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

// ===================== SKILL GAP ANALYSIS =====================
app.post("/api/skill-gap", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    if (!resumeText || !jobDescription) return res.status(400).json({ error: "resumeText and jobDescription required" });
    const resumeSkills = new Set(extractSkills(resumeText).map((s) => s.toLowerCase()));
    const jobSkills = extractSkills(jobDescription);
    const missingSkills = jobSkills.filter((s) => !resumeSkills.has(s.toLowerCase()));
    const matchedSkills = jobSkills.filter((s) => resumeSkills.has(s.toLowerCase()));
    const matchPercent = jobSkills.length ? Math.round((matchedSkills.length / jobSkills.length) * 100) : 0;
    return res.json({ missingSkills, matchedSkills, matchPercent });
  } catch (err) {
    console.error("skill-gap error:", err);
    res.status(500).json({ error: "Skill gap analysis failed" });
  }
});

// ===================== START SERVER =====================
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Career Navigator AI backend running on port ${port}`);
});
