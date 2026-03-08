import OpenAI from "openai";
import type { UserInput, AnalysisResult, SkillStatus } from "@/app/types";

function getSyntheticResult(input: UserInput): AnalysisResult {
  const role = input.targetRole.trim() || "your target role";
  const hasSkills = input.skills.length > 0 || input.resumeText.length > 50;
  return {
    targetRole: role,
    readinessScore: hasSkills ? 58 : 45,
    summary: `Sample analysis for "${role}". Add your OpenAI API key for a personalized assessment. Review the skills grid and learning resources below.`,
    skillsGrid: [
      { name: "Communication", status: "have" },
      { name: "Problem solving", status: "have" },
      { name: "Project management", status: "helpful" },
      { name: "Data analysis", status: "need" },
      { name: "Technical documentation", status: "need" },
      { name: "Stakeholder management", status: "helpful" },
      { name: "Agile / Scrum", status: "need" },
      { name: "Industry tools", status: "helpful" },
    ],
    learningRoadmap: [
      {
        skill: "Data analysis",
        resource: "Coursera: Data Analysis courses",
        resourceUrl: "https://www.coursera.org/courses?query=data%20analysis",
      },
      {
        skill: "Technical documentation",
        resource: "Google Technical Writing",
        resourceUrl: "https://developers.google.com/tech-writing",
      },
      {
        skill: "Agile / Scrum",
        resource: "Scrum.org PSM certification",
        resourceUrl: "https://www.scrum.org/",
      },
    ],
  };
}

const PROMPT_SCHEMA = `
Respond with exactly one JSON object (no markdown) with: readinessScore (0-100), summary (2-3 sentences), skillsGrid ([{name, status: "have"|"need"|"helpful"}]), learningRoadmap ([{skill, resource, resourceUrl}]), targetRole.

SCORING (follow strictly):
- readinessScore must reflect how many of the role's skills the user already has. Compute it from skillsGrid:
  - Count skills with status "have" (H) and status "need" (N). Treat "helpful" as a small bonus, not a core requirement.
  - Score ≈ (H / (H + N)) * 100, rounded. If H + N is 0, use 50.
  - Examples: 2 have + 7 need → score in the 20s (e.g. 22–28). 5 have + 4 need → score in the 50s. 8 have + 1 need → score in the 80s. Do NOT give 70+ when the user has only a small minority of required skills.
- First build the skillsGrid and count have vs need, then set readinessScore to match that ratio. The summary should align with the score (e.g. "significant gap" when score is low).

- skillsGrid: list all key skills for the role; mark each as "have", "need", or "helpful" based on the user's profile. Be consistent: if they lack most skills, most entries should be "need".
- learningRoadmap: one entry per "need" skill. Each entry must include skill, resource (short label), and resourceUrl (single https:// URL).
  - Only include URLs that point to real, active pages with the desired learning content. Links are validated server-side; any URL that returns a 404, "page not found", "content not found", or similar error page will be removed and not shown to the user.
  - Prefer stable hub or search URLs that reliably resolve to content: e.g. https://www.coursera.org/courses?query=TOPIC, https://learn.microsoft.com/en-us/training/, https://www.scrum.org/, https://developers.google.com/tech-writing. Avoid specific course or article slugs (e.g. /learn/xyz) unless you are confident they exist and are not soft-404 pages.
  - No Amazon retail or affiliate links.
`;

function buildPrompt(input: UserInput): string {
  const skills = input.skills.length
    ? input.skills.join(", ")
    : "(none listed)";
  const certs = input.certifications.length
    ? input.certifications.join(", ")
    : "(none listed)";
  const exp =
    input.experience.trim() ||
    input.resumeText.slice(0, 1500) ||
    "(none provided)";
  return `You are a career coach. The user wants to become: "${input.targetRole}".
Their skills: ${skills}
Their certifications: ${certs}
Their experience: ${exp}
Identify the gap for this role. ${PROMPT_SCHEMA}`;
}

const URL_VALIDATE_TIMEOUT_MS = 8000;
const BODY_SNIPPET_SIZE = 15000;
const SOFT_404_PATTERN = /404|page not found|page does not exist|content not found|couldn't find what you're looking for|this (page|link) (is )?(no longer )?available|the (page|content) you (requested|are looking for) (was not found|does not exist)/i;

function toValidUrl(s: string): string | undefined {
  const t = s.trim();
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(t)) return `https://${t}`;
  const match = t.match(/https?:\/\/[^\s"'<>)\]]+/i);
  return match ? match[0] : undefined;
}

/** Returns true only if the URL resolves with 2xx and the body does not contain soft-404 text. */
async function isUrlValidForDisplay(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(URL_VALIDATE_TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const contentType = res.headers.get("content-type") ?? "";
    if (!/text\/html/i.test(contentType)) return true;
    const text = await res.text();
    return !SOFT_404_PATTERN.test(text.slice(0, BODY_SNIPPET_SIZE));
  } catch {
    return false;
  }
}

/** Remove resourceUrl for any roadmap item whose link fails validation (404 or soft-404). */
async function filterInvalidResourceUrls(
  learningRoadmap: AnalysisResult["learningRoadmap"],
): Promise<void> {
  await Promise.all(
    learningRoadmap.map(async (item) => {
      const url = item.resourceUrl;
      if (!url) return;
      const ok = await isUrlValidForDisplay(url);
      if (!ok) item.resourceUrl = undefined;
    }),
  );
}

function parseResponse(data: unknown): AnalysisResult {
  if (data == null || typeof data !== "object")
    throw new Error("Invalid response");
  const o = data as Record<string, unknown>;
  const score = Number(o.readinessScore);
  if (!Number.isFinite(score) || score < 0 || score > 100)
    throw new Error("Invalid readinessScore");
  const summary = typeof o.summary === "string" ? o.summary : "";
  const targetRole = typeof o.targetRole === "string" ? o.targetRole : "";
  const skillsGrid = Array.isArray(o.skillsGrid)
    ? (o.skillsGrid as Array<{ name?: string; status?: string }>).map(
        (item) => ({
          name:
            typeof item.name === "string" ? item.name : String(item.name ?? ""),
          status: ["have", "need", "helpful"].includes(String(item.status))
            ? (item.status as SkillStatus)
            : "helpful",
        }),
      )
    : [];
  const learningRoadmap = Array.isArray(o.learningRoadmap)
    ? (
        o.learningRoadmap as Array<{
          skill?: string;
          resource?: string;
          resourceUrl?: string;
        }>
      ).map((item) => ({
        skill:
          typeof item.skill === "string"
            ? item.skill
            : String(item.skill ?? ""),
        resource:
          typeof item.resource === "string"
            ? item.resource
            : String(item.resource ?? ""),
        resourceUrl:
          toValidUrl(
            typeof item.resourceUrl === "string" ? item.resourceUrl : "",
          ) ?? undefined,
      }))
    : [];
  const have = skillsGrid.filter((s) => s.status === "have").length;
  const need = skillsGrid.filter((s) => s.status === "need").length;
  const total = have + need;
  const derivedScore = total > 0 ? Math.round((have / total) * 100) : score;
  const readinessScore = Math.min(100, Math.max(0, derivedScore));

  return {
    readinessScore,
    summary,
    skillsGrid,
    learningRoadmap,
    targetRole,
  };
}

export async function runAnalysis(input: UserInput): Promise<AnalysisResult> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const fallback = getSyntheticResult(input);
      await filterInvalidResourceUrls(fallback.learningRoadmap);
      return fallback;
    }
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildPrompt(input) }],
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      const fallback = getSyntheticResult(input);
      await filterInvalidResourceUrls(fallback.learningRoadmap);
      return fallback;
    }
    const result = parseResponse(JSON.parse(content));
    await filterInvalidResourceUrls(result.learningRoadmap);
    return result;
  } catch {
    const fallback = getSyntheticResult(input);
    await filterInvalidResourceUrls(fallback.learningRoadmap);
    return fallback;
  }
}
