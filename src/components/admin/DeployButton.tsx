"use client";

import { useState } from "react";

type State = "idle" | "busy" | "done" | "error";

/**
 * Top-right admin action: triggers a Vercel redeploy via Deploy Hook.
 * The hook URL is NEVER committed — set VERCEL_DEPLOY_HOOK_URL in Vercel
 * (Project → Settings → Git → Deploy Hooks) yourself.
 */
export function DeployButton() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  const run = async () => {
    if (state === "busy") return;
    setState("busy");
    setMessage("");
    try {
      const res = await fetch("/api/redeploy", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setState("done");
      setMessage("Redeploy triggered — watch it in Vercel.");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Deploy hook failed.");
    }
  };

  const label =
    state === "busy" ? "Deploying…" : state === "done" ? "Deploy started" : state === "error" ? "Retry deploy" : "Deploy site";

  return (
    <button
      type="button"
      onClick={run}
      disabled={state === "busy"}
      title={message || "Trigger a Vercel redeploy of the live site"}
      style={{
        cursor: state === "busy" ? "wait" : "pointer",
        borderRadius: "6px",
        border: "1px solid currentColor",
        background: "transparent",
        color: "inherit",
        fontSize: "13px",
        fontWeight: 600,
        padding: "6px 12px",
        opacity: state === "busy" ? 0.6 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
