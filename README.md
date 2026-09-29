# Emergency Response Coordinator 🚨

An AI-assisted emergency triage and multi-agency dispatch coordination platform built with **Node.js**, **Express**, **PostgreSQL**, **Google Gemini**, **Vectorize Hindsight Episodic Memory**, and **React (Vite)**.

---

## Architecture Overview

```
[ Citizen Report ]
       │
       ▼
[ POST /api/emergencies ] ──► [ PostgreSQL ]
       │
       ▼
[ POST /api/emergencies/:id/analyze ]
       │
       ├──► 🧠 [ Hindsight Recall ] ── (Queries active & historical scene constraints, road blocks, past coordinator decisions)
       │           │
       │           ▼
       ├──► 🤖 [ Google Gemini Decision Support ] (Evaluates incident with advisory episodic memory context)
       │           │
       │           ├──► [ PostgreSQL: ai_analysis ] (Persists category, severity, priority, responders, memory metadata)
       │           ▼
       └──► 🧠 [ Hindsight Retain ] ── (Persists incident triage outcome, dispatch orders, coordinator overrides)
```

---

## Hindsight Episodic Memory

### 1. Why Emergency AI Needs Memory
In standard stateless LLM architectures, each incident is triaged in complete isolation. If a major multi-vehicle accident at an intersection causes heavy road blockage and traffic diversion (e.g. `ER-1011`), a subsequent medical emergency reported two blocks away 5 minutes later would normally receive zero context regarding the blocked road, active emergency vehicle congestion, or past coordinator resource allocations.

With **Vectorize Hindsight Episodic Memory**, the emergency AI acquires long-term situational awareness:
- Retains real operational events across incident lifecycles.
- Recalls relevant historical and active incident facts near the scene.
- Enhances Gemini AI prompts with advisory situational context.

### 2. Retain Workflow
The system automatically retains structured operational memories at critical lifecycle transitions:
- **ANALYSIS**: Triage category, severity, priority, recommended responders, and key detected signals.
- **DISPATCH**: Confirmed dispatch decisions, responder units assigned, and timestamps.
- **COORDINATOR OVERRIDE**: Human coordinator adjustments over AI recommendations (allowing future triage to benefit from human expertise).
- **ARRIVED**: Responder arrival on scene and operational state transitions.
- **RESOLVED**: Incident closure, final outcomes, and operational lessons.

All memory content is strictly sanitized prior to retention: passwords, full phone numbers, email addresses, and API credentials are automatically stripped.

### 3. Recall Workflow
Prior to invoking Gemini AI analysis:
1. The system extracts the incident's reported type, location text, and description.
2. A focused semantic query is dispatched to Hindsight:
   `"Find relevant active and historical emergency incidents near [location] involving [type], road blockages, responder activity, recurring hazards, coordinator decisions, and similar incidents."`
3. Recalled facts are formatted into a clean advisory memory context.
4. Gemini receives both the recalled memory and the current emergency report.

### 4. Human-in-the-Loop & Safety Design
- **Advisory Context Only**: The Gemini system prompt strictly enforces that recalled memory is historical context and must not be treated as real-time ground truth.
- **Current Incident Priority**: The citizen's real-time report always takes precedence over recalled memory.
- **No Autonomous Dispatch**: AI and memory provide decision support; trained human coordinators maintain final verification and dispatch authority.

### 5. Fail-Safe Behavior
Hindsight is designed as an additive enhancement, **never a single point of failure**:
- Every Hindsight operation is wrapped in a 3.5-second timeout and try/catch block.
- If `HINDSIGHT_API_KEY` is unconfigured, the service operates in standby mode (`available: false`).
- If the Hindsight API encounters network degradation or timeouts, Gemini analysis and deterministic rule-based fallback continue seamlessly without interruption or 500 errors.

---

## Official Hindsight References
- **Hindsight GitHub Repository:** [https://github.com/vectorize-io/hindsight](https://github.com/vectorize-io/hindsight)
- **Hindsight Documentation:** [https://hindsight.vectorize.io/](https://hindsight.vectorize.io/)
- **Vectorize Agent Memory:** [https://vectorize.io/what-is-agent-memory](https://vectorize.io/what-is-agent-memory)

---

## Environment Variables

Configure in `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_response

# Google Gemini AI Provider
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_api_key_here
AI_MODEL=gemini-flash-lite-latest

# Vectorize Hindsight Episodic Memory
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=your_hindsight_api_key_here
HINDSIGHT_BANK_ID=emergency-response-coordinator
```

---

## Local Setup & Verification

### 1. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start Backend Server
```bash
cd backend
node server.js
```
Backend runs at `http://localhost:5000`.

### 3. Start Frontend Client
```bash
cd frontend
npm run dev
```
Frontend runs at `http://localhost:5173`.

### 4. Run Hindsight Verification Suite
To run the automated verification script:
```bash
cd backend
node scripts/testHindsight.js
```

### 5. Verify Memory Health API
```bash
curl http://localhost:5000/api/memory/health
```
Example response:
```json
{
  "configured": true,
  "available": true,
  "bankId": "emergency-response-coordinator",
  "apiVersion": "0.10.1"
}
```
