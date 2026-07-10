const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { db } = require("../db/database");
const { signToken, authMiddleware } = require("../utils/auth");
const { verifyGoogleToken } = require("../utils/google");

const router = express.Router();

const RESET_CODE_TTL_MS = 15 * 60 * 1000;

function isStrongPassword(value) {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

function hashResetCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

// POST /api/resident/login
// Body: { householdId, password, confirmPassword }
// First login for a household (no password_hash set yet) creates the
// password; returning residents authenticate against the stored hash.
router.post("/login", (req, res) => {
  const { householdId, password, confirmPassword, email, username } = req.body || {};

  if (!householdId || !password) {
    return res.json({ success: false, message: "Control number and password are required." });
  }

  const household = db.prepare("SELECT id FROM households WHERE id = ?").get(householdId);
  if (!household) {
    return res.json({ success: false, message: "We couldn't find an account with that control number." });
  }

  const account = db
    .prepare("SELECT * FROM resident_accounts WHERE household_id = ?")
    .get(householdId);
  const isNewPassword = !account || !account.password_hash;

  if (isNewPassword) {
    if (!isStrongPassword(password)) {
      return res.json({
        success: false,
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.",
      });
    }
    if (password !== confirmPassword) {
      return res.json({ success: false, message: "Passwords do not match." });
    }

    // Optional email / preferred username captured at sign-up.
    const cleanEmail = typeof email === "string" ? email.trim() : "";
    const cleanUsername = typeof username === "string" ? username.trim() : "";
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.json({ success: false, message: "Please enter a valid email address." });
    }
    if (cleanUsername) {
      const taken = db
        .prepare("SELECT household_id FROM resident_accounts WHERE username = ? AND household_id != ?")
        .get(cleanUsername, householdId);
      if (taken) {
        return res.json({ success: false, message: "That username is already taken. Please choose another." });
      }
    }

    const hash = bcrypt.hashSync(password, 10);
    if (account) {
      db.prepare(
        "UPDATE resident_accounts SET password_hash = ?, username = COALESCE(NULLIF(?, ''), username), updated_at = datetime('now') WHERE household_id = ?"
      ).run(hash, cleanUsername, householdId);
    } else {
      db.prepare(
        "INSERT INTO resident_accounts (household_id, password_hash, username) VALUES (?, ?, NULLIF(?, ''))"
      ).run(householdId, hash, cleanUsername);
    }
    if (cleanEmail) {
      db.prepare("UPDATE households SET email = ? WHERE id = ?").run(cleanEmail, householdId);
    }
  } else {
    const matches = bcrypt.compareSync(password, account.password_hash);
    if (!matches) {
      return res.json({ success: false, message: "Incorrect password." });
    }
  }

  const token = signToken({ role: "resident", householdId });
  return res.json({ success: true, token, householdId });
});

// POST /api/resident/google-login
// Body: { householdId, credential }
// Verifies the Google ID token, then either links it to the household
// (first time) or signs in a household already linked to that Google account.
router.post("/google-login", async (req, res) => {
  const { householdId, credential } = req.body || {};

  if (!householdId) {
    return res.json({ success: false, message: "Select your household / standpost first." });
  }

  const household = db.prepare("SELECT id FROM households WHERE id = ?").get(householdId);
  if (!household) {
    return res.json({ success: false, message: "Unknown household / standpost." });
  }

  let profile;
  try {
    profile = await verifyGoogleToken(credential);
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }

  const linkedElsewhere = db
    .prepare("SELECT household_id FROM resident_accounts WHERE google_sub = ? AND household_id != ?")
    .get(profile.sub, householdId);
  if (linkedElsewhere) {
    return res.json({
      success: false,
      message: "This Google account is already linked to a different household.",
    });
  }

  const account = db
    .prepare("SELECT household_id FROM resident_accounts WHERE household_id = ?")
    .get(householdId);

  if (account) {
    db.prepare(
      `UPDATE resident_accounts
       SET google_sub = ?, google_email = ?, google_name = ?, google_picture = ?, updated_at = datetime('now')
       WHERE household_id = ?`
    ).run(profile.sub, profile.email, profile.name, profile.picture, householdId);
  } else {
    db.prepare(
      `INSERT INTO resident_accounts (household_id, google_sub, google_email, google_name, google_picture)
       VALUES (?, ?, ?, ?, ?)`
    ).run(householdId, profile.sub, profile.email, profile.name, profile.picture);
  }

  const token = signToken({ role: "resident", householdId });
  return res.json({ success: true, token, householdId, googleProfile: profile });
});

// GET /api/resident/google-status?householdId=HH-001
router.get("/google-status", (req, res) => {
  const { householdId } = req.query;
  if (!householdId) return res.status(400).json({ error: "householdId query param is required." });

  const account = db
    .prepare("SELECT google_email FROM resident_accounts WHERE household_id = ?")
    .get(householdId);

  res.json({ linked: Boolean(account && account.google_email), email: account ? account.google_email : null });
});

// POST /api/resident/google-unlink
// Requires a resident-scoped token; unlinks the caller's own household only.
router.post("/google-unlink", authMiddleware("resident"), (req, res) => {
  db.prepare(
    `UPDATE resident_accounts
     SET google_sub = NULL, google_email = NULL, google_name = NULL, google_picture = NULL, updated_at = datetime('now')
     WHERE household_id = ?`
  ).run(req.user.householdId);

  res.json({ success: true });
});

// POST /api/resident/forgot-password
// Body: { householdId }
// No email/SMS service is configured for this deployment, so the reset code
// is returned directly for the frontend to display (same pattern used for
// the admin forgot-password flow and the GCash mock payment).
router.post("/forgot-password", (req, res) => {
  const { householdId } = req.body || {};
  if (!householdId) {
    return res.json({ success: false, message: "Select your household / standpost first." });
  }

  const household = db.prepare("SELECT id FROM households WHERE id = ?").get(householdId);
  if (!household) {
    return res.json({ success: false, message: "Unknown household / standpost." });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS).toISOString();
  const codeHash = hashResetCode(code);

  const account = db
    .prepare("SELECT household_id FROM resident_accounts WHERE household_id = ?")
    .get(householdId);
  if (account) {
    db.prepare(
      "UPDATE resident_accounts SET reset_code_hash = ?, reset_code_expires = ? WHERE household_id = ?"
    ).run(codeHash, expiresAt, householdId);
  } else {
    db.prepare(
      "INSERT INTO resident_accounts (household_id, reset_code_hash, reset_code_expires) VALUES (?, ?, ?)"
    ).run(householdId, codeHash, expiresAt);
  }

  return res.json({ success: true, resetCode: code, expiresInMinutes: RESET_CODE_TTL_MS / 60000 });
});

// POST /api/resident/reset-password
// Body: { householdId, code, newPassword, confirmPassword }
router.post("/reset-password", (req, res) => {
  const { householdId, code, newPassword, confirmPassword } = req.body || {};
  if (!householdId || !code || !newPassword) {
    return res.json({ success: false, message: "Household, code, and new password are required." });
  }
  if (!isStrongPassword(newPassword)) {
    return res.json({
      success: false,
      message:
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.",
    });
  }
  if (newPassword !== confirmPassword) {
    return res.json({ success: false, message: "Passwords do not match." });
  }

  const account = db
    .prepare("SELECT * FROM resident_accounts WHERE household_id = ?")
    .get(householdId);
  if (!account || !account.reset_code_hash || !account.reset_code_expires) {
    return res.json({ success: false, message: "No reset request found for this household. Request a new code." });
  }
  if (new Date(account.reset_code_expires).getTime() < Date.now()) {
    return res.json({ success: false, message: "This reset code has expired. Request a new one." });
  }
  if (hashResetCode(code) !== account.reset_code_hash) {
    return res.json({ success: false, message: "Incorrect reset code." });
  }

  db.prepare(
    `UPDATE resident_accounts
     SET password_hash = ?, reset_code_hash = NULL, reset_code_expires = NULL, updated_at = datetime('now')
     WHERE household_id = ?`
  ).run(bcrypt.hashSync(newPassword, 10), householdId);

  return res.json({ success: true });
});

module.exports = router;
