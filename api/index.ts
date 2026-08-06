import type { IncomingMessage, ServerResponse } from "http";

// Single serverless function backing every /api/* route.
//
// vercel.json rewrites /api/<anything> here and carries the original path in
// the __path query param, which we restore onto req.url before handing over to
// Express. Relying on Vercel's filesystem routing instead (api/[...path].ts)
// only matched a single path segment, so /api/auth/login 404'd.
let appPromise: Promise<any> | null = null;

// Imported lazily so a module-load failure surfaces as a readable JSON error
// rather than an opaque FUNCTION_INVOCATION_FAILED from the platform.
async function getApp() {
  const { createApp } = await import("../server/app");
  return createApp();
}

function restoreOriginalUrl(req: IncomingMessage) {
  const url = new URL(req.url ?? "/", "http://vercel.internal");
  const path = url.searchParams.get("__path");
  if (path === null) return;

  url.searchParams.delete("__path");
  const query = url.searchParams.toString();
  req.url = `/api/${path}${query ? `?${query}` : ""}`;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    restoreOriginalUrl(req);

    if (!appPromise) {
      appPromise = getApp();
    }
    const app = await appPromise;
    app(req, res);
  } catch (err) {
    // A failed init (bad DATABASE_URL, import error) must not poison every
    // later request served by this warm container.
    appPromise = null;
    console.error("Failed to handle request:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message: "Internal Server Error",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
