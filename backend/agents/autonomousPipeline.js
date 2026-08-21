/**
 * AUTONOMOUS PIPELINE
 * The intelligence-gathering half of the autonomous flow that runs every
 * 15 days. It ends at the first Admin Approval Gate — it does NOT generate
 * or publish any blog/email/WhatsApp content itself.
 *
 * AGENT ORDER:
 * 1. Opportunity Analysis Agent (select audience + location)
 * 2. Persona Intelligence Agent (Groq)
 * 3. Research Agent (Groq)
 * 4. Competitor Agent (Groq)
 * 5. Memory Agent (self-learning)
 * 6. Orchestrator Agent (Groq)
 * 7. Content Calendar Agent (runs on the synthesized blueprint) + Admin Approval Gate
 *
 * What happens after the gate is deliberately NOT part of this function:
 *   - Admin approves/rejects individual calendar slots via
 *     PATCH /api/dashboard/calendars/:id/slots/:channel/:slotKey/approve|reject
 *     (routes/dashboardRoutes.js), which triggers per-slot generation
 *     (agents/contentCalendar/slotContentAgent.js) using the persona /
 *     research / competitor / blueprint intelligence saved on this run's
 *     PipelineRun document below.
 *   - Each generated Blog / EmailCampaign / WhatsAppCampaign then sits in
 *     its own SECOND admin approval gate (the content review queue in
 *     approval-dashboard2), and only publishes/sends once approved there
 *     (routes/blogRoutes.js, routes/emailRoutes.js, routes/whatsappRoutes.js).
 */
const { v4: uuidv4 } = require("uuid");

// Models
const PipelineRun = require("../models/PipelineRun");
const OpportunityScore = require("../models/OpportunityScore");
const Persona = require("../models/Persona");
const ResearchHistory = require("../models/ResearchHistory");
const CompetitorAnalysis = require("../models/CompetitorAnalysis");
const ContentCalendar = require("../models/ContentCalendar");

// Agents
const opportunityAgent = require("./opportunityAgent");
const domainDetectionAgent = require("./domainDetectionAgent");
const personaTemplateLoader = require("./personaTemplateLoader");
const personaAgent = require("./personaAgent");
const researchAgent = require("./researchAgent");
const competitorAgent = require("./competitorAgent");
const { memoryAgent } = require("./memoryAgent");
const orchestratorAgent = require("./orchestratorAgent");
const runContentCalendarAgent = require("./contentCalendar/contentCalendarAgent");

// Config
const { getCompetitorURLs } = require("../config/competitors");
const { PROGRAM_SPECS, COMPETITOR_GROUPS } = require("../data/buyerJourneyIntel");

// Per-process counter — rotates DGM persona archetypes across pipeline runs.
let dgmRunCounter = 0;

/** Formats a competitor group as prompt context for the competitor agent. */
function competitorGroupContext(groupKey) {
  const group = COMPETITOR_GROUPS[groupKey] || [];
  return group.map((c) => `${c.name} (${c.url}) — ${c.category}`).join("\n");
}

/**
 * Run the complete autonomous pipeline.
 * @param {object} options - { runType, sseWriter, onStepUpdate }
 * @returns {object} Pipeline run result
 */
async function runAutonomousPipeline(options = {}) {
  const runId = uuidv4();
  const runType = options.runType || "autonomous";
  const sseWriter = options.sseWriter || null;
  const onStepUpdate = options.onStepUpdate || (() => { });
  // Rotates DGM persona archetypes across pipeline runs (0,1,2 → repeat)
  dgmRunCounter++;

  const sendStep = (step, status, data) => {
    const logEntry = { step, status, message: data?.message || step, timestamp: new Date() };
    onStepUpdate(logEntry);
    if (sseWriter) {
      sseWriter(`data: ${JSON.stringify({ step, status, data })}\n\n`);
    }
  };

  // Create pipeline run record
  const pipelineRun = new PipelineRun({
    runId,
    runType,
    status: "running",
    startedAt: new Date(),
    stepLog: []
  });

  try {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ══════════════════════════════════════════════════════════════
    // STEP 0: OPPORTUNITY ANALYSIS — Select Audience + Location
    // ══════════════════════════════════════════════════════════════
    sendStep("opportunity", "running", {
      message: "Analyzing market opportunities across 3 audience categories...",
      methodology: "Groq Opportunity Intelligence (Llama 3.3 70B)"
    });
    pipelineRun.currentStep = "opportunity";

    const opportunityResult = await opportunityAgent();

    const selectedCategory = opportunityResult.selectedCategory;
    const selectedLocation = opportunityResult.selectedLocation;

    // Save opportunity scores
    const oppScore = new OpportunityScore({
      targetLocation: selectedLocation,
      categoryScores: opportunityResult.categoryScores,
      selectedCategory,
      selectionReasoning: opportunityResult.selectionReasoning,
      marketTrends: opportunityResult.marketTrends,
      competitorWeaknesses: opportunityResult.competitorWeaknesses,
      emotionalOpportunities: opportunityResult.emotionalOpportunities,
      seoGaps: opportunityResult.seoGaps,
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      methodology: opportunityResult.methodology
    });
    await oppScore.save();

    pipelineRun.selectedAudienceCategory = selectedCategory;
    pipelineRun.selectedLocation = selectedLocation;
    pipelineRun.opportunityScore = (opportunityResult.categoryScores.find(c => c.category === selectedCategory) || {}).totalScore || 0;
    pipelineRun.selectionReasoning = opportunityResult.selectionReasoning;
    pipelineRun.agentOutputs = { opportunityAnalysis: opportunityResult };

    sendStep("opportunity", "done", {
      selectedCategory,
      scores: opportunityResult.categoryScores?.map(c => `${c.category}: ${c.totalScore}`).join(" | "),
      reasoning: opportunityResult.selectionReasoning,
      methodology: opportunityResult.methodology
    });
    await delay(1000);

    // Build business context from autonomous selection
    const businessContext = {
      companyName: "Charters Union of Business",
      productDescription: "Autonomous AI-powered accounting, digital marketing & business education content (CBA/DGM/TBM programs)",
      productFeatures: ["Practical accounting training", "GST filing", "Tally ERP", "Digital growth & marketing", "Interview preparation", "Placement support"],
      competitors: getCompetitorURLs(),
      audienceCategory: selectedCategory,
      educationBackground: selectedCategory === "Working Professional" ? "Commerce Graduate" : "Commerce",
      experienceLevel: selectedCategory === "Working Professional" ? "Experienced" : "Beginner",
      primaryGoal: selectedCategory === "Working Professional" ? "Increase Salary" : "Get First Job",
      biggestProblem: selectedCategory === "12th Pass Commerce Student" ? "No career direction" :
        selectedCategory === "Working Professional" ? "Career stagnation" : "No practical accounting exposure",
      businessGoal: "Generate SEO traffic and student enrollment",
      industry: "Accounting & Finance Education",
      targetLocation: selectedLocation,
      // CBA program spec for the primary accounting persona/research stream
      programSpec: PROGRAM_SPECS.CBA
    };

    // DGM business context (used for the DGM persona/research/competitor runs)
    const dgmBusinessContext = {
      ...businessContext,
      program: "DGM",
      programSpec: PROGRAM_SPECS.DGM,
      industry: "Digital Marketing Education",
      biggestProblem: "No practical marketing experience and no portfolio",
      primaryGoal: "Get a digital marketing job / agency role"
    };

    // ══════════════════════════════════════════════════════════════
    // STEP 1: DOMAIN DETECTION (Deterministic)
    // ══════════════════════════════════════════════════════════════
    sendStep("domainDetection", "running", {
      message: `Routing to ${selectedCategory} sub-domain...`,
      methodology: "Deterministic Domain Routing"
    });
    const domainResult = domainDetectionAgent(businessContext);
    sendStep("domainDetection", "done", domainResult);
    await delay(500);

    // ══════════════════════════════════════════════════════════════
    // STEP 2: PERSONA TEMPLATE LOADER
    // ══════════════════════════════════════════════════════════════
    sendStep("personaLoader", "running", {
      message: `Loading ${selectedCategory} persona template...`,
      methodology: "Intelligent Template Selection"
    });
    const selectedTemplates = personaTemplateLoader(domainResult, { course: "CBA" });
    // DGM persona template (rotates across the 3 DGM archetypes)
    const dgmTemplates = personaTemplateLoader(domainResult, { course: "DGM", rotationSeed: dgmRunCounter });
    sendStep("personaLoader", "done", {
      count: selectedTemplates.length,
      labels: selectedTemplates.map(t => t.label),
      dgmLabel: dgmTemplates[0]?.label || "",
      matchedCategory: selectedCategory
    });
    await delay(500);

    // ══════════════════════════════════════════════════════════════
    // STEP 3: PERSONA AGENT (Enriched with Pains + Locations)
    // ══════════════════════════════════════════════════════════════
    sendStep("persona", "running", {
      message: `Enriching ${selectedCategory} persona with psychological context...`,
      methodology: "Psychological Persona Enrichment (Groq Llama 3.3)"
    });
    pipelineRun.currentStep = "persona";

    const personaResult = await personaAgent(
      selectedTemplates,
      businessContext,
      { city: selectedLocation },
      opportunityResult.broadMarketResearch || "",
      businessContext.programSpec
    );

    await Persona.create({
      domain: domainResult.domain,
      companyName: businessContext.companyName,
      selectedTemplates: selectedTemplates.map(t => t.label),
      profile: personaResult,
    });

    // DGM persona run — same enrichment flow, DGM template + DGM program spec
    let personaResultDGM = null;
    try {
      personaResultDGM = await personaAgent(
        dgmTemplates,
        dgmBusinessContext,
        { city: selectedLocation },
        opportunityResult.broadMarketResearch || "",
        dgmBusinessContext.programSpec
      );
      await Persona.create({
        domain: "digital-marketing",
        companyName: businessContext.companyName,
        selectedTemplates: dgmTemplates.map(t => t.label),
        profile: personaResultDGM,
      });
    } catch (err) {
      console.warn("⚠️ DGM persona run failed (continuing with CBA-only):", err.message);
    }

    pipelineRun.agentOutputs.personaIntelligence = personaResult;
    if (personaResultDGM) pipelineRun.agentOutputs.personaIntelligenceDGM = personaResultDGM;
    sendStep("persona", "done", personaResult);
    await delay(1000);

    // ══════════════════════════════════════════════════════════════
    // STEP 4: RESEARCH AGENT (Deep Pain Point Analysis)
    // ══════════════════════════════════════════════════════════════
    sendStep("research", "running", {
      message: `Performing behavioral and analytical research for ${selectedCategory}...`,
      methodology: "Unified Research Intelligence (Groq Llama 3.3)"
    });
    pipelineRun.currentStep = "research";

    const researchResult = await researchAgent(personaResult, businessContext, { city: selectedLocation });

    // DGM research run (persona + programSpec + live search all course-specific)
    let researchResultDGM = null;
    if (personaResultDGM) {
      try {
        researchResultDGM = await researchAgent(personaResultDGM, dgmBusinessContext, { city: selectedLocation });
      } catch (err) {
        console.warn("⚠️ DGM research run failed (continuing with CBA-only):", err.message);
      }
    }

    await ResearchHistory.create({
      domain: domainResult.domain,
      companyName: businessContext.companyName,
      keywords: researchResult.keywords,
      trendingTopics: researchResult.trendInsights,
      contextualQueries: researchResult.aiSearchQueries,
      searchPatterns: researchResult.searchIntentAnalysis,
    });

    pipelineRun.agentOutputs.researchIntelligence = researchResult;
    if (researchResultDGM) pipelineRun.agentOutputs.researchIntelligenceDGM = researchResultDGM;
    sendStep("research", "done", researchResult);
    await delay(1000);

    // ══════════════════════════════════════════════════════════════
    // STEP 5: COMPETITOR AGENT (Hardcoded Competitor URLs)
    // ══════════════════════════════════════════════════════════════
    sendStep("competitor", "running", {
      message: "Analyzing competitor gaps and blind spots...",
      methodology: "Competitive Intelligence (Groq Llama 3.3)"
    });
    pipelineRun.currentStep = "competitor";

    const competitorResult = await competitorAgent(
      businessContext.competitors,
      personaResult,
      researchResult
    );

    // DGM competitor run — digital-marketing competitor set + DGM persona/research
    let competitorResultDGM = null;
    if (personaResultDGM) {
      try {
        competitorResultDGM = await competitorAgent(
          COMPETITOR_GROUPS.digitalMarketing.map((c) => c.url),
          personaResultDGM,
          researchResultDGM || researchResult,
          { competitorContext: competitorGroupContext("digitalMarketing") }
        );
      } catch (err) {
        console.warn("⚠️ DGM competitor run failed (continuing with CBA-only):", err.message);
      }
    }

    await CompetitorAnalysis.create({
      domain: domainResult.domain,
      companyName: businessContext.companyName,
      competitorWebsites: businessContext.competitors,
      keywordGaps: competitorResult.seoGaps,
      missingTopics: competitorResult.contentOpportunities,
      competitorWeaknesses: competitorResult.messagingWeaknesses,
      strategyNotes: competitorResult.strategyNotes,
    });

    pipelineRun.agentOutputs.competitorIntelligence = competitorResult;
    if (competitorResultDGM) pipelineRun.agentOutputs.competitorIntelligenceDGM = competitorResultDGM;
    sendStep("competitor", "done", competitorResult);
    await delay(1000);

    // ══════════════════════════════════════════════════════════════
    // STEP 6: MEMORY AGENT (Self-Learning)
    // ══════════════════════════════════════════════════════════════
    sendStep("memory", "running", {
      message: "Querying self-learning memory system...",
      methodology: "MongoDB-Backed Long-Term Memory"
    });
    const memoryResult = await memoryAgent(domainResult.domain);
    sendStep("memory", "done", memoryResult);
    await delay(500);

    // ══════════════════════════════════════════════════════════════
    // STEP 7: ORCHESTRATOR (Central Brain)
    // ══════════════════════════════════════════════════════════════
    sendStep("orchestrator", "running", {
      message: "Central brain synthesizing all intelligence...",
      methodology: "Multi-Intelligence Synthesis (Groq Llama 3.3)"
    });
    pipelineRun.currentStep = "orchestrator";

    const blueprint = await orchestratorAgent(personaResult, researchResult, competitorResult, memoryResult, domainResult);

    pipelineRun.agentOutputs.orchestratorBlueprint = blueprint;
    sendStep("orchestrator", "done", blueprint);
    await delay(1000);

    // ══════════════════════════════════════════════════════════════
    // STEP 7.1: CONTENT CALENDAR AGENT (3 Streams: Blog, Email, WhatsApp)
    // Runs AFTER the orchestrator so the calendar is built from the
    // final synthesized strategy (targetKeywords, contentAngle,
    // emotionalHook, emotionalAngle) instead of raw pre-synthesis
    // persona/research/competitor data.
    // ══════════════════════════════════════════════════════════════
    sendStep("content_calendar", "running", { message: "Generating 15-day multi-stream content calendar..." });
    pipelineRun.currentStep = "content_calendar";

    const calendarPayload = await runContentCalendarAgent({
      businessContext,
      personaResult,
      researchResult,
      competitorResult,
      memoryResult,
      blueprint, // ✅ orchestrator's synthesized strategy now feeds the calendar
      personaResultDGM,
      researchResultDGM,
      competitorResultDGM
    }, new Date().toISOString());

    // Save ContentCalendar to MongoDB
    const contentCalendarDoc = new ContentCalendar({
      calendarId: calendarPayload.calendarId,
      campaignName: calendarPayload.campaignName,
      timeframe: calendarPayload.timeframe || "15 Days",
      status: "PENDING_ADMIN_APPROVAL",
      summary: calendarPayload.summary,
      schedule: calendarPayload.schedule,
      calendarView: calendarPayload.calendarView,
      pipelineRunId: runId,
      audienceCategory: selectedCategory,
      targetLocation: selectedLocation,
      generatedBy: "autonomous",
      businessContext: {
        companyName: businessContext.companyName,
        domain: domainResult?.domain || "Accounting",
        industry: businessContext.industry
      }
    });

    await contentCalendarDoc.save();

    // Attach saved calendar document to pipeline run
    pipelineRun.agentOutputs.contentCalendar = contentCalendarDoc;

    // ══════════════════════════════════════════════════════════════
    // STEP 7.2: ADMIN APPROVAL GATE (PAUSE PIPELINE HERE)
    // ══════════════════════════════════════════════════════════════
    pipelineRun.status = "awaiting_approval";
    pipelineRun.currentStep = "calendar_approval";
    await pipelineRun.save();

    sendStep("calendar_approval", "awaiting_approval", {
      message: "15-Day Content Calendar created and saved! Pipeline paused waiting for Admin Approval.",
      calendarMongoId: contentCalendarDoc._id,
      calendarId: contentCalendarDoc.calendarId,
      summary: contentCalendarDoc.summary,
      schedule: contentCalendarDoc.schedule,
      calendarView: contentCalendarDoc.calendarView
    });

    console.log(`⏸️ [Pipeline ${runId}] Paused at Admin Approval Gate. Calendar ID: ${contentCalendarDoc.calendarId}`);

    // Intelligence gathering is done — everything past this point (blog /
    // email / WhatsApp generation, validation, saving, sending/publishing)
    // happens per-slot, only after an admin approves that slot, via
    // routes/dashboardRoutes.js -> agents/contentCalendar/slotContentAgent.js.
    return {
      runId,
      status: "awaiting_approval",
      selectedAudienceCategory: selectedCategory,
      selectedLocation,
      opportunityScore: pipelineRun.opportunityScore,
      calendarId: contentCalendarDoc.calendarId,
      calendarMongoId: contentCalendarDoc._id,
      summary: contentCalendarDoc.summary,
      message: "Content calendar generated and awaiting admin approval. Approve individual slots to generate their content.",
    };

  } catch (err) {
    console.error("❌ Autonomous Pipeline Error:", err);
    pipelineRun.status = "failed";
    pipelineRun.error = err.message;
    pipelineRun.failedAtStep = pipelineRun.currentStep;
    pipelineRun.completedAt = new Date();
    pipelineRun.durationMs = Date.now() - pipelineRun.startedAt.getTime();
    await pipelineRun.save();

    sendStep("error", "failed", { message: err.message, failedAt: pipelineRun.currentStep });

    return { runId, status: "failed", error: err.message, failedAt: pipelineRun.currentStep };
  }
}

module.exports = { runAutonomousPipeline };