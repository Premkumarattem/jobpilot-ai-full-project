const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

const MOCK_JOBS = require("../data/mockJobs.json");

// GET /api/jobs?query=frontend+engineer&location=remote
// Live mode: Adzuna (free, https://developer.adzuna.com) if ADZUNA_APP_ID/KEY set,
// otherwise RapidAPI "JSearch" (aggregates LinkedIn/Indeed/Glassdoor legally) if RAPIDAPI_KEY set,
// otherwise falls back to bundled mock data so the app still works with zero setup.
//
// NOTE: we deliberately do NOT scrape LinkedIn/Indeed/Glassdoor HTML directly —
// that violates their Terms of Service and gets IPs blocked. Use their official
// APIs / licensed aggregators instead (Adzuna, JSearch, USAJobs, Greenhouse job boards API, etc).
router.get("/", async (req, res) => {
  const { query = "software engineer", location = "remote" } = req.query;

  try {
    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=20&what=${encodeURIComponent(query)}&where=${encodeURIComponent(location)}`;
      const r = await fetch(url);
      const data = await r.json();
      const jobs = (data.results || []).map(normalizeAdzuna);
      return res.json({ source: "adzuna", jobs });
    }

    if (process.env.RAPIDAPI_KEY) {
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query + " " + location)}&num_pages=1`;
      const r = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });
      const data = await r.json();
      const jobs = (data.data || []).map(normalizeJSearch);
      return res.json({ source: "jsearch", jobs });
    }

    // Demo fallback
    return res.json({ source: "mock", jobs: MOCK_JOBS });
  } catch (err) {
    console.error("Job search failed:", err.message);
    return res.json({ source: "mock-fallback", jobs: MOCK_JOBS, warning: err.message });
  }
});

function normalizeAdzuna(j) {
  return {
    id: j.id,
    title: j.title,
    company: j.company?.display_name || "Unknown",
    location: j.location?.display_name || "",
    salary: j.salary_min ? `$${Math.round(j.salary_min / 1000)}k–$${Math.round(j.salary_max / 1000)}k` : "Not listed",
    description: (j.description || "").slice(0, 4000),
    url: j.redirect_url,
    source: "Adzuna",
    posted: j.created,
  };
}

function normalizeJSearch(j) {
  return {
    id: j.job_id,
    title: j.job_title,
    company: j.employer_name,
    location: j.job_city ? `${j.job_city}, ${j.job_state || j.job_country}` : "Remote",
    salary: j.job_min_salary ? `$${Math.round(j.job_min_salary / 1000)}k–$${Math.round(j.job_max_salary / 1000)}k` : "Not listed",
    description: (j.job_description || "").slice(0, 4000),
    url: j.job_apply_link,
    source: j.job_publisher || "JSearch",
    posted: j.job_posted_at_datetime_utc,
  };
}

module.exports = router;
