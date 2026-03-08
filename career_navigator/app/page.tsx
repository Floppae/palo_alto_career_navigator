"use client";

import { useState } from "react";
import Landing from "./components/Landing";
import InputFlow from "./components/InputFlow";
import Results from "./components/Results";
import type { UserInput, AnalysisResult } from "./types";

type View = "landing" | "input" | "results";

export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToInput = () => { setView("input"); setError(null); };
  const goToResults = (data: AnalysisResult) => { setResult(data); setView("results"); };
  const newAnalysis = () => { setView("input"); setResult(null); setError(null); };

  const handleSubmit = async (input: UserInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      goToResults(data as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (view === "landing") return <Landing onGetStarted={goToInput} />;
  if (view === "input") return <InputFlow onSubmit={handleSubmit} onBack={() => setView("landing")} loading={loading} error={error} />;
  if (view === "results" && result) return <Results result={result} onNewAnalysis={newAnalysis} />;
  return null;
}
