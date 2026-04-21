import type { Job, UserProfile } from "@/types";

const REMOTIVE_API = "https://remotive.com/api/remote-jobs";
const ARBEITNOW_API = "https://www.arbeitnow.com/api/job-board-api";
const REMOTEOK_API = "https://remoteok.com/api";

function htmlToText(value: string) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
}

function tokenize(value: string) {
  return Array.from(new Set(String(value || "").toLowerCase().split(/[^a-z0-9+#.]+/g).filter((word) => word.length > 1)));
}

function scoreJob(job: Omit<Job, "matchScore" | "matchReasons">, profile: UserProfile | null, query: string) {
  const haystack = `${job.title} ${job.company} ${job.category} ${job.description} ${job.tags.join(" ")} ${job.location}`.toLowerCase();
  const queryWords = tokenize(query).filter((word) => word.length > 2);
  const skills = (profile?.skills || []).map((skill) => skill.trim().toLowerCase()).filter(Boolean);
  const roleWords = tokenize(profile?.targetRole || "").filter((word) => word.length > 2);
  const resumeWords = tokenize(profile?.resumeText || "").filter((word) => word.length > 3).slice(0, 60);

  const matchedQuery = queryWords.filter((word) => haystack.includes(word));
  const matchedSkills = skills.filter((skill) => haystack.includes(skill));
  const matchedRoleWords = roleWords.filter((word) => haystack.includes(word));
  const matchedResume = resumeWords.filter((word) => haystack.includes(word));

  let score = 0;
  if (queryWords.length) {
    score += (matchedQuery.length / queryWords.length) * 60;
  } else {
    score += 30;
  }
  score += matchedSkills.length * 8;
  score += matchedRoleWords.length * 6;
  score += Math.min(matchedResume.length, 8) * 2;
  if (job.title.toLowerCase().includes(query.toLowerCase()) && query.trim().length >= 3) score += 12;
  if (profile?.location && haystack.includes(profile.location.toLowerCase().split(",")[0])) score += 4;
  score = Math.max(0, Math.min(98, Math.round(score)));

  const reasons: string[] = [];
  if (matchedQuery.length) reasons.push(`Matches search: ${matchedQuery.slice(0, 3).join(", ")}`);
  if (matchedSkills.length) reasons.push(`Uses your skills: ${matchedSkills.slice(0, 3).join(", ")}`);
  if (matchedRoleWords.length) reasons.push("Aligned with your target role");
  if (!reasons.length) reasons.push("Related to your profile");

  return { score, reasons };
}

function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T | null> {
  return fetch(url, { ...options, headers: { Accept: "application/json", ...(options?.headers || {}) } })
    .then((response) => (response.ok ? (response.json() as Promise<T>) : null))
    .catch(() => null);
}

async function fetchRemotive(query: string) {
  const data = await safeFetchJson<any>(`${REMOTIVE_API}?search=${encodeURIComponent(query)}`);
  const list = Array.isArray(data?.jobs) ? data.jobs : [];
  return list.filter((item: any) => item?.url && item?.title && item?.company_name).map((item: any) => ({
    id: `rmt-${item.id}`,
    title: String(item.title),
    company: String(item.company_name),
    location: String(item.candidate_required_location || "Remote"),
    type: String(item.job_type || "Full-time"),
    category: String(item.category || "Careers"),
    salary: String(item.salary || "Salary not listed"),
    description: htmlToText(String(item.description || "")),
    url: String(item.url),
    source: "Remotive",
    postedAt: String(item.publication_date || new Date().toISOString()),
    tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 6) : [],
  }));
}

async function fetchArbeitnow() {
  const data = await safeFetchJson<any>(`${ARBEITNOW_API}`);
  const list = Array.isArray(data?.data) ? data.data : [];
  return list.filter((item: any) => item?.url && item?.title && item?.company_name).map((item: any) => ({
    id: `arb-${item.slug || item.url}`,
    title: String(item.title),
    company: String(item.company_name),
    location: String(item.location || "Remote"),
    type: Array.isArray(item.job_types) && item.job_types.length ? String(item.job_types[0]).replace(/_/g, " ") : "Full-time",
    category: Array.isArray(item.tags) && item.tags.length ? String(item.tags[0]) : "Careers",
    salary: "Salary not listed",
    description: htmlToText(String(item.description || "")),
    url: String(item.url),
    source: "Arbeitnow",
    postedAt: item.created_at ? new Date(Number(item.created_at) * 1000).toISOString() : new Date().toISOString(),
    tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 6) : [],
  }));
}

async function fetchRemoteOk() {
  const data = await safeFetchJson<any>(`${REMOTEOK_API}`);
  const list = Array.isArray(data) ? data.slice(1) : [];
  return list.filter((item: any) => item?.url && (item?.position || item?.title) && item?.company).map((item: any) => ({
    id: `rok-${item.id || item.slug || item.url}`,
    title: String(item.position || item.title),
    company: String(item.company),
    location: String(item.location || "Remote"),
    type: "Full-time",
    category: Array.isArray(item.tags) && item.tags.length ? String(item.tags[0]) : "Remote",
    salary: item.salary_min && item.salary_max ? `$${item.salary_min} - $${item.salary_max}` : "Salary not listed",
    description: htmlToText(String(item.description || "")),
    url: String(item.url),
    source: "RemoteOK",
    postedAt: String(item.date || new Date().toISOString()),
    tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 6) : [],
  }));
}

export async function fetchJobs(profile: UserProfile | null, searchText?: string): Promise<Job[]> {
  const query = searchText?.trim() || profile?.targetRole || profile?.skills[0] || "";
  if (!query.trim()) return [];

  const [remotive, arbeitnow, remoteok] = await Promise.all([
    fetchRemotive(query),
    fetchArbeitnow(),
    fetchRemoteOk(),
  ]);

  const all = [...remotive, ...arbeitnow, ...remoteok];
  if (!all.length) throw new Error("No live job listings could be loaded right now. Please try again.");

  const queryLower = query.toLowerCase();
  const queryWords = tokenize(query).filter((word) => word.length > 2);

  const filtered = all.filter((job) => {
    if (!queryWords.length) return true;
    const haystack = `${job.title} ${job.description} ${job.tags.join(" ")} ${job.category}`.toLowerCase();
    if (haystack.includes(queryLower)) return true;
    const matched = queryWords.filter((word) => haystack.includes(word)).length;
    return matched / queryWords.length >= 0.5;
  });

  const scored = filtered.map((job) => {
    const match = scoreJob(job, profile, query);
    return { ...job, matchScore: match.score, matchReasons: match.reasons };
  });

  return scored
    .filter((job) => job.matchScore >= 25)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 40);
}
