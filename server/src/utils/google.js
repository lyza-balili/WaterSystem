const { OAuth2Client } = require("google-auth-library");

// Set this to the OAuth Client ID from Google Cloud Console (see SETUP.md).
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

/**
 * Verifies a Google ID token (the credential string returned by Google's
 * Sign-In button on the frontend) and returns the verified profile, or
 * throws if verification fails.
 */
async function verifyGoogleToken(idToken) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      "GOOGLE_CLIENT_ID is not configured on the server. See server/SETUP.md."
    );
  }
  if (!idToken) {
    throw new Error("No Google credential was provided.");
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Google did not return a verified email.");
  }
  if (!payload.email_verified) {
    throw new Error("This Google account's email is not verified.");
  }

  return {
    sub: payload.sub, // stable Google user id
    email: payload.email,
    name: payload.name || payload.email,
    picture: payload.picture || null,
  };
}

module.exports = { verifyGoogleToken, GOOGLE_CLIENT_ID };