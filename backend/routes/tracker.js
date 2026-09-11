const express = require("express");
const router = express.Router();
const { read, write } = require("../data/store");

const STAGES = ["Saved","Analyzed","Tailored","Ready","Applied","Interview","Rejected","Offer"];

// GET /api/tracker — full board
router.get("/", (req, res) => {
  const db = read();
  res.json(db.tracker);
});

// POST /api/tracker  { stage, item: {id, title, company} } — add to a stage
router.post("/", (req, res) => {
  const { stage, item } = req.body;
  if (!STAGES.includes(stage)) return res.status(400).json({ error: `stage must be one of ${STAGES.join(", ")}` });
  const db = read();
  db.tracker[stage].push(item);
  write(db);
  res.json(db.tracker);
});

// PATCH /api/tracker/move  { fromStage, toStage, id }
router.patch("/move", (req, res) => {
  const { fromStage, toStage, id } = req.body;
  if (!STAGES.includes(fromStage) || !STAGES.includes(toStage)) {
    return res.status(400).json({ error: `stages must be one of ${STAGES.join(", ")}` });
  }
  const db = read();
  const item = db.tracker[fromStage].find(i => i.id === id);
  if (!item) return res.status(404).json({ error: "item not found in fromStage" });
  db.tracker[fromStage] = db.tracker[fromStage].filter(i => i.id !== id);
  db.tracker[toStage].push(item);
  write(db);
  res.json(db.tracker);
});

module.exports = router;
