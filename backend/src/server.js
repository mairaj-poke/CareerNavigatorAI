import express from "express";
import cors from "cors";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const app = express();

// ===================== MIDDLEWARE =====================
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "*",
  })
);

app.use(express.json({ limit: "12mb" }));

// ===================== HEALTH CHECK (IMPORTANT FOR RAILWAY) =====================
app.get("/", (_req, res) => {
  res.send("Career Navigator AI Backend is Running");
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Career Navigator AI Backend Running",
  });
});

// ===================== SKILL DICTIONARY =====================
const SKILL_DICTIONARY = [
  "javascript", "typescript", "react", "react native", "node.js", "node", "express", "next.js",
  "redux", "python", "django", "flask", "fastapi",
  "java", "spring", "kotlin", "android", "swift",
  "html", "css", "tailwind", "bootstrap",
  "sql", "mysql", "postgresql", "mongodb",
  "aws", "docker", "kubernetes", "git",
  "rest api", "graphql",
  "machine learning", "data science",
  "figma", "ui design"
];

// ===================== SKILL EXTRACTION =====================
function extractSkills(text) {
  const lower = text.toLowerCase();
  const found = new Set();

  for (const skill of SKILL_DICTIONARY) {
    if (lower.includes(skill)) {
      found.add(skill);
    }
  }

  return Array.from(found);
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

    if (!fileBase64) {
      return res.status(400).json({ error: "fileBase64 required" });
    }

    const buffer = Buffer.from(fileBase64, "base64");
    const text = await parseBuffer(buffer, mimeType);

    return res.json({
      fileName: fileName || "resume",
      text: text.slice(0, 5000),
      skills: extractSkills(text),
    });

  } catch (err) {
    console.error("parse-resume error:", err);
    res.status(500).json({ error: "Failed to parse resume" });
  }
});

// ===================== AI ANALYSIS (COST OPTIMIZED) =====================
app.post("/api/analyze-resume", async (req, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText) {
      return res.status(400).json({ error: "resumeText required" });
    }

    // ⚡ LIGHTWEIGHT MODE (NO GEMINI COST BURN)
    const resumeData = {
      summary: resumeText.slice(0, 500),
      skills: extractSkills(resumeText),
      experience: "Auto-detected (basic mode)",
      education: [],
    };

    return res.json({ resumeData });

  } catch (err) {
    console.error("analyze-resume error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

// ===================== START SERVER =====================
const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`🚀 Career Navigator AI backend running on port ${port}`);
});