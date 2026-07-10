const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { db } = require("../db/database");
const { signToken } = require("../utils/auth");

const router = express.Router();

const RESET_CODE_TTL_MS = 15 * 60 * 1000;

function hashResetCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

// POST /api/admin/login
// Body: { email, password }
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.json({ success: false, message: "Email and password are required." });
  }

  const admin = db
    .prepare("SELECT * FROM admin_accounts WHERE email = ?")
    .get(String(email).toLowerCase());

  if (!admin) {
    return res.json({
      success: false,
      message: "Use an admin email such as admin@barangay.local.",
    });
  }

  const matches = bcrypt.compareSync(password, admin.password_hash);
  if (!matches) {
    return res.json({ success: false, message: "Incorrect password." });
  }

  const token = signToken({ role: "admin", email: admin.email });
  return res.json({ success: true, token, email: admin.email });
});

// POST /api/admin/forgot-password
// Body: { email }
// No email service is configured for this deployment, so the reset code is
// returned directly in the response for the frontend to display — the same
// "simulated delivery" pattern already used for GCash mock payments in this
// app. A real deployment would email this code instead of returning it.
router.post("/forgot-password", (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.json({ success: false, message: "Email is required." });
  }

  const admin = db
    .prepare("SELECT * FROM admin_accounts WHERE email = ?")
    .get(String(email).toLowerCase());
  if (!admin) {
    return res.json({ success: false, message: "No admin account found with that email." });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS).toISOString();

  db.prepare(
    "UPDATE admin_accounts SET reset_code_hash = ?, reset_code_expires = ? WHERE email = ?"
  ).run(hashResetCode(code), expiresAt, admin.email);

  return res.json({ success: true, resetCode: code, expiresInMinutes: RESET_CODE_TTL_MS / 60000 });
});

// POST /api/admin/reset-password
// Body: { email, code, newPassword }
router.post("/reset-password", (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    return res.json({ success: false, message: "Email, code, and new password are required." });
  }
  if (newPassword.length < 8) {
    return res.json({ success: false, message: "Password must be at least 8 characters." });
  }

  const admin = db
    .prepare("SELECT * FROM admin_accounts WHERE email = ?")
    .get(String(email).toLowerCase());
  if (!admin || !admin.reset_code_hash || !admin.reset_code_expires) {
    return res.json({ success: false, message: "No reset request found for this email. Request a new code." });
  }
  if (new Date(admin.reset_code_expires).getTime() < Date.now()) {
    return res.json({ success: false, message: "This reset code has expired. Request a new one." });
  }
  if (hashResetCode(code) !== admin.reset_code_hash) {
    return res.json({ success: false, message: "Incorrect reset code." });
  }

  db.prepare(
    "UPDATE admin_accounts SET password_hash = ?, reset_code_hash = NULL, reset_code_expires = NULL WHERE email = ?"
  ).run(bcrypt.hashSync(newPassword, 10), admin.email);

  return res.json({ success: true });
});

module.exports = router;