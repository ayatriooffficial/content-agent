import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../api";

const AGENT_STEPS = [
  { key: "opportunity", label: "Opportunity Analysis", icon: "📊", desc: "Dual-model audience scoring (Gemini + DeepSeek R1)" },
  { key: "domainDetection", label: "Domain Detection", icon: "🔎", desc: "Precise sub-domain narrative routing" },
  { key: "personaLoader", label: "Persona Loader", icon: "📋", desc: "Intelligent template selection" },
  { key: "persona", label: "Persona Agent", icon: "👤", desc: "Semi-dynamic persona intelligence (Gemini)" },
  { key: "research", label: "Research Agent", icon: "🔍", desc: "8-methodology dual-model research" },
  { key: "competitor", label: "Competitor Agent", icon: "⚔️", desc: "7-framework analysis (DeepSeek R1)" },
  { key: "memory", label: "Memory Agent", icon: "🧠", desc: "Self-learning memory query" },
  { key: "orchestrator", label: "Orchestrator", icon: "🎯", desc: "5-source intelligence synthesis" },
  { key: "content_calendar", label: "Content Calendar", icon: "📅", desc: "15-day multi-stream calendar generation" },
  { key: "calendar_approval", label: "Needs Admin Approval", icon: "⏳", desc: "Approval gate before slot-level content generation" },
  { key: "generator", label: "Content Generator", icon: "✍️", desc: "Psychology-driven content (Groq)" },
  { key: "validation", label: "Validation Layer", icon: "✅", desc: "7-dimension quality assessment" },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [runs, setRuns] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [agentStatus, setAgentStatus] = useState({});
  const [agentData, setAgentData] = useState({});
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [expandedRun, setExpandedRun] = useState(null);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const abortRef = useRef(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [sRes, rRes, oRes, iRes] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/dashboard/pipeline-runs"),
        api.get("/dashboard/opportunities"),
        api.get("/dashboard/insights"),
      ]);
      setStats(sRes.data.stats);
      setRuns(rRes.data.runs);
      setOpportunities(oRes.data.opportunities);
      setInsights(iRes.data.insights);
    } catch (e) { console.error("Dashboard fetch error:", e); }
    setLoading(false);
  }

  // Countdown timer logic
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

  function getApiBase() {
    if (import.meta.env.VITE_API_BASE_URL) {
      return String(import.meta.env.VITE_API_BASE_URL).trim().replace(/\/+$/, "");
    }
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    return isLocal ? "http://localhost:5003" : "https://content-agent-u1on.onrender.com";
  }

  async function handleTrigger() {
    setTriggering(true); setPipelineRunning(true);
    setAgentStatus({}); setAgentData({}); setPipelineResult(null); setExpandedAgent(null);
    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const response = await fetch(`${getApiBase()}/api/dashboard/stream`, {
        method: "GET", signal: controller.signal
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;
          try {
            const msg = JSON.parse(raw);
            const { step, status, data } = msg;
            if (step === "complete" && status === "done") {
              setPipelineResult(data); setPipelineRunning(false); setTriggering(false);
              fetchAll(); continue;
            }
            if (step === "error") { setPipelineRunning(false); setTriggering(false); continue; }
            setAgentStatus(prev => ({ ...prev, [step]: status }));
            if (status === "done") setAgentData(prev => ({ ...prev, [step]: data }));
          } catch (_) {}
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") { setPipelineRunning(false); setTriggering(false); }
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-stone-400 animate-pulse serif text-2xl">Loading intelligence dashboard...</p>
    </div>
  );

  const hasAgentActivity = Object.keys(agentStatus).length > 0;

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full ${pipelineRunning ? "bg-emerald-500 animate-pulse" : "bg-stone-300"}`} />
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-600">Editorial Intelligence Dashboard</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-stone-900 serif">The Manuscript</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-stone-500 text-sm">High-Fidelity Editorial Control Center</p>
            {timeLeft && (
              <div className="flex items-center gap-2 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Next Auto-Run: {timeLeft}</span>
              </div>
            )}
          </div>
        </div>
        <button onClick={handleTrigger} disabled={pipelineRunning}
          className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all disabled:opacity-40 shadow-lg shadow-emerald-200 active:scale-95">
          {pipelineRunning ? (
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
              <span className="ml-1">Running...</span>
            </span>
          ) : "Trigger Pipeline"}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: "Total Blogs", value: stats.totalBlogs, color: "text-stone-900" },
            { label: "Autonomous", value: stats.autonomousBlogs, color: "text-emerald-600" },
            { label: "Pipeline Runs", value: stats.totalRuns, color: "text-stone-900" },
            { label: "Successful", value: stats.successfulRuns, color: "text-emerald-600" },
            { label: "Avg Quality", value: `${stats.avgValidationScore}%`, color: "text-stone-900" },
            { label: "Failed", value: stats.failedRuns, color: "text-red-500" },
          ].map(s => (
            <div key={s.label} className="bg-white border border-stone-100 rounded-2xl p-5 text-center hover:shadow-md transition-shadow">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-stone-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Scheduler + Latest Info */}
      {stats && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-3xl p-6 text-white">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-4">Scheduler</p>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${stats.scheduler?.schedulerStatus === "active" ? "bg-emerald-400 animate-pulse" : "bg-stone-500"}`} />
              <span className="text-xs font-bold uppercase">{stats.scheduler?.schedulerStatus || "Inactive"}</span>
            </div>
            <p className="text-stone-400 text-xs">{stats.scheduler?.schedule || "Not configured"}</p>
            {stats.scheduler?.nextScheduledRun && (
              <p className="text-stone-500 text-[10px] mt-2">Next: {new Date(stats.scheduler.nextScheduledRun).toLocaleDateString()}</p>
            )}
          </div>

          {stats.latestBlog && (
            <div className="bg-white border border-stone-100 rounded-3xl p-6">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-stone-400 mb-4">Latest Blog</p>
              <h3 className="font-bold text-stone-900 text-sm mb-2 line-clamp-2">{stats.latestBlog.title}</h3>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {stats.latestBlog.category && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{stats.latestBlog.category}</span>}
                {stats.latestBlog.audienceCategory && <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-bold">{stats.latestBlog.audienceCategory}</span>}
                {stats.latestBlog.targetLocation && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">📍 {stats.latestBlog.targetLocation}</span>}
              </div>
            </div>
          )}

          {stats.categoryDistribution && stats.categoryDistribution.length > 0 && (
            <div className="bg-white border border-stone-100 rounded-3xl p-6">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-stone-400 mb-4">Audience Distribution</p>
              <div className="space-y-3">
                {stats.categoryDistribution.map(cd => (
                  <div key={cd._id || "unknown"} className="flex items-center justify-between">
                    <span className="text-xs text-stone-600 font-medium">{cd._id || "Uncategorized"}</span>
                    <span className="text-xs font-black text-stone-900">{cd.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Pipeline Progress */}
      {hasAgentActivity && (
        <div className="bg-gradient-to-br from-emerald-50/50 to-stone-50 border border-emerald-100 rounded-3xl p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-6">
            🔴 Live Pipeline — {AGENT_STEPS.length} Agents
          </p>
          <div className="space-y-2">
            {AGENT_STEPS.map(agent => {
              const status = agentStatus[agent.key] || "waiting";
              const data = agentData[agent.key];
              const isExpand = expandedAgent === agent.key;
              const isActive = status === "running";
              const isDone = status === "done";
              const isAwaitingApproval = status === "awaiting_approval";
              return (
                <div key={agent.key}>
                  <div onClick={() => data && setExpandedAgent(isExpand ? null : agent.key)}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                      isDone ? "bg-white border border-emerald-100 cursor-pointer hover:bg-emerald-50" :
                      isAwaitingApproval ? "bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100" :
                      isActive ? "bg-white border border-emerald-200 shadow-sm" :
                      "bg-white/50 border border-transparent opacity-40"
                    }`}>
                    <span className="text-xl">{agent.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-900">{agent.label}</p>
                      <p className="text-xs text-stone-500 truncate">{agent.desc}</p>
                    </div>
                    {isActive && <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
                    {isDone && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">✓ Done</span>}
                    {isAwaitingApproval && <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 bg-amber-100 px-3 py-1 rounded-full">Needs Admin Approval</span>}
                  </div>
                  {isExpand && data && (
                    <div className="mt-1 mb-2 bg-white border border-stone-200 rounded-2xl p-5 text-xs space-y-3">
                      {data.methodology && (
                        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-700 mb-1">🔬 Methodology</p>
                          <p className="text-stone-700 font-medium">{data.methodology.approach}</p>
                          {data.methodology.reasoning && <p className="text-stone-500 mt-1 italic text-[10px]">{data.methodology.reasoning}</p>}
                        </div>
                      )}
                      <div className="space-y-4">
                        {Object.entries(data).filter(([k, v]) => k !== "methodology" && v).map(([key, val]) => {
                          const renderVal = (v) => {
                            if (Array.isArray(v)) {
                              if (v.length === 0) return <span className="text-stone-400 italic">None</span>;
                              if (typeof v[0] === "object") {
                                return (
                                  <div className="space-y-2 mt-1">
                                    {v.map((item, i) => (
                                      <div key={i} className="bg-stone-50 rounded-lg p-2 border border-stone-100">
                                        {Object.entries(item).map(([ik, iv]) => (
                                          <div key={ik} className="flex gap-2 text-[10px]">
                                            <span className="font-bold text-stone-400 uppercase w-20 flex-shrink-0">{ik}</span>
                                            <span className="text-stone-600">{typeof iv === "object" ? JSON.stringify(iv) : String(iv)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return <span className="text-stone-700 leading-relaxed">{v.join(" · ")}</span>;
                            }
                            if (typeof v === "object" && v !== null) {
                              return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                  {Object.entries(v).map(([nk, nv]) => (
                                    <div key={nk} className="bg-stone-50 rounded-lg p-2 border border-stone-100">
                                      <p className="text-[8px] font-black text-stone-400 uppercase mb-1">{nk.replace(/([A-Z])/g, " $1")}</p>
                                      <p className="text-stone-700">{Array.isArray(nv) ? nv.join(", ") : String(nv)}</p>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return <span className="text-stone-700 leading-relaxed">{String(v)}</span>;
                          };

                          return (
                            <div key={key} className="border-t border-stone-100 pt-3 first:border-0 first:pt-0">
                              <p className="font-black text-stone-400 uppercase text-[9px] tracking-wider mb-1">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </p>
                              <div className="text-stone-700">{renderVal(val)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {pipelineResult && (
            <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-black text-stone-900 mb-1">{pipelineResult.title}</p>
              <div className="flex items-center justify-center gap-4 text-xs text-stone-500">
                <span>For: <strong>{pipelineResult.audienceCategory}</strong></span>
                <span>📍 {pipelineResult.targetLocation}</span>
                <span>Quality: <strong>{pipelineResult.validationScore}%</strong></span>
                <span>{pipelineResult.wordCount} words</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Opportunity Scores */}
      {opportunities.length > 0 && (
        <div className="bg-white border border-stone-100 rounded-3xl p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 mb-6">Latest Opportunity Analysis</p>
          {(() => {
            const latest = opportunities[0];
            return (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <span className="bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-black">Winner: {latest.selectedCategory}</span>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold">📍 {latest.targetLocation}</span>
                </div>
                {latest.selectionReasoning && <p className="text-sm text-stone-600 serif italic mb-6">{latest.selectionReasoning}</p>}
                <div className="grid md:grid-cols-3 gap-4">
                  {(latest.categoryScores || []).map(cs => (
                    <div key={cs.category} className={`rounded-2xl p-5 border ${cs.category === latest.selectedCategory ? "border-emerald-300 bg-emerald-50" : "border-stone-100 bg-stone-50"}`}>
                      <p className="font-bold text-stone-900 text-sm mb-3">{cs.category}</p>
                      <p className="text-3xl font-black text-stone-900 mb-3">{cs.totalScore}<span className="text-sm text-stone-400">/100</span></p>
                      {cs.scores && (
                        <div className="space-y-1.5">
                          {Object.entries(cs.scores).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="text-[9px] text-stone-400 w-24 truncate">{k.replace(/([A-Z])/g, " $1")}</span>
                              <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${v}%` }} />
                              </div>
                              <span className="text-[9px] font-bold text-stone-500 w-6 text-right">{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Pipeline Run History */}
      <div className="bg-white border border-stone-100 rounded-3xl p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 mb-6">Pipeline Run History</p>
        {runs.length === 0 ? (
          <p className="text-stone-400 text-sm serif italic text-center py-8">No pipeline runs yet. Trigger one above.</p>
        ) : (
          <div className="space-y-3">
            {runs.map(run => (
              <div key={run.runId} onClick={() => setExpandedRun(expandedRun === run.runId ? null : run.runId)}
                className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-sm ${
                  run.status === "completed" ? "border-emerald-100 bg-emerald-50/30" :
                  run.status === "failed" ? "border-red-100 bg-red-50/30" :
                  run.status === "awaiting_approval" ? "border-amber-100 bg-amber-50/30" :
                  "border-stone-100"
                }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${
                  run.status === "completed" ? "bg-emerald-500" :
                  run.status === "failed" ? "bg-red-500" :
                  run.status === "awaiting_approval" ? "bg-amber-500" :
                  "bg-yellow-500 animate-pulse"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-900 truncate">{run.generatedBlogTitle || "In Progress..."}</p>
                  <div className="flex items-center gap-3 text-[10px] text-stone-400 mt-0.5">
                    <span className="font-bold uppercase">{run.runType}</span>
                    {run.selectedAudienceCategory && <span>👤 {run.selectedAudienceCategory}</span>}
                    {run.selectedLocation && <span>📍 {run.selectedLocation}</span>}
                    {run.durationMs && <span>⏱ {Math.round(run.durationMs / 1000)}s</span>}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                  run.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                  run.status === "failed" ? "bg-red-100 text-red-700" :
                  run.status === "awaiting_approval" ? "bg-amber-100 text-amber-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>{run.status === "awaiting_approval" ? "Needs Admin Approval" : run.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Insights Panel */}
      {insights?.latestAgentOutputs && (
        <div className="grid md:grid-cols-2 gap-6">
          {insights.latestAgentOutputs.personaIntelligence && (
            <div className="bg-white border border-stone-100 rounded-3xl p-6">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-4">Latest Persona Insight</p>
              <h3 className="font-bold text-stone-900 text-sm mb-2">{insights.latestAgentOutputs.personaIntelligence.buyerPersona}</h3>
              <p className="text-xs text-stone-500 serif leading-relaxed">{insights.latestAgentOutputs.personaIntelligence.characterSnapshot}</p>
              <p className="text-[10px] text-stone-400 mt-3">📍 {insights.selectedLocation} · 👤 {insights.selectedCategory}</p>
            </div>
          )}
          {insights.memoryStats && (
            <div className="bg-white border border-stone-100 rounded-3xl p-6">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-4">Memory System</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Titles", value: insights.memoryStats.totalTitles },
                  { label: "Keywords", value: insights.memoryStats.totalKeywords },
                  { label: "Hooks", value: insights.memoryStats.totalHooks },
                  { label: "Strategies", value: insights.memoryStats.totalStrategies },
                  { label: "Location Patterns", value: insights.memoryStats.locationPatterns },
                  { label: "Competitor Gaps", value: insights.memoryStats.competitorGaps },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-xl font-black text-stone-900">{m.value}</p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-stone-400">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
