import type { UserInput } from "@/app/types";

const MAX_TEXT = 50_000;
const MAX_ARRAY = 200;
const MAX_ITEM = 500;

export type ValidationResult = { success: true; input: UserInput } | { success: false; error: string };

function parseStringArray(b: Record<string, unknown>, key: string, label: string): ValidationResult | string[] {
  if (!Array.isArray(b[key])) return { success: false, error: `${label} should be an array of strings.` };
  if ((b[key] as unknown[]).length > MAX_ARRAY) return { success: false, error: `Too many ${label.toLowerCase()} (max ${MAX_ARRAY}).` };
  const arr = (b[key] as unknown[]).map((x) => String(x).trim()).filter(Boolean);
  if (arr.some((s) => s.length > MAX_ITEM)) return { success: false, error: `One of the ${label.toLowerCase()} is too long (max ${MAX_ITEM} chars).` };
  return arr;
}

export function validateInput(body: unknown): ValidationResult {
  if (body == null || typeof body !== "object") return { success: false, error: "Body should be a JSON object." };
  const b = body as Record<string, unknown>;

  const targetRole = b.targetRole != null ? String(b.targetRole).trim() : "";
  if (!targetRole) return { success: false, error: "Target role can’t be blank." };
  if (targetRole.length > 500) return { success: false, error: "Target role is too long." };

  const resumeText = b.resumeText != null ? String(b.resumeText) : "";
  if (resumeText.length > MAX_TEXT) return { success: false, error: `Resume is too long (max ${MAX_TEXT.toLocaleString()} characters).` };

  const experience = b.experience != null ? String(b.experience) : "";
  if (experience.length > MAX_TEXT) return { success: false, error: `Experience is too long (max ${MAX_TEXT.toLocaleString()} characters).` };

  const skillsResult = parseStringArray(b, "skills", "Skills");
  if (!Array.isArray(skillsResult)) return skillsResult;
  const certsResult = parseStringArray(b, "certifications", "Certifications");
  if (!Array.isArray(certsResult)) return certsResult;

  return { success: true, input: { targetRole, resumeText, skills: skillsResult, certifications: certsResult, experience } };
}
