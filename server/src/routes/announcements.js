const express = require("express");
const { db } = require("../db/database");
const { authMiddleware } = require("../utils/auth");
const { recordAudit } = require("../utils/audit");

const router = express.Router();

const VALID_TYPES = ["info", "success", "warn"];

function normalize(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    tag: row.tag,
    content: row.content,
    date: row.published_date,
    updatedAt: row.updated_at,
  };
}

// GET /api/announcements — public; residents and admins both read this.
router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM announcements ORDER BY published_date DESC, id DESC")
    .all();
  res.json(rows.map(normalize));
});

// POST /api/announcements — officers only.
router.post("/", authMiddleware("admin", ["officer"]), (req, res) => {
  const { type = "info", title, tag, content, date } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }
  const safeType = VALID_TYPES.includes(type) ? type : "info";
  const publishedDate = date || new Date().toISOString().slice(0, 10);
  const info = db
    .prepare(
      "INSERT INTO announcements (type, title, tag, content, published_date) VALUES (?, ?, ?, ?, ?)"
    )
    .run(safeType, String(title).trim(), tag ? String(tag).trim() : null, String(content).trim(), publishedDate);
  const row = db.prepare("SELECT * FROM announcements WHERE id = ?").get(info.lastInsertRowid);
  recordAudit(req, "announcement.create", row.id, `Posted announcement: "${row.title}"`);
  res.status(201).json(normalize(row));
});

// PUT /api/announcements/:id — officers only.
router.put("/:id", authMiddleware("admin", ["officer"]), (req, res) => {
  const existing = db.prepare("SELECT * FROM announcements WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Announcement not found." });
  }
  const { type = existing.type, title = existing.title, tag, content = existing.content, date = existing.published_date } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }
  const safeType = VALID_TYPES.includes(type) ? type : existing.type;
  db.prepare(
    "UPDATE announcements SET type = ?, title = ?, tag = ?, content = ?, published_date = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(
    safeType,
    String(title).trim(),
    tag === undefined ? existing.tag : (tag ? String(tag).trim() : null),
    String(content).trim(),
    date,
    req.params.id
  );
  const row = db.prepare("SELECT * FROM announcements WHERE id = ?").get(req.params.id);
  recordAudit(req, "announcement.update", row.id, `Edited announcement: "${row.title}"`);
  res.json(normalize(row));
});

// DELETE /api/announcements/:id — officers only.
router.delete("/:id", authMiddleware("admin", ["officer"]), (req, res) => {
  const existing = db.prepare("SELECT * FROM announcements WHERE id = ?").get(req.params.id);
  const info = db.prepare("DELETE FROM announcements WHERE id = ?").run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "Announcement not found." });
  }
  recordAudit(req, "announcement.delete", req.params.id, `Deleted announcement: "${existing ? existing.title : req.params.id}"`);
  res.json({ success: true });
});

module.exports = router;
