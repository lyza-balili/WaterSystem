const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not set. Add it to server/.env before starting the server (see server/.env.example)."
  );
}
const TOKEN_EXPIRY = "7d";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function authMiddleware(requiredRole) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Missing authorization token." });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }
    if (requiredRole && payload.role !== requiredRole) {
      return res.status(403).json({ error: "You do not have access to this resource." });
    }
    req.user = payload;
    next();
  };
}

module.exports = { signToken, verifyToken, authMiddleware };