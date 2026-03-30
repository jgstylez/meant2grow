import * as fs from "fs";

const DEBUG_LOG_PATH = "/Users/jgstylez/dev/meant2grow/.cursor/debug-47f738.log";
const DEBUG_INGEST = "http://127.0.0.1:7243/ingest/ddbd7d9b-fa55-49dd-a6eb-074ba22eeba5";

/** Session debug NDJSON — no secrets/PII. Works when Functions run on this machine (emulator). */
export function agentDebugLog(entry: {
  location: string;
  message: string;
  hypothesisId: string;
  data: Record<string, unknown>;
  runId?: string;
}): void {
  const payload = {
    sessionId: "47f738",
    timestamp: Date.now(),
    ...entry,
  };
  const line = `${JSON.stringify(payload)}\n`;
  try {
    fs.appendFileSync(DEBUG_LOG_PATH, line);
  } catch {
    // Expected on deployed GCP (path missing); emulator on dev machine writes file.
  }
  void fetch(DEBUG_INGEST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "47f738",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
