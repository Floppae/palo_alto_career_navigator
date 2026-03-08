"use client";

import { useState, useCallback, useRef } from "react";
import type { UserInput } from "../types";

const INPUT_CLASS = "w-full rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 text-white placeholder-[#6e7681] focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";
const FIELD_CLASS = "rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-2 text-white placeholder-[#6e7681] focus:border-amber-500 focus:outline-none";

async function extractTextFromPdf(file: File): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.5.207/build/pdf.worker.mjs";
  const doc = await getDocument(await file.arrayBuffer()).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    for (const item of content.items) {
      if ("str" in item) {
        const t = item as { str: string; hasEOL?: boolean };
        parts.push(t.str, t.hasEOL ? "\n" : " ");
      }
    }
    parts.push("\n");
  }
  return parts.join("").trim();
}

const SECTION_HEADERS = new Set([
  "experience", "education", "skills", "summary", "references", "objective",
  "certifications", "projects", "leadership", "work history", "contact",
  "technical skills", "core competencies", "expertise", "leadership & projects",
]);

function looksLikeSkill(s: string): boolean {
  const t = s.trim();
  if (t.length < 2 || t.length > 40 || t.endsWith(":") || SECTION_HEADERS.has(t.toLowerCase())) return false;
  if (t.endsWith(".") && t.length < 10) return false;
  if (t === t.toUpperCase() && t.length > 4) return false;
  if (/\d{4}\s*[-–—]\s*(?:Present|\d{4})/.test(t)) return false;
  if (/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i.test(t)) return false;
  if (t.includes(" - ") && (t.includes("Present") || /\d{4}/.test(t))) return false;
  return t.split(/\s+/).length <= 5;
}

function suggestSkillsFromResume(text: string): string[] {
  const seen = new Set<string>();
  const add = (raw: string) => {
    const s = raw.trim();
    if (looksLikeSkill(s)) seen.add(s);
  };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const isSkillsHeader = /^(?:technical\s+)?skills(?:\s+&\s+[^:]*)?\s*:?\s*$|^core\s+competencies\s*:?\s*$|^expertise\s*:?\s*$|^key\s+skills\s*:?\s*$/i;
  const isOtherSection = /^(experience|education|work\s+history|projects?|leadership)\s*:?\s*$/i;
  const isAllCapsNotSkills = (line: string) => line === line.toUpperCase() && line.length > 3 && !/^skills\s*$|^technical\s+skills\s*$/i.test(line);
  const bullet = /^[\-\*•·●▪▸]\s*(.+)$/;
  const skillsWithContent = /^(?:technical\s+)?skills\s*:\s*(.+)$/i;

  let inSkills = false;
  for (const line of lines) {
    if (isSkillsHeader.test(line)) { inSkills = true; continue; }
    if (isOtherSection.test(line) || isAllCapsNotSkills(line)) { inSkills = false; continue; }
    const bulletMatch = line.match(bullet);
    if (bulletMatch) { if (looksLikeSkill(bulletMatch[1].trim())) add(bulletMatch[1]); continue; }
    const skillsMatch = line.match(skillsWithContent);
    if (skillsMatch) { inSkills = true; skillsMatch[1].split(/[,;|/]/).forEach(add); continue; }
    if (inSkills && line.length <= 40 && !line.includes(":")) add(line);
  }

  if (seen.size === 0 && text.length > 50) {
    const chunk = text.match(/(?:technical\s+)?skills\s*:?\s*([\s\S]*?)(?=\n\s*(?:experience|education|work\s+history|projects?|leadership)\s*:?\s*|$)/i)?.[1]?.replace(/\r?\n/g, " ").trim();
    if (chunk) chunk.split(/[,;|]|\s{2,}/).forEach(add);
  }
  return [...seen].slice(0, 20);
}

function TagList({ items, onRemove, label, value, onChange, onAdd, placeholder }: { items: string[]; onRemove: (s: string) => void; label: string; value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#8b949e] mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-[#21262d] px-3 py-1 text-sm">
            {s}
            <button type="button" onClick={() => onRemove(s)} className="text-[#8b949e] hover:text-white" aria-label={`Remove ${s}`}>×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())} placeholder={placeholder} className={`flex-1 ${FIELD_CLASS}`} />
        <button type="button" onClick={onAdd} className="rounded-lg bg-[#21262d] px-4 py-2 text-sm hover:bg-[#30363d]">Add</button>
      </div>
    </div>
  );
}

export default function InputFlow({ onSubmit, onBack, loading = false, error = null }: { onSubmit: (input: UserInput) => void; onBack?: () => void; loading?: boolean; error?: string | null }) {
  const [targetRole, setTargetRole] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mergeSkills = useCallback((text: string) => {
    const suggested = suggestSkillsFromResume(text);
    if (suggested.length) setSkills((prev) => [...new Set([...prev, ...suggested])]);
    return suggested.length;
  }, []);

  const processPdf = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") { setPdfError("Need a PDF—drop one or pick from your computer."); return; }
    setPdfError(null);
    setPdfLoading(true);
    try {
      const text = await extractTextFromPdf(file);
      setResumeText(text);
      if (mergeSkills(text) > 0) setShowManual(true);
    } catch {
      setPdfError("Couldn’t read that PDF. Try pasting the text in instead.");
    } finally {
      setPdfLoading(false);
    }
  }, [mergeSkills]);

  const addTag = (list: string[], setList: (fn: (p: string[]) => string[]) => void, val: string, setVal: (v: string) => void) => {
    const v = val.trim();
    if (v && !list.includes(v)) { setList((prev) => [...prev, v]); setVal(""); }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e6edf3] py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {onBack && <button type="button" onClick={onBack} className="text-[#8b949e] hover:text-white mb-8 text-sm">← Back</button>}
        <h2 className="text-2xl font-bold text-white mb-2">About you</h2>
        <p className="text-[#8b949e] mb-8">Upload a resume (PDF) or paste it in. We’ll pull out skills; you can add or change them below.</p>

        <label className="block text-sm font-medium text-[#8b949e] mb-2">Role you’re aiming for</label>
        <input type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Product Manager, Cloud Security Engineer" className={`${INPUT_CLASS} mb-6`} />

        <label className="block text-sm font-medium text-[#8b949e] mb-2">Resume</label>
        <div
          className={`mb-4 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${isDragging ? "border-amber-500 bg-amber-500/10" : "border-[#30363d] bg-[#161b22] hover:border-[#8b949e] hover:bg-[#21262d]"} ${pdfLoading ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processPdf(f); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept="application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) processPdf(f); e.target.value = ""; }} className="hidden" aria-hidden />
          {pdfLoading ? <p className="text-[#8b949e]">Reading PDF…</p> : <><p className="text-white font-medium">Drop a PDF here</p><p className="mt-1 text-sm text-[#8b949e]">or click to pick a file</p></>}
        </div>
        {pdfError && <p className="mb-2 text-sm text-red-400">{pdfError}</p>}
        <p className="text-xs text-[#8b949e] mb-2">Or paste below:</p>
        <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} onPaste={(e) => { const p = e.clipboardData.getData("text/plain").trim(); if (p) mergeSkills(p); }} onBlur={() => resumeText.trim() && mergeSkills(resumeText)} placeholder="Paste your resume. We’ll suggest skills from the bullets—you can edit after." rows={6} className={`${INPUT_CLASS} mb-4 resize-y`} />
        <p className="text-xs text-[#6e7681] mb-8">Click outside the text area after pasting to pull skills from bullet points.</p>

        <button type="button" onClick={() => setShowManual((v) => !v)} className="text-amber-400 hover:text-amber-300 text-sm font-medium mb-4">
          {showManual ? "− Hide" : "+"} Add or edit skills, certs, experience
        </button>

        {showManual && (
          <div className="space-y-6 mb-8">
            <TagList items={skills} onRemove={(s) => setSkills((p) => p.filter((x) => x !== s))} label="Skills" value={skillInput} onChange={setSkillInput} onAdd={() => addTag(skills, setSkills, skillInput, setSkillInput)} placeholder="Skill, then Enter" />
            <TagList items={certifications} onRemove={(c) => setCertifications((p) => p.filter((x) => x !== c))} label="Certifications" value={certInput} onChange={setCertInput} onAdd={() => addTag(certifications, setCertifications, certInput, setCertInput)} placeholder="Cert name, then Enter" />
            <div>
              <label className="block text-sm font-medium text-[#8b949e] mb-2">Experience (optional)</label>
              <textarea value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="A bit about your background…" rows={3} className={`${INPUT_CLASS} resize-y`} />
            </div>
          </div>
        )}

        {error && <p className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 text-sm">{error}</p>}
        <button type="button" onClick={() => onSubmit({ targetRole: targetRole.trim(), resumeText, skills, certifications, experience })} disabled={loading} className="w-full rounded-xl bg-amber-500 text-[#0f1419] font-semibold py-4 text-lg hover:bg-amber-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
          {loading ? "Checking…" : "See my readiness"}
        </button>
      </div>
    </div>
  );
}
