const express = require("express");
const router = express.Router();
const { generateText } = require("../lib/gemini");

const SKILLS = ["React","TypeScript","JavaScript","Node.js","Python","Java","AWS","GCP","Azure",
  "Docker","Kubernetes","GraphQL","REST","SQL","NoSQL","System Design","CI/CD","Figma",
  "Product Sense","Leadership","Communication","Go","Rust","Swift","Kotlin","Django","Flask"];

function extractSkills(text = "") {
  const lower = text.toLowerCase();
  return SKILLS.filter(s => lower.includes(s.toLowerCase()));
}

// POST /api/match  { resumeText, jobDescription }
// Returns a match score plus have/missing skills. Uses Claude for a richer
// explanation when ANTHROPIC_API_KEY is set; otherwise a transparent
// keyword-overlap heuristic (no API key required, still fully functional).
router.post("/", async (req, res) => {
  const { resumeText = "", jobDescription = "" } = req.body;

  const resumeSkills = extractSkills(resumeText);
  const jobSkills = extractSkills(jobDescription);
  const have = jobSkills.filter(s => resumeSkills.includes(s));
  const miss = jobSkills.filter(s => !resumeSkills.includes(s));
  const baseScore = jobSkills.length ? Math.round((have.length / jobSkills.length) * 100) : 50;

  let explanation = `${have.length}/${jobSkills.length} required skills found in your resume.`;

  try {
    const aiText = await generateText(
      `Resume:\n${resumeText.slice(0, 3000)}\n\nJob description:\n${jobDescription.slice(0, 3000)}\n\nIn 2-3 sentences, explain how well this resume matches the job, referencing specific overlaps and gaps. Be concrete and concise.`
    );
    if (aiText) explanation = aiText;
  } catch (err) {
    console.error("Gemini match explanation failed:", err.message);
  }

  res.json({ score: baseScore, have, miss, explanation });
});

module.exports = router;
