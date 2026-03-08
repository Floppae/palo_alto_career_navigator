"use client";

import type { AnalysisResult, SkillStatus } from "../types";

const RING_SIZE = 140;
const STROKE = 12;
const R = (RING_SIZE - STROKE) / 2;
const CIRCUM = 2 * Math.PI * R;

const STATUS_CLASS: Record<SkillStatus, string> = {
  have: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  need: "bg-red-500/20 text-red-300 border-red-500/40",
  helpful: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

function ReadinessRing({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const offset = CIRCUM - (clamped / 100) * CIRCUM;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={R}
          fill="none"
          stroke="#21262d"
          strokeWidth={STROKE}
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={R}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUM}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-3xl font-bold text-white">
          {Math.round(score)}
        </span>
        <span className="block text-sm text-[#8b949e]">Readiness</span>
      </div>
    </div>
  );
}

function getLinkUrl(url: string | undefined): string | null {
  if (url == null || typeof url !== "string") return null;
  const first = url.trim().split(/\s+/)[0] ?? "";
  return first.startsWith("http://") || first.startsWith("https://")
    ? first
    : null;
}

function extractUrlFromText(text: string | undefined): string | null {
  if (!text || typeof text !== "string") return null;
  const m = text.match(/https?:\/\/[^\s"'<>)\]]+/i);
  return m ? m[0] : null;
}

export default function Results({
  result,
  onNewAnalysis,
}: {
  result: AnalysisResult;
  onNewAnalysis: () => void;
}) {
  const { readinessScore, summary, skillsGrid, learningRoadmap, targetRole } =
    result;

  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e6edf3] py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10">
          <h2 className="text-2xl font-bold text-white">{targetRole}</h2>
          <button
            type="button"
            onClick={onNewAnalysis}
            className="rounded-xl border border-[#30363d] bg-[#161b22] px-5 py-2.5 text-sm font-medium hover:bg-[#21262d] hover:border-[#8b949e] transition-colors"
          >
            Try another role
          </button>
        </div>

        <section className="mb-10 flex flex-col sm:flex-row items-center gap-8 p-6 rounded-xl bg-[#161b22] border border-[#30363d]">
          <ReadinessRing score={readinessScore} />
          <p className="text-[#8b949e] leading-relaxed flex-1">{summary}</p>
        </section>

        <section className="mb-10">
          <h3 className="text-lg font-semibold text-white mb-4">Skills</h3>
          <p className="text-sm text-[#8b949e] mb-4">
            Green = you’ve got it · Red = need to build · Yellow = nice to have
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {skillsGrid.map((item) => (
              <span
                key={item.name}
                className={`rounded-lg border px-3 py-2 text-sm ${STATUS_CLASS[item.status] ?? "bg-[#21262d] text-[#8b949e] border-[#30363d]"}`}
              >
                {item.name}
              </span>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h3 className="text-lg font-semibold text-white mb-4">
            What to learn (and where)
          </h3>
          <ul className="space-y-3">
            {(() => {
              const withLinks = learningRoadmap.filter(
                (item) =>
                  item.skill?.trim() &&
                  (getLinkUrl(item.resourceUrl) ?? extractUrlFromText(item.resource))
              );
              if (withLinks.length === 0) {
                return (
                  <li className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 text-[#8b949e] text-sm">
                    No verified links for these skills right now. Try again later or check the skills grid above.
                  </li>
                );
              }
              return withLinks.map((item, i) => {
                const linkUrl =
                  getLinkUrl(item.resourceUrl) ??
                  extractUrlFromText(item.resource);
                return (
                  <li
                    key={`${item.skill}-${i}`}
                    className="rounded-xl border border-[#30363d] bg-[#161b22] p-4"
                  >
                    <div className="font-medium text-white mb-1">
                      {item.skill}
                    </div>
                    <a
                      href={linkUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 hover:underline text-sm cursor-pointer break-all"
                    >
                      {item.resource || item.skill} →
                    </a>
                  </li>
                );
              });
            })()}
          </ul>
        </section>

        <button
          type="button"
          onClick={onNewAnalysis}
          className="w-full rounded-xl bg-amber-500 text-[#0f1419] font-semibold py-4 text-lg hover:bg-amber-400 transition-colors"
        >
          Try another role
        </button>
      </div>
    </div>
  );
}
