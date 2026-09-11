// Minimal JSON-file datastore. Swap for Postgres/Mongo in production —
// this exists so the scaffold runs on Render with zero external DB setup.
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "db.json");

function read() {
  if (!fs.existsSync(FILE)) {
    const initial = {
      tracker: {
        Saved: [], Analyzed: [], Tailored: [], Ready: [],
        Applied: [], Interview: [], Rejected: [], Offer: [],
      },
      savedJobs: [],
      users: {},
    };
    fs.writeFileSync(FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(FILE, "utf-8"));
}

function write(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

module.exports = { read, write };
