const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

const callClaude = async (messages, tools = null, maxTokens = 1000) => {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    messages,
  };
  if (tools) body.tools = tools;

  const response = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error ${response.status}: ${err}`);
  }
  return response.json();
};

const extractJSON = (text, isArray = false) => {
  const clean = text.replace(/```json|```/g, '').trim();
  const pattern = isArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = clean.match(pattern);
  if (!match) return isArray ? [] : {};
  return JSON.parse(match[0]);
};

// ── Analyze uploaded resume text ──────────────────────────────────────────
export const analyzeResume = async (resumeText) => {
  const prompt = `You are a professional resume parser. Analyze this resume and return ONLY valid JSON, no markdown:
{
  "name": "full name or empty string",
  "email": "email if found",
  "phone": "phone if found",
  "location": "city, state/country if found",
  "yearsExperience": 0,
  "currentRole": "most recent job title",
  "skills": ["skill1", "skill2"],
  "tools": ["tool1", "tool2"],
  "education": "highest degree + institution",
  "certifications": ["cert1"],
  "languages": ["language1"],
  "summary": "2-3 sentence professional summary based on resume",
  "industries": ["industry1"],
  "jobHistory": [{"title": "job title", "company": "company", "duration": "duration"}]
}

Resume text:
${resumeText.slice(0, 7000)}`;

  const data = await callClaude([{ role: 'user', content: prompt }]);
  const text = data.content?.map(b => b.text || '').join('') || '';
  return extractJSON(text);
};

// ── Search for real jobs via web search ────────────────────────────────────
export const searchJobs = async (profile, resumeData, filters) => {
  const role = filters.searchQuery || profile.role || resumeData?.currentRole || 'software engineer';
  const location = filters.location || profile.location || '';
  const skills = (resumeData?.skills || []).slice(0, 5).join(', ');
  const workType = filters.workType
    ? ` ${['remote','hybrid','contract','internship'].includes(filters.workType) ? filters.workType : ''}`
    : '';

  const prompt = `Search for real, current${workType} job openings for: "${role}"${location ? ` in or near ${location}` : ''}
Candidate skills: ${skills || 'general'}
Experience level: ${filters.experience || profile.experience || 'any'}

Search job boards including LinkedIn Jobs, Indeed, Glassdoor, Greenhouse, Lever, Ashby, and company career pages.
Find 6-8 REAL current job postings. Return a JSON array with this exact structure:
[{
  "id": 1,
  "title": "exact job title",
  "company": "company name",
  "location": "city state or Remote",
  "workType": "remote|onsite|hybrid|contract|internship|parttime",
  "salary": "salary range or null",
  "url": "direct URL to job posting",
  "companyUrl": "company website URL",
  "industry": "industry category",
  "experience": "entry|junior|mid|senior|staff|lead|principal",
  "postedDate": "posting date or time ago",
  "description": "2-3 sentence role description",
  "requirements": ["req1","req2","req3","req4","req5"],
  "companySize": "company size estimate",
  "companyBio": "1-2 sentence company overview",
  "companyGrowth": "growth insight if available"
}]
Return ONLY the JSON array. No other text.`;

  try {
    const data = await callClaude(
      [{ role: 'user', content: prompt }],
      [{ type: 'web_search_20250305', name: 'web_search' }],
      4000
    );
    const textBlocks = (data.content || []).filter(b => b.type === 'text');
    const raw = textBlocks.map(b => b.text).join('');
    const jobs = extractJSON(raw, true);
    return jobs.map((j, i) => ({ ...j, id: j.id || i + 1 }));
  } catch (e) {
    console.error('Job search error:', e);
    return [];
  }
};

// ── Analyze match between resume and job ───────────────────────────────────
export const analyzeMatch = async (job, resumeData) => {
  if (!resumeData || !job) return null;

  const prompt = `Analyze how well this candidate matches this job posting. Return ONLY valid JSON:
{
  "score": 75,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "whyFit": "2-3 sentence personalized explanation",
  "pros": ["pro1", "pro2", "pro3"],
  "skillGaps": [{"skill": "name", "importance": "high|medium|low", "learnPath": "specific resource"}],
  "resumeSuggestions": ["specific improvement 1", "specific improvement 2"],
  "salaryInsight": "brief salary market insight based on candidate level"
}

CANDIDATE:
Name: ${resumeData.name || 'Candidate'}
Skills: ${(resumeData.skills || []).join(', ')}
Tools: ${(resumeData.tools || []).join(', ')}
Experience: ${resumeData.yearsExperience || 0} years as ${resumeData.currentRole || 'professional'}
Education: ${resumeData.education || 'not specified'}
Certifications: ${(resumeData.certifications || []).join(', ') || 'none'}

JOB: ${job.title} at ${job.company}
Requirements: ${(job.requirements || []).join(', ')}
Description: ${job.description || ''}

Return ONLY the JSON object.`;

  try {
    const data = await callClaude([{ role: 'user', content: prompt }], null, 800);
    const text = data.content?.map(b => b.text || '').join('') || '';
    return extractJSON(text);
  } catch (e) {
    console.error('Match analysis error:', e);
    return null;
  }
};
