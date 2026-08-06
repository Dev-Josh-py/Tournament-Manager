# Deploying to Vercel

The app runs on Vercel's free Hobby plan: the React SPA is served from the CDN,
the Express API runs as a serverless function, and the database stays on Neon.

## How it's wired

| Piece | Where it lives | Notes |
| --- | --- | --- |
| SPA | `dist/public`, built by `npm run build:client` | Served statically by Vercel's CDN |
| API | `api/[...path].ts` → `server/app.ts` | One serverless function handles all `/api/*` |
| Routing | `vercel.json` | Anything that isn't a real file and isn't `/api/*` falls back to `index.html` |
| Database | Neon Postgres | Unchanged — use the **pooled** connection string |

`server/index.ts` (the long-running Node server) still exists and is what
`npm run dev` and `npm start` use. Both entry points share `server/app.ts`, so
local development is identical to before.

## One-time setup

1. **Push the code**

   ```sh
   git add -A
   git commit -m "Add Vercel serverless deployment"
   git push origin main
   ```

2. **Create the Vercel project**

   - Go to <https://vercel.com/new> and sign in with GitHub.
   - Import `Dev-Josh-py/Tournament-Manager`.
   - Framework Preset: **Other**. Leave build settings alone — `vercel.json`
     already sets the build command (`npm run build:client`) and output
     directory (`dist/public`).
   - **Do not click Deploy yet** — add the environment variable first (step 3).
     If you already deployed, add it and redeploy.

3. **Add the database URL**

   - In the import screen, expand **Environment Variables** (or later:
     Project → Settings → Environment Variables).
   - Name: `DATABASE_URL`
   - Value: the pooled Neon connection string from your local `.env` — the one
     containing `-pooler` in the hostname. Pooled matters: serverless creates
     many short-lived connections and the pooler is what absorbs them.
   - Apply to **Production, Preview and Development**.

4. **Deploy.** First build takes ~2 minutes.

## Verifying the deployment

Replace `<your-app>` with the deployed domain:

```sh
# API responds and auth works
curl -s -X POST https://<your-app>.vercel.app/api/auth/login \
  -H 'Content-Type: application/json' -d '{"passcode":"Tour2026"}'
# → {"success":true,"token":"Tour2026"}

# Data comes back from Neon
curl -s https://<your-app>.vercel.app/api/teams \
  -H 'Authorization: Bearer Tour2026'

# Wrong passcode is rejected
curl -s -o /dev/null -w '%{http_code}\n' https://<your-app>.vercel.app/api/teams
# → 401

# Deep links hit the SPA, not a 404
curl -s -o /dev/null -w '%{http_code}\n' https://<your-app>.vercel.app/leaderboard
# → 200
```

Then open the site, enter the passcode, and check a leaderboard renders with
scores.

## Ongoing use

- Every push to `main` redeploys production automatically.
- Every other branch/PR gets its own preview URL, pointed at the **same** Neon
  database — so treat preview deploys as live-data environments.
- Function logs: Vercel dashboard → project → **Logs**.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| API returns 500, logs show `ECONNREFUSED 127.0.0.1:5432` | `DATABASE_URL` missing or not applied to that environment |
| API works, page routes 404 | `vercel.json` not committed |
| Build fails on `@shared/...` import | A server file reintroduced a path alias; Vercel's function builder can't resolve tsconfig `paths`. Use a relative import (`../shared/...`) in anything under `server/` or `api/` |
| Blank page, console 404s on assets | Output directory drifted from `dist/public` |

## Known limitations

- The serverless filesystem is read-only apart from `/tmp`, and nothing
  persists between requests. All state must live in Neon.
- `registerRoutes` runs `seedDatabase()` on cold start; it returns immediately
  once teams exist, so it costs one query per cold container.
- Vercel Hobby is for non-commercial use.
