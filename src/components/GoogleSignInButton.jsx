import React, { useEffect, useRef, useState } from "react";

// Renders Google's official "Sign in with Google" button using the
// Google Identity Services script, and calls onCredential(idToken)
// once the person completes sign-in. The parent component is
// responsible for sending that idToken to the backend for verification.
//
// Requires VITE_GOOGLE_CLIENT_ID to be set in the frontend's .env file,
// matching the GOOGLE_CLIENT_ID configured on the backend. See
// server/SETUP.md for how to create this in Google Cloud Console.

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptLoadPromise = null;
function loadGoogleScript() {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In script."));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export function GoogleSignInButton({ onCredential, onError, disabled, text = "signin_with" }) {
  const buttonRef = useRef(null);
  const [scriptError, setScriptError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setScriptError(
        "Google Sign-In is not configured (missing VITE_GOOGLE_CLIENT_ID). See server/SETUP.md."
      );
      return;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response && response.credential) {
              onCredential(response.credential);
            } else {
              onError && onError("Google did not return a credential.");
            }
          },
        });
        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text,
            shape: "pill",
            width: 320,
          });
        }
        setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setScriptError(err.message);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (scriptError) {
    return (
      <div className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        {scriptError}
      </div>
    );
  }

  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <div ref={buttonRef} />
      {!ready && (
        <div className="h-11 w-full rounded-full bg-slate-100 animate-pulse" />
      )}
    </div>
  );
}