const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { generateText } = require("../lib/gemini");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// POST /api/resume/parse  (multipart/form-data, field: "resume")
// Extracts raw text from an uploaded .pdf or .docx so the frontend can send it
// to /api/match and /api/resume/optimize.
router.post("/parse", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded (field name must be 'resume')." });
    const { buffer, originalname } = req.file;
    let text = "";
    if (originalname.toLowerCase().endsWith(".pdf")) {
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else if (originalname.toLowerCase().endsWith(".docx")) {
      const parsed = await mammoth.extractRawText({ buffer });
      text = parsed.value;
    } else {
      return res.status(400).json({ error: "Only .pdf and .docx are supported." });
    }
    res.json({ text, wordCount: text.split(/\s+/).filter(Boolean).length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to parse resume." });
  }
});

// POST /api/resume/optimize  { resumeText, jobDescription, missingSkills }
// Rewrites resume bullets with Claude if ANTHROPIC_API_KEY is set; otherwise
// returns a clear message so the frontend can show the "connect an AI key" state.
router.post("/optimize", async (req, res) => {
  const { resumeText = "", jobDescription = "", missingSkills = [] } = req.body;

  try {
    const optimized = await generateText(
      `Rewrite the following resume to better match the job description below. Keep it truthful — only rephrase and quantify existing experience, never invent employers, dates, or skills the person doesn't have. Naturally work in these missing keywords ONLY where genuinely applicable: ${missingSkills.join(", ")}. Return only the rewritten resume text, no preamble.\n\nRESUME:\n${resumeText.slice(0, 6000)}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 3000)}`
    );

    if (optimized === null) {
      return res.json({
        optimized: resumeText,
        note: "Set GEMINI_API_KEY on the server to enable AI resume rewriting (free tier available at aistudio.google.com/apikey). Returning original text unchanged.",
      });
    }
    res.json({ optimized });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI optimization failed." });
  }
});

// POST /api/resume/pdf  { text, fileName }
// Generates a simple, clean single-column PDF from resume text so the user
// has a downloadable "optimized" resume without needing a design template.
router.post("/pdf", async (req, res) => {
  try {
    const { text = "", fileName = "resume.pdf" } = req.body;
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontSize = 11;
    const margin = 50;
    let page = doc.addPage([612, 792]);
    let y = 792 - margin;

    const lines = text.split("\n");
    for (const rawLine of lines) {
      const words = rawLine.split(" ");
      let line = "";
      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (font.widthOfTextAtSize(test, fontSize) > 612 - margin * 2) {
          page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.12) });
          y -= fontSize + 4;
          line = word;
        } else {
          line = test;
        }
        if (y < margin) { page = doc.addPage([612, 792]); y = 792 - margin; }
      }
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.12) });
      y -= fontSize + 4;
      if (y < margin) { page = doc.addPage([612, 792]); y = 792 - margin; }
    }

    const bytes = await doc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(Buffer.from(bytes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF generation failed." });
  }
});

module.exports = router;
