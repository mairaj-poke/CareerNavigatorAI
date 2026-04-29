import express from "express";
import cors from "cors";

const app = express();

const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : {}));
app.use(express.json({ limit: "64kb" }));

app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

// ── AI Career Coach ──────────────────────────────────────────────────────────
app.post("/api/ai-career", async (req, res) => {
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "OPENAI_API_KEY is not configured." });

  const { message, profile, history } = req.body ?? {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: "Message is required." });
  if (message.length > 2000) return res.status(400).json({ error: "Message too long." });

  const profileSummary = profile
    ? `Name: ${profile.name || "User"}\nTarget role: ${profile.targetRole || "Not set"}\nExperience: ${profile.experience || "Not set"}\nLocation: ${profile.location || "India"}\nSkills: ${(profile.skills || []).join(", ")}\nResume summary: ${(profile.resumeText || "").slice(0, 2400)}`
    : "No profile provided.";

  const messages = [
    { role: "system", content: "You are Career Navigator AI, a practical career coach for Indian job seekers. Give concise, specific guidance. Use bullet points when useful. Do not invent job links or employer claims." },
    { role: "system", content: profileSummary },
    ...(Array.isArray(history) ? history.slice(-8).map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: String(item.content || "") })) : []),
    { role: "user", content: message },
  ];

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", messages, temperature: 0.45, max_tokens: 700 }),
    });
    if (!response.ok) return res.status(502).json({ error: "AI coach is temporarily unavailable." });
    const data = await response.json();
    res.json({ reply: data.choices?.[0]?.message?.content || "I could not generate a useful response. Please try again." });
  } catch (err) {
    console.error("ai-career error:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "AI coach failed to respond." });
  }
});

// ── Resume Analyser ──────────────────────────────────────────────────────────
app.post("/api/analyze-resume", async (req, res) => {
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "OPENAI_API_KEY is not configured." });

  const { resumeText, plan, analysesUsedToday, analysesDate } = req.body ?? {};
  if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 20)
    return res.status(400).json({ error: "resumeText is required." });

  // Enforce daily limit for free users server-side
  if (plan !== "premium") {
    const today = new Date().toISOString().slice(0, 10);
    const used = analysesDate === today ? (analysesUsedToday ?? 0) : 0;
    if (used >= 3) return res.status(429).json({ error: "Daily analysis limit reached. Upgrade to Premium for unlimited analyses." });
  }

  // Truncate aggressively — structured extraction needs far fewer tokens than coaching
  const truncated = resumeText.trim().slice(0, 3000);

  const messages = [
    {
      role: "system",
      content: 'You are a resume parser. Extract structured data from the resume text. Respond ONLY with a valid JSON object — no markdown, no explanation. Schema: {"skills":[],"experience_years":0,"roles":[],"industries":[],"education":[],"location":""}. Infer experience_years as a number from dates or descriptions. If a field cannot be determined, use an empty array or empty string.',
    },
    { role: "user", content: truncated },
  ];

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", messages, temperature: 0, max_tokens: 400 }),
    });
    if (!response.ok) return res.status(502).json({ error: "Resume analysis temporarily unavailable." });
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    try {
      const parsed = JSON.parse(raw);
      res.json({ resumeData: parsed });
    } catch {
      res.status(502).json({ error: "Could not parse resume analysis response." });
    }
  } catch (err) {
    console.error("analyze-resume error:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Resume analysis failed." });
  }
});

// ── Job Matcher ──────────────────────────────────────────────────────────────
app.post("/api/match-jobs", async (req, res) => {
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "OPENAI_API_KEY is not configured." });

  const { jobs, resumeData, plan } = req.body ?? {};
  if (!Array.isArray(jobs) || !jobs.length) return res.status(400).json({ error: "jobs array is required." });
  if (!resumeData) return res.status(400).json({ error: "resumeData is required." });
  const isPremium = plan === "premium";

  // Slim payload — only what the model needs
  const slimJobs = jobs.slice(0, 20).map((j) => ({
    id: j.id,
    title: j.title,
    skills: j.tags ?? [],
    summary: (j.description ?? "").slice(0, 300),
  }));

  const prompt = `You are a job-matching engine. Given a candidate profile and a list of jobs, return a JSON array. Each element must follow this schema exactly:
{"id":"<job id>","match_percentage":<0-100>,"matched_skills":[],"missing_skills":[]}
Respond ONLY with the JSON array — no markdown, no explanation.

Candidate profile:
${JSON.stringify(resumeData)}

Jobs:
${JSON.stringify(slimJobs)}`;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 900,
      }),
    });
    if (!response.ok) return res.status(502).json({ error: "Job matching temporarily unavailable." });
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "[]";
    try {
      const limit = isPremium ? 20 : 5;
      const matches = JSON.parse(raw);
      const sorted = matches
        .sort((a, b) => b.match_percentage - a.match_percentage)
        .slice(0, limit);
      res.json({ matches: sorted });
    } catch {
      res.status(502).json({ error: "Could not parse job match response." });
    }
  } catch (err) {
    console.error("match-jobs error:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Job matching failed." });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Career Navigator AI backend running on port ${port}`));
