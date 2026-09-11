const express = require("express");
const { google } = require("googleapis");
const router = express.Router();

// In-memory token store keyed by a session id passed as ?uid=. Swap for a
// real session/DB layer in production — this is a scaffold, not auth hardening.
const tokenStore = {};

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// GET /api/auth/google?uid=some-user-id
// Redirects the browser to Google's consent screen.
router.get("/google", (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(400).json({ error: "GOOGLE_CLIENT_ID not set. Create OAuth credentials in Google Cloud Console first." });
  }
  const oauth2Client = getOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.compose", "https://www.googleapis.com/auth/userinfo.email"],
    state: req.query.uid || "demo-user",
    prompt: "consent",
  });
  res.redirect(url);
});

// GET /api/auth/google/callback  — Google redirects here after consent.
router.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    tokenStore[state || "demo-user"] = tokens;
    res.redirect(`${process.env.FRONTEND_URL || "/"}?gmail=connected`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Gmail connection failed.");
  }
});

// POST /api/auth/gmail/send  { uid, to, subject, body }
// Creates and sends a Gmail draft/message on the authenticated user's behalf.
// The frontend should always show a human approval step before calling this.
router.post("/gmail/send", async (req, res) => {
  const { uid = "demo-user", to, subject, body } = req.body;
  const tokens = tokenStore[uid];
  if (!tokens) return res.status(401).json({ error: "Gmail not connected for this user. Call /api/auth/google first." });

  try {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const raw = Buffer.from(
      `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
    ).toString("base64url");

    const result = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    res.json({ ok: true, id: result.data.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send via Gmail." });
  }
});

module.exports = router;
