# ✦ JobPilot AI

An AI job-application copilot: it finds roles, scores your fit, tailors your resume, drafts your outreach, and tracks the whole pipeline.

This repo has two parts:

- **`frontend/jobpilot-demo.html`** — a single-file, fully working app. Open it in a browser and every module works with realistic sample data (no install, no keys). It also has a **"Connect backend"** field in the sidebar: paste your deployed backend URL there and Job Finder switches from sample data to live search against real job APIs.
- **`backend/`** — an Express API with the real integrations: live job search, Claude-powered resume/cover-letter generation, Gmail OAuth + sending, resume parsing, PDF export, a tracker, and analytics. It runs with **zero config** (falls back to bundled sample data and template text) and gets progressively more "real" as you add API keys.

## Quick start (local)

```bash
cd backend
cp .env.example .env      # fill in whatever keys you have — all optional
npm install
npm run dev                # http://localhost:4000
```

Open `frontend/jobpilot-demo.html` directly in a browser (double-click it, or `npx serve frontend`). In the sidebar, click **Connect backend** and enter `http://localhost:4000` to switch Job Finder to live mode.

## Deploying to Render

1. Push this repo to GitHub.
2. In Render, **New → Blueprint**, point it at the repo — it will read `render.yaml` and create:
   - `jobpilot-ai-backend` (Node web service, root `backend/`)
   - `jobpilot-ai-frontend` (static site serving `frontend/`)
3. On the backend service, add the environment variables from `backend/.env.example` that you have (see below — all are optional, the app degrades gracefully without them).
4. Once deployed, open the frontend's Render URL, click **Connect backend** in the sidebar, and paste the backend service's URL.

Render's free tier spins down after inactivity — the first request after idle will be slow (cold start), which is normal.

## Making each module "real"

| Feature | Without a key | With a key |
|---|---|---|
| Job search | Bundled sample jobs | Live results via **Adzuna** (free, instant approval) or **RapidAPI JSearch** (aggregates LinkedIn/Indeed/Glassdoor legally) |
| AI matching, resume rewriting, cover letters, assistant | Keyword-overlap scoring + clean templates (fully functional, just not generative) | Gemini-generated (`GEMINI_API_KEY`) — genuinely free tier, no credit card |
| Sending applications | N/A — send is disabled | Real Gmail send via OAuth (`GOOGLE_CLIENT_ID`/`SECRET`) |

Get keys:
- Adzuna: https://developer.adzuna.com/ (free)
- JSearch (RapidAPI): https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- Gemini: https://aistudio.google.com/apikey (free tier, no billing setup required)
- Google OAuth (Gmail): https://console.cloud.google.com/ → APIs & Services → Credentials → OAuth Client ID (type: Web application) → enable the **Gmail API** → add `GOOGLE_REDIRECT_URI` as an authorized redirect URI.

## Important limitations, stated plainly

- **No scraping of LinkedIn/Indeed/Glassdoor.** Scraping those sites directly breaks their Terms of Service and gets IPs blocked fast — that's not a reliable foundation for a project you want to keep working. The backend uses their *official* channels instead: Adzuna and JSearch are licensed aggregators that legally re-serve listings from those sources (and many more boards). This is the standard approach real job-search products use.
- **Gmail sending requires your own Google Cloud OAuth app** — I can't provision that on your behalf. The `/api/auth/google` flow is fully implemented; you just need to create the credentials (takes ~5 minutes) and add them as env vars.
- **AI features need your own free Gemini API key** for the same reason — I can't embed a working key in code you'll redistribute. Get one in about a minute at aistudio.google.com/apikey (genuinely free tier, no credit card). Everything is wired to work the instant you add it.
- **The "PDF generation" is a plain, clean single-column export** (via `pdf-lib`), not a designed template — swap in a template library if you want a styled resume PDF.
- **Data storage is a JSON file** (`backend/data/db.json`) for the tracker, which is fine for a portfolio project but will reset on some hosts' redeploys. Swap in Postgres/Mongo for anything persistent (Render's free Postgres works well here).

## Project structure

```
jobpilot-ai/
├── render.yaml                  # one-click Render deploy for both services
├── frontend/
│   └── jobpilot-demo.html       # the whole UI — open directly, or deploy as a static site
└── backend/
    ├── server.js
    ├── .env.example
    ├── routes/
    │   ├── jobs.js               # GET  /api/jobs        — live search (Adzuna/JSearch) or mock
    │   ├── match.js              # POST /api/match        — resume ↔ job scoring
    │   ├── resume.js             # POST /api/resume/parse | /optimize | /pdf
    │   ├── apply.js              # POST /api/apply/generate — email + cover letter
    │   ├── auth.js               # GET  /api/auth/google[/callback], POST /api/auth/gmail/send
    │   ├── tracker.js            # GET/POST/PATCH /api/tracker
    │   ├── analytics.js          # GET  /api/analytics
    │   └── assistant.js          # POST /api/assistant     — "Ask JobPilot"
    ├── lib/gemini.js
    └── data/{store.js, mockJobs.json}
```

## Why this is a strong portfolio project

It's not a single-screen UI mock — it chains together several genuinely hard pieces end to end: an external API integration, LLM-based scoring and generation with graceful degradation when no key is present, file parsing (PDF/DOCX), programmatic PDF generation, OAuth2, and a small persistence + analytics layer. That combination (not any one piece alone) is what makes it read as full-stack work rather than a template.
