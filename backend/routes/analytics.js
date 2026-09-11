const express = require("express");
const router = express.Router();
const { read } = require("../data/store");

// GET /api/analytics — simple derived stats from the tracker.
// This is intentionally lightweight (counts + rates); swap in a real
// time-series store if you want week-over-week trend charts in production.
router.get("/", (req, res) => {
  const { tracker } = read();
  const total = Object.values(tracker).reduce((a, arr) => a + arr.length, 0);
  const applied = tracker.Applied.length + tracker.Interview.length + tracker.Rejected.length + tracker.Offer.length;
  const interviews = tracker.Interview.length + tracker.Offer.length;
  const rejected = tracker.Rejected.length;

  res.json({
    totalTracked: total,
    applied,
    responseRate: applied ? Math.round(((interviews + rejected) / applied) * 100) : 0,
    interviewRate: applied ? Math.round((interviews / applied) * 100) : 0,
    byStage: Object.fromEntries(Object.entries(tracker).map(([k, v]) => [k, v.length])),
  });
});

module.exports = router;
