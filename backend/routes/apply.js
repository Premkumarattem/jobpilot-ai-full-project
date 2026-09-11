const express = require("express");
const router = express.Router();
const { generateText } = require("../lib/gemini");

// POST /api/apply/generate  { job: {title, company, description}, resumeText, missingSkills }
// Generates a personalized email + cover letter. Falls back to a clean
// template (no API key required) so the flow still works without Gemini.
router.post("/generate", async (req, res) => {
  const { job = {}, resumeText = "", missingSkills = [] } = req.body;

  try {
    const prompt = `Write a short, warm, specific job application EMAIL and a separate COVER LETTER for this candidate applying to ${job.title} at ${job.company}.
Use the candidate's real resume content below — do not invent employers or skills. Where natural, acknowledge these skill gaps as "currently building": ${missingSkills.join(", ") || "none"}.
Return strict JSON: {"email": "...", "cover": "..."} with no extra text, no markdown fences.

JOB DESCRIPTION:
${(job.description || "").slice(0, 2500)}

RESUME:
${resumeText.slice(0, 4000)}`;

    const raw = await generateText(prompt);

    if (raw === null) {
      const email = `Subject: Application for ${job.title} at ${job.company}\n\nHi ${job.company} team,\n\nI'm excited to apply for the ${job.title} role. My background aligns well with what you're looking for, and I've attached my resume and cover letter for more detail.\n\nBest,\n[Your name]`;
      const cover = `Dear Hiring Team at ${job.company},\n\nI'm writing to apply for the ${job.title} position. [Add 2-3 sentences connecting your experience to this role.]\n\nSincerely,\n[Your name]`;
      return res.json({ email, cover, note: "Set GEMINI_API_KEY for personalized AI-generated copy (free tier available at aistudio.google.com/apikey). Returning a template." });
    }

    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (err) {
    console.error("Apply generation failed:", err.message);
    res.status(500).json({ error: "Generation failed. Check GEMINI_API_KEY and server logs." });
  }
});

module.exports = router;
