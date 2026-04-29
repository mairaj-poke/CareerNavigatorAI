import type { Job, UserProfile } from "@/types";
import { fetchWithRetry } from "@/utils/api";

const API = "https://remotive.com/api/remote-jobs";

function htmlToText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Pure keyword pre-filter — NO API call. Returns a rough relevance score only.
function preFilterScore(job: Omit<Job, "matchScore" | "matchReasons">, profile: UserProfile): number {
  const haystack = `${job.title} ${job.category} ${job.tags.join(" ")}`.toLowerCase();
  const skills = profile.skills.map((s) => s.trim().toLowerCase()).filter(Boolean);
  const roleWords = profile.targetRole.toLowerCase().split(/\W+/).filter((w) => w.length > 2);

  const skillHits = skills.filter((s) => haystack.includes(s)).length;
  const roleHits = roleWords.filter((w) => haystack.includes(w)).length;
  return skillHits * 3 + roleHits * 2;
}

export async function fetchJobs(
  profile: UserProfile | null,
  searchText?: string,
  isPremium = false,
): Promise<Job[]> {
  const query = encodeURIComponent(searchText?.trim() || profile?.targetRole || profile?.skills[0] || "software");
  const response = await fetchWithRetry(`${API}?search=${query}`, {});
  if (!response.ok) throw new Error("Could not load live job listings right now. Please try again.");
  const data = await response.json();
  const rawJobs = Array.isArray(data.jobs) ? data.jobs : [];

  // Step 1: shape raw data
  const shaped: Omit<Job, "matchScore" | "matchReasons">[] = rawJobs
    .filter((item: any) => item?.url && item?.title && item?.company_name)
    .map((item: any) => ({
      id: String(item.id),
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

  // Step 2: no profile → return as-is with zero scores
  if (!profile?.resumeData && !profile?.resumeText.trim()) {
    return shaped.slice(0, 5).map((j) => ({ ...j, matchScore: 0, matchReasons: [] }));
  }

  // Step 3: keyword pre-filter — pick top 10–20, no API call
  const scored = shaped
    .map((j) => ({ job: j, pre: profile ? preFilterScore(j, profile) : 0 }))
    .sort((a, b) => b.pre - a.pre)
    .slice(0, 20)
    .map(({ job }) => job);

  // Step 4: single API call for structured match data
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!backendUrl || !profile?.resumeData) {
    // Fallback — return pre-filtered jobs with keyword score only
    const limit = isPremium ? 20 : 5;
    return scored.slice(0, limit).map((j, i) => ({
      ...j,
      matchScore: Math.max(35, 85 - i * 4),
      matchReasons: [profile?.targetRole ?? "", j.location].filter(Boolean),
    }));
  }

  const res = await fetchWithRetry(`${backendUrl}/api/match-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobs: scored,
      resumeData: profile.resumeData,
      plan: profile.plan,
    }),
  });

  if (!res.ok) {
    // API failed — return pre-filtered jobs silently
    const limit = isPremium ? 20 : 5;
    return scored.slice(0, limit).map((j, i) => ({
      ...j,
      matchScore: Math.max(35, 85 - i * 4),
      matchReasons: [profile?.targetRole ?? "", j.location].filter(Boolean),
    }));
  }

  const { matches } = await res.json();
  const matchMap = new Map((matches as any[]).map((m) => [m.id, m]));

  // Step 5: merge API match data back onto shaped jobs
  return scored
    .map((j) => {
      const m = matchMap.get(j.id);
      if (!m) return null;
      return {
        ...j,
        matchScore: Number(m.match_percentage ?? 0),
        matchReasons: (m.matched_skills as string[])?.slice(0, 3) ?? [],
        matchPercentage: Number(m.match_percentage ?? 0),
        matchedSkills: (m.matched_skills as string[]) ?? [],
        missingSkills: (m.missing_skills as string[]) ?? [],
      };
    })
    .filter((j): j is Job => j !== null && j.matchScore >= 35)
    .sort((a, b) => b.matchScore - a.matchScore);
}
