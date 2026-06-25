# Papertrail OS — Terminology Map

The product is branded as a professional lead-research and controlled-outreach
operating system. Internal automation may use model providers, but no AI/prompt
language appears in UI, file names, routes, or variables. This map is the
canonical translation — use the right column everywhere.

| Avoid (AI/prompt language)        | Use (Papertrail OS language)            |
| --------------------------------- | --------------------------------------- |
| AI / AI-powered / LLM / bot       | Engine / Workflow / Runner              |
| prompt / prompt template          | brief / draft template                  |
| AI agent                          | Engine (e.g. Research Engine)           |
| generate with AI                  | draft / compose / score                 |
| ChatGPT / Claude / OpenAI key     | Model Provider / Provider API Key       |
| the model / the AI                | the provider / the engine               |
| magic / autonomous spam           | automation / job                        |

## Engine / service names (internal)

| Spec "agent"        | Papertrail OS module        | File                       |
| ------------------- | --------------------------- | -------------------------- |
| LeadCollectorAgent  | Lead Collector              | `leadCollector.ts`         |
| EnrichmentAgent     | Research Engine             | `researchEngine.ts`        |
| AuditAgent          | Website Audit               | `auditEngine.ts`           |
| EventTrackerAgent   | Signal Scan                 | `signalScan.ts`            |
| OfferMatcherAgent   | Offer Match                 | `offerMatch.ts`            |
| OutreachWriterAgent | Draft Engine                | `draftEngine.ts`           |
| ComplianceAgent     | Compliance Check            | `complianceChecker.ts`     |
| CRMUpdaterAgent     | Lead Trail / CRM Updater    | `crmUpdater.ts`            |
| ReplyClassifierAgent| Reply Radar                 | `replyRadar.ts`            |
| JobRunner           | Job Runner                  | `jobRunner.ts`             |

## Provider abstraction

Model calls hide behind `ModelProvider` (`src/lib/providers/`). The UI never
names a vendor except in admin → "Model Provider" settings. Real provider keys
(`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_PLACES_API_KEY`) live only in
`.env` / server code, never in client bundles or user-facing copy.
