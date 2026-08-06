import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../server/app";

// Catch-all so every /api/* request lands here with its original URL intact —
// Express does the actual routing. The app is built once per warm container.
let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (!appPromise) {
    appPromise = createApp();
  }

  try {
    const app = await appPromise;
    app(req as any, res as any);
  } catch (err) {
    // A failed init (e.g. bad DATABASE_URL) must not poison every later request
    appPromise = null;
    console.error("Failed to initialise app:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Internal Server Error" }));
  }
}
