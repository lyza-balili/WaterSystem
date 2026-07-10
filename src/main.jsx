import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import { getGoogleClientId } from "./auth/googleAuth.js";
import "./index.css";

const clientId = getGoogleClientId();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId || "missing-client-id"}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
