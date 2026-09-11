require("dotenv").config();
const express = require("express");
const cors = require("cors");

const jobsRouter = require("./routes/jobs");
const matchRouter = require("./routes/match");
const resumeRouter = require("./routes/resume");
const applyRouter = require("./routes/apply");
const authRouter = require("./routes/auth");
const trackerRouter = require("./routes/tracker");
const analyticsRouter = require("./routes/analytics");
const assistantRouter = require("./routes/assistant");

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    liveJobSearch: Boolean(process.env.ADZUNA_APP_ID || process.env.RAPIDAPI_KEY),
    ai: Boolean(process.env.GEMINI_API_KEY),
    gmail: Boolean(process.env.GOOGLE_CLIENT_ID),
  });
});

app.use("/api/jobs", jobsRouter);
app.use("/api/match", matchRouter);
app.use("/api/resume", resumeRouter);
app.use("/api/apply", applyRouter);
app.use("/api/auth", authRouter);
app.use("/api/tracker", trackerRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/assistant", assistantRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`JobPilot AI backend listening on :${PORT}`));
