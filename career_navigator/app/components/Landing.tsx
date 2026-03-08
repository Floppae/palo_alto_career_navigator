"use client";

export default function Landing({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e6edf3] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#e6edf3 1px, transparent 1px), linear-gradient(90deg, #e6edf3 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative z-10 max-w-2xl text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
          Where do you stand for <span className="text-amber-400">your next role?</span>
        </h1>
        <p className="text-lg text-[#8b949e] mb-10 max-w-lg mx-auto leading-relaxed">
          Drop your resume and the role you’re aiming for. You’ll get a readiness score and a short list of what to learn (and where).
        </p>
        <button type="button" onClick={onGetStarted} className="px-8 py-4 rounded-xl bg-amber-500 text-[#0f1419] font-semibold text-lg hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20">
          Try it
        </button>
      </div>
    </div>
  );
}
