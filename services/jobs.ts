import type { Job, JobFilters, UserProfile } from "@/types";

const REMOTIVE_API = "https://remotive.com/api/remote-jobs";
const ARBEITNOW_API = "https://www.arbeitnow.com/api/job-board-api";
const REMOTEOK_API = "https://remoteok.com/api";
const JOBICY_API = "https://jobicy.com/api/v2/remote-jobs";

const INDIA_EXCLUDE_TERMS = ["us only", "uk only", "eu only", "europe only", "united states only", "canada only", "australia only", "usa only", "american", "must be located in us", "must reside in"];

function htmlToText(value: string) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
}

function tokenize(value: string) {
  return Array.from(new Set(String(value || "").toLowerCase().split(/[^a-z0-9+#.]+/g).filter((word) => word.length > 1)));
}

function isIndiaCompatible(job: { location: string; description: string; title: string }): boolean {
  const loc = job.location.toLowerCase();
  const desc = job.description.toLowerCase();
  if (loc.includes("india") || loc.includes("remote") || loc.includes("worldwide") || loc.includes("anywhere") || loc.includes("global") || loc.includes("work from home")) return true;
  for (const term of INDIA_EXCLUDE_TERMS) {
    if (desc.includes(term)) return false;
  }
  if (loc.includes("remote") || loc === "") return true;
  return false;
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
    score += (matchedQuery.length / queryWords.length) * 55;
  } else {
    score += 25;
  }
  score += matchedSkills.length * 9;
  score += matchedRoleWords.length * 7;
  score += Math.min(matchedResume.length, 8) * 2;
  if (job.title.toLowerCase().includes(query.toLowerCase()) && query.trim().length >= 3) score += 14;
  if (job.isIndia) score += 8;
  if (profile?.location && haystack.includes(profile.location.toLowerCase().split(",")[0])) score += 5;
  score = Math.max(0, Math.min(98, Math.round(score)));

  const reasons: string[] = [];
  if (matchedQuery.length) reasons.push(`Matches search: ${matchedQuery.slice(0, 3).join(", ")}`);
  if (matchedSkills.length) reasons.push(`Uses your skills: ${matchedSkills.slice(0, 3).join(", ")}`);
  if (matchedRoleWords.length) reasons.push("Aligned with your target role");
  if (job.isIndia) reasons.push("India-compatible location");
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
  return list.filter((item: any) => item?.url && item?.title && item?.company_name).map((item: any) => {
    const location = String(item.candidate_required_location || "Remote");
    return {
      id: `rmt-${item.id}`,
      title: String(item.title),
      company: String(item.company_name),
      location,
      type: String(item.job_type || "Full-time"),
      category: String(item.category || "Careers"),
      salary: String(item.salary || "Salary not listed"),
      description: htmlToText(String(item.description || "")),
      url: String(item.url),
      source: "Remotive",
      postedAt: String(item.publication_date || new Date().toISOString()),
      tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 8) : [],
      isIndia: isIndiaCompatible({ location, description: htmlToText(String(item.description || "")), title: String(item.title) }),
    };
  });
}

async function fetchArbeitnow() {
  const data = await safeFetchJson<any>(`${ARBEITNOW_API}`);
  const list = Array.isArray(data?.data) ? data.data : [];
  return list.filter((item: any) => item?.url && item?.title && item?.company_name).map((item: any) => {
    const location = String(item.location || "Remote");
    const desc = htmlToText(String(item.description || ""));
    return {
      id: `arb-${item.slug || item.url}`,
      title: String(item.title),
      company: String(item.company_name),
      location,
      type: Array.isArray(item.job_types) && item.job_types.length ? String(item.job_types[0]).replace(/_/g, " ") : "Full-time",
      category: Array.isArray(item.tags) && item.tags.length ? String(item.tags[0]) : "Careers",
      salary: "Salary not listed",
      description: desc,
      url: String(item.url),
      source: "Arbeitnow",
      postedAt: item.created_at ? new Date(Number(item.created_at) * 1000).toISOString() : new Date().toISOString(),
      tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 8) : [],
      isIndia: isIndiaCompatible({ location, description: desc, title: String(item.title) }),
    };
  });
}

async function fetchRemoteOk() {
  const data = await safeFetchJson<any>(`${REMOTEOK_API}`);
  const list = Array.isArray(data) ? data.slice(1) : [];
  return list.filter((item: any) => item?.url && (item?.position || item?.title) && item?.company).map((item: any) => {
    const location = String(item.location || "Remote");
    const desc = htmlToText(String(item.description || ""));
    return {
      id: `rok-${item.id || item.slug || item.url}`,
      title: String(item.position || item.title),
      company: String(item.company),
      location,
      type: "Full-time",
      category: Array.isArray(item.tags) && item.tags.length ? String(item.tags[0]) : "Remote",
      salary: item.salary_min && item.salary_max ? `$${item.salary_min} – $${item.salary_max}` : "Salary not listed",
      description: desc,
      url: String(item.url),
      source: "RemoteOK",
      postedAt: String(item.date || new Date().toISOString()),
      tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 8) : [],
      isIndia: isIndiaCompatible({ location, description: desc, title: String(item.position || item.title) }),
    };
  });
}

async function fetchJobicy(query: string) {
  const data = await safeFetchJson<any>(`${JOBICY_API}?count=20&geo=india&tag=${encodeURIComponent(query)}`);
  const list = Array.isArray(data?.jobs) ? data.jobs : [];
  return list.filter((item: any) => item?.url && item?.jobTitle && item?.companyName).map((item: any) => ({
    id: `jcy-${item.id || item.url}`,
    title: String(item.jobTitle),
    company: String(item.companyName),
    location: String(item.jobGeo || "India / Remote"),
    type: String(item.jobType || "Full-time"),
    category: String(item.jobIndustry?.[0] || "Careers"),
    salary: item.annualSalaryMin && item.annualSalaryMax ? `$${item.annualSalaryMin}–$${item.annualSalaryMax}` : "Salary not listed",
    description: htmlToText(String(item.jobDescription || item.jobExcerpt || "")),
    url: String(item.url),
    source: "Jobicy India",
    postedAt: String(item.pubDate || new Date().toISOString()),
    tags: Array.isArray(item.jobIndustry) ? item.jobIndustry.map(String).slice(0, 8) : [],
    isIndia: true,
  }));
}

function applyFilters(jobs: Omit<Job, "matchScore" | "matchReasons">[], filters: JobFilters, includeInternational: boolean) {
  return jobs.filter((job) => {
    if (!includeInternational && !job.isIndia) return false;
    if (filters.jobType && filters.jobType !== "All") {
      const jt = job.type.toLowerCase();
      const ft = filters.jobType.toLowerCase();
      if (!jt.includes(ft) && !ft.includes(jt)) return false;
    }
    if (filters.workMode && filters.workMode !== "All") {
      const wm = filters.workMode.toLowerCase();
      const loc = job.location.toLowerCase();
      const desc = job.description.toLowerCase();
      if (wm === "remote" && !loc.includes("remote") && !desc.includes("remote")) return false;
      if (wm === "hybrid" && !loc.includes("hybrid") && !desc.includes("hybrid")) return false;
    }
    return true;
  });
}

export async function fetchJobs(profile: UserProfile | null, searchText?: string, filters?: Partial<JobFilters>): Promise<Job[]> {
  const query = searchText?.trim() || profile?.targetRole || profile?.skills[0] || "";
  if (!query.trim()) return [];

  const includeInternational = filters?.includeInternational ?? false;

  const [remotive, arbeitnow, remoteok, jobicy] = await Promise.all([
    fetchRemotive(query),
    fetchArbeitnow(),
    fetchRemoteOk(),
    fetchJobicy(query),
  ]);

  const all = [...jobicy, ...remotive, ...arbeitnow, ...remoteok];
  if (!all.length) throw new Error("No live job listings could be loaded right now. Please try again.");

  const queryLower = query.toLowerCase();
  const queryWords = tokenize(query).filter((word) => word.length > 2);

  const relevantFiltered = all.filter((job) => {
    if (!queryWords.length) return true;
    const haystack = `${job.title} ${job.description} ${job.tags.join(" ")} ${job.category}`.toLowerCase();
    if (haystack.includes(queryLower)) return true;
    const matched = queryWords.filter((word) => haystack.includes(word)).length;
    return matched / queryWords.length >= 0.4;
  });

  const locationFiltered = applyFilters(relevantFiltered, {
    jobType: filters?.jobType || "All",
    experience: filters?.experience || "All",
    workMode: filters?.workMode || "All",
    includeInternational: includeInternational,
  }, includeInternational);

  const scored = locationFiltered.map((job) => {
    const match = scoreJob(job, profile, query);
    return { ...job, matchScore: match.score, matchReasons: match.reasons };
  });

  return scored
    .filter((job) => job.matchScore >= 20)
    .sort((a, b) => {
      if (a.isIndia && !b.isIndia) return -1;
      if (!a.isIndia && b.isIndia) return 1;
      return b.matchScore - a.matchScore;
    })
    .slice(0, 50);
}
