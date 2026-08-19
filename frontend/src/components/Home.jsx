import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function Home() {
  const [stats, setStats] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!stats?.scheduler?.nextScheduledRun) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const next = new Date(stats.scheduler.nextScheduledRun).getTime();
      const diff = next - now;

      if (diff <= 0) {
        setTimeLeft("RUNNING...");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [stats]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/dashboard/stats");
      if (res.data.success) setStats(res.data.stats);
    } catch (err) {
      console.error("Home stats error:", err);
    }
  };

  return (
    <div className="bg-[#fffdfa] selection:bg-emerald-100">
      {/* ── Hero Section ── */}
      <section className="max-w-6xl mx-auto px-6 pt-40 pb-32 text-center">
        <div className="inline-block mb-10">
          <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">
              {stats ? `${stats.totalBlogs} Volumes Generated · High-Fidelity Editorial` : "High-Fidelity Editorial · Volume I"}
            </p>
          </div>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-bold text-stone-900 leading-[1.05] mb-10 serif tracking-tight">
          The <span className="italic text-emerald-900/10 border-b-4 border-emerald-500/20">Manuscript</span><br />
          Editorial Intelligence.
        </h1>
        
        <p className="text-stone-500 text-xl md:text-2xl serif max-w-3xl mx-auto leading-relaxed mb-16 italic">
          "A silent orchestration of insight, precision, and narrative depth. 
          We decode the professional landscape through a lens of absolute clarity."
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <Link to="/blogs"
            className="bg-stone-900 text-white px-12 py-6 rounded-2xl font-bold text-xs uppercase tracking-[0.3em] hover:bg-emerald-800 transition-all shadow-2xl shadow-stone-200 active:scale-95 w-full md:w-auto">
            Explore {stats?.totalBlogs || ""} Archive
          </Link>
          <Link to="/dashboard"
            className="border-b-2 border-stone-200 text-stone-500 px-6 py-2 font-bold text-[10px] uppercase tracking-[0.4em] hover:text-stone-900 hover:border-stone-900 transition-all w-full md:w-auto">
            Internal Access
          </Link>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="divider opacity-50" />
      </div>

      {/* ── Section: The Narrative Soul ── */}
      <section className="max-w-6xl mx-auto px-6 py-40">
        <div className="grid lg:grid-cols-2 gap-24 items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 mb-6">Philosophy</p>
            <h2 className="text-4xl md:text-5xl font-bold text-stone-900 mb-10 serif leading-tight">
              The Narrative Soul.
            </h2>
            <div className="space-y-8 text-stone-600 serif text-lg leading-relaxed">
              <p>
                Every entry in The Manuscript is more than just text—it is a synthesized reflection of 
                market intelligence, human psychology, and professional foresight.
              </p>
              <p>
                We believe that true insight lies at the intersection of data-driven research and 
                editorial elegance. Our system works tirelessly in the background to ensure every 
                word resonates with the intended audience, without ever compromising on quality.
              </p>
              <p className="italic text-stone-400">
                "Precision isn't an accident; it's the result of a deliberate, multi-layered synthesis."
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] bg-stone-100 rounded-[40px] overflow-hidden shadow-inner border border-stone-200/50 flex items-center justify-center p-12">
              <div className="text-stone-300 serif italic text-center space-y-4">
                <p className="text-sm opacity-50 uppercase tracking-[0.5em] mb-8 font-sans not-italic">Internal Blueprint</p>
                <div className="h-0.5 w-12 bg-emerald-200 mx-auto" />
                <p className="text-6xl font-bold text-stone-900/5 leading-none">01</p>
                <p className="text-2xl text-stone-400">Synthesis</p>
                <p className="text-6xl font-bold text-stone-900/5 leading-none">02</p>
                <p className="text-2xl text-stone-400">Resonance</p>
                <p className="text-6xl font-bold text-stone-900/5 leading-none">03</p>
                <p className="text-2xl text-stone-400">Legacy</p>
                <div className="h-0.5 w-12 bg-emerald-200 mx-auto mt-8" />
              </div>
            </div>
            {/* Absolute element for premium feel */}
            <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-3xl shadow-xl border border-stone-100 hidden md:block max-w-[200px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Cycle Status</p>
              <p className="text-xl font-bold serif text-stone-900 leading-tight">
                {timeLeft ? timeLeft : "Active Intelligence"}
              </p>
              <p className="text-[9px] text-stone-400 mt-2 serif italic">Next autonomous intelligence cycle in progress.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: The Editorial Lens ── */}
      <section className="bg-stone-900 text-white py-40 px-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none serif text-[20vw] font-bold select-none -translate-x-1/4 -translate-y-1/4">
          MANUSCRIPT
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-24">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-6">Execution</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-10 serif leading-tight">
                The Editorial Lens.
              </h2>
              <p className="text-stone-400 serif text-xl leading-relaxed">
                Behind the scenes, The Manuscript employs a sophisticated multi-model architecture 
                that validates every thought against high-fidelity professional standards.
              </p>
            </div>
            <div className="flex items-center gap-4 border-l border-stone-800 pl-12 py-4">
              <div>
                <p className="text-4xl font-bold serif text-emerald-400">100%</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500 mt-1">Autonomous</p>
              </div>
              <div className="w-px h-12 bg-stone-800" />
              <div>
                <p className="text-4xl font-bold serif text-emerald-400">24/7</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500 mt-1">Refining</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { title: "Deep Research", body: "Exploring the hidden currents of professional demand and career evolution." },
              { title: "Psychological Sync", body: "Aligning narrative tone with the specific emotional triggers of the modern achiever." },
              { title: "Absolute Quality", body: "Multiple layers of validation ensure that only production-grade insights make it to print." },
            ].map((item, i) => (
              <div key={i} className="group cursor-default">
                <div className="text-emerald-500 font-bold mb-6 text-sm">0{i+1} —</div>
                <h3 className="text-2xl font-bold mb-4 serif group-hover:text-emerald-400 transition-colors">{item.title}</h3>
                <p className="text-stone-500 serif leading-relaxed group-hover:text-stone-400 transition-colors">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section: The Legacy ── */}
      <section className="max-w-4xl mx-auto px-6 py-48 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-600 mb-10">The Conclusion</p>
        <h2 className="text-5xl md:text-6xl font-bold text-stone-900 mb-12 serif leading-tight">
          Crafting the <span className="italic">Future Narrative</span>.
        </h2>
        <p className="text-stone-500 text-lg md:text-xl serif max-w-2xl mx-auto leading-relaxed mb-16">
          The Manuscript is a living system. Every cycle brings new depth, new insights, and 
          a more refined perspective on the professional world.
        </p>
        <div className="flex flex-col items-center gap-8">
          <Link to="/blogs"
            className="bg-emerald-600 text-white px-16 py-6 rounded-2xl font-bold text-xs uppercase tracking-[0.3em] hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-100 active:scale-95">
            Begin Reading
          </Link>
          <div className="h-12 w-px bg-stone-200" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-300">
            End of Volume I
          </p>
        </div>
      </section>
    </div>
  );
}
