import express from "express";
import cors from "cors";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

const SKILL_DICTIONARY = [
  "javascript", "typescript", "react", "react native", "node.js", "node", "express", "next.js", "redux",
  "python", "django", "flask", "fastapi", "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch",
  "java", "spring", "spring boot", "kotlin", "android", "swift", "ios", "objective-c",
  "c++", "c#", ".net", "asp.net", "go", "golang", "rust", "ruby", "rails", "php", "laravel",
  "html", "css", "sass", "tailwind", "bootstrap", "material ui",
  "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "dynamodb", "firestore",
  "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform", "ansible", "jenkins", "ci/cd", "devops",
  "git", "github", "gitlab", "bitbucket",
  "rest api", "graphql", "grpc", "microservices",
  "machine learning", "deep learning", "nlp", "computer vision", "data science", "data analysis", "data engineering",
  "tableau", "power bi", "looker", "excel", "advanced excel", "vba",
  "digital marketing", "seo", "sem", "google ads", "facebook ads", "social media marketing", "content marketing", "email marketing", "performance marketing",
  "financial analysis", "financial modeling", "valuation", "accounting", "tally", "gst", "ifrs", "audit", "taxation",
  "ui design", "ux design", "figma", "sketch", "adobe xd", "photoshop", "illustrator",
  "product management", "agile", "scrum", "jira", "confluence", "trello",
  "communication", "leadership", "teamwork", "problem solving", "project management",
  "selenium", "jest", "cypress", "playwright", "junit", "qa", "automation testing",
  "salesforce", "hubspot", "sap", "oracle",
];

const EDUCATION_REGEX = /(B\.?Tech|M\.?Tech|B\.?E\.?|M\.?E\.?|MBA|BBA|BCA|MCA|B\.?Sc|M\.?Sc|B\.?Com|M\.?Com|Ph\.?D|Bachelor|Master|Diploma)[^\n,;]{0,80}/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,3}[\s-]?)?(\d{10}|\d{5}[\s-]?\d{5})/g;
const EXPERIENCE_REGEX = /(\d{1,2})(?:\.\d)?\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)?/i;

function extractName(text, email) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (line.length < 3 || line.length > 60) continue;
    if (/[@\d]/.test(line)) continue;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 5) continue;
    const isTitleCase = words.every((word) => /^[A-Z][a-zA-Z'.-]+$/.test(word));
    if (isTitleCase) return line;
  }
  if (email) {
    const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    return local.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }
  return "";
}
function extractSkills(text) {
  const lower = text.toLowerCase();
  const matched = new Set();
  for (const skill of SKILL_DICTIONARY) {
    const regex = new RegExp(`(^|[^a-z0-9])${skill.replace(/[.+*?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
    if (regex.test(lower)) matched.add(skill.replace(/\b\w/g, (char) => char.toUpperCase()));
  }
  return Array.from(matched).slice(0, 20);
}
function extractEducation(text) {
  const matches = text.match(EDUCATION_REGEX) || [];
  const seen = new Set();
  const result = [];
  for (const raw of matches) {
    const clean = raw.replace(/\s+/g, " ").trim();
    if (seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    result.push({ institution: "", degree: clean });
    if (result.length >= 4) break;
  }
  return result;
}
function extractExperience(text) {
  const match = text.match(EXPERIENCE_REGEX);
  if (!match) return "";
  const years = parseInt(match[1], 10);
  if (years <= 1) return "0-1 years";
  if (years <= 3) return "1-3 years";
  if (years <= 6) return "3-6 years";
  if (years <= 10) return "6-10 years";
  return "10+ years";
}
async function parseBuffer(buffer, mimeType) {
  const type = String(mimeType || "").toLowerCase();
  if (type.includes("pdf")) {
    const result = await pdfParse(buffer);
    return String(result?.text || "");
  }
  if (type.includes("word") || type.includes("docx") || type.includes("officedocument")) {
    const result = await mammoth.extractRawText({ buffer });
    return String(result?.value || "");
  }
  return buffer.toString("utf-8");
}

app.post("/api/parse-resume", async (req, res) => {
  try {
    const { fileBase64, mimeType, fileName } = req.body ?? {};
    if (!fileBase64 || typeof fileBase64 !== "string") return res.status(400).json({ error: "fileBase64 is required." });
    const buffer = Buffer.from(fileBase64, "base64");
    if (buffer.length === 0 || buffer.length > 6 * 1024 * 1024) return res.status(400).json({ error: "Resume file must be between 1 byte and 6 MB." });
    const text = await parseBuffer(buffer, mimeType);
    const cleanText = text.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim();
    if (!cleanText || cleanText.length < 30) return res.status(422).json({ error: "Could not read enough text from this file. Please try a text-based PDF or DOCX." });
    const emailMatch = cleanText.match(EMAIL_REGEX);
    const phoneMatch = cleanText.match(PHONE_REGEX);
    const email = emailMatch ? emailMatch[0] : "";
    const phone = phoneMatch ? phoneMatch[0].trim() : "";
    res.json({
      fileName: String(fileName || "resume"),
      text: cleanText.slice(0, 6000),
      name: extractName(text, email),
      email,
      phone,
      skills: extractSkills(cleanText),
      education: extractEducation(cleanText),
      experience: extractExperience(cleanText),
    });
  } catch (error) {
    console.error("parse-resume failed", error);
    res.status(500).json({ error: "Could not parse the resume. Please try a different file." });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Career Navigator AI backend running on port ${port}`));
