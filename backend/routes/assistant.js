const express = require("express");
const router = express.Router();
const { generateText } = require("../lib/gemini");

// POST /api/assistant  { question, context: { jobs, resumeSummary, trackerSummary } }
// Powers the "Ask JobPilot" floating assistant with real context about the
// user's jobs/resume/tracker so answers are grounded, not generic.
router.post("/", async (req, res) => {
  const { question = "", context = {} } = req.body;

  try {
    const answer = await generateText(
      `Context: ${JSON.stringify(context).slice(0, 4000)}\n\nQuestion: ${question}`,
      "You are JobPilot, a concise, encouraging job-search copilot embedded in a job application app. Answer using only the context provided. Keep answers under 4 sentences."
    );

    if (answer === null) {
      return res.json({
        answer: "Connect GEMINI_API_KEY on the server to enable the live AI assistant (free tier available at aistudio.google.com/apikey). In demo mode this endpoint just echoes your question.",
        question,
      });
    }
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Assistant failed to respond." });
  }
});

module.exports = router;
