# NutriSignal — Deployment Plan

## Deployment Strategy

The app has two parts that need different hosting:

| Component | Hosting         | Why                                      |
|-----------|-----------------|------------------------------------------|
| Frontend  | **Vercel**      | Free tier, instant deploys, global CDN   |
| Backend   | **Vercel** (Serverless) OR **Railway** / **Render** | Express API needs a runtime |
| Database  | **Neon** or **Supabase** (PostgreSQL) | Free-tier managed Postgres     |

---

## Option A: Full Vercel (Recommended for Simplicity)

Deploy both frontend and backend on Vercel.

### Why This Works
- Vercel supports **serverless functions** for the Express backend
- Frontend is a static Vite build served from CDN
- Single platform, single deployment pipeline
- Free tier includes 100GB bandwidth, serverless function invocations

### Architecture

```
                    Vercel
        ┌───────────────────────────┐
        │  Static CDN (Frontend)    │
        │  client/dist/*            │
        │                           │
        │  Serverless Functions      │
        │  /api/* → Express app     │
        └──────────┬────────────────┘
                   │
                   ▼
          Neon PostgreSQL
          (Serverless Postgres)
```

### Step-by-Step

#### 1. Set Up Database (Neon — Free Tier)

Neon provides serverless PostgreSQL with a generous free tier (0.5 GB storage, 190 compute hours/month).

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project (e.g., "nutrisignal")
3. Copy the connection string — it looks like:
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/nutrisignal?sslmode=require
   ```
4. Save this — you'll use it as `DATABASE_URL`

**Alternative: Supabase** — Go to [supabase.com](https://supabase.com), create a project, and find the connection string under Settings → Database → Connection string (URI). Free tier: 500 MB, 2 projects.

#### 2. Prepare Backend for Vercel Serverless

Create a Vercel serverless entry point that wraps the Express app.

**Create `server/api/index.ts`:**
```typescript
import app from "../src/index.js";
export default app;
```

**Update `server/src/index.ts`** to export the app instead of only listening:
```typescript
// At the bottom, change:
// app.listen(env.port, () => { ... });

// To:
if (process.env.VERCEL !== "1") {
  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
}

export default app;
```

**Create `server/vercel.json`:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/index.ts"
    }
  ]
}
```

#### 3. Prepare Frontend for Vercel

The Vite build already outputs to `client/dist/`. You need to:

**Update `client/src/lib/api.ts`** — make the base URL dynamic:
```typescript
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
export const api = axios.create({ baseURL });
```

**Create `client/vercel.json`:**
```json
{
  "rewrites": [
    { "source": "/((?!api).*)", "destination": "/index.html" }
  ]
}
```

This ensures client-side routing works (all non-API paths serve index.html).

#### 4. Run Prisma Migration on Production DB

```bash
# Set the production DATABASE_URL
export DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/nutrisignal?sslmode=require"

# Generate Prisma client and run migrations
cd server
npx prisma generate
npx prisma migrate deploy
```

#### 5. Deploy to Vercel

**Option 5A: Deploy as a monorepo (single Vercel project)**

```bash
# Install Vercel CLI
npm i -g vercel

# From the project root
vercel
```

Configure the Vercel project:
- Root directory: `/`
- Build command: `npm run build:client`
- Output directory: `client/dist`
- Install command: `npm install --prefix client`

Then deploy the API separately:
```bash
cd server
vercel
```

**Option 5B: Two separate Vercel projects (cleaner)**

| Project        | Root Dir | Build Command       | Output Dir    |
|----------------|----------|---------------------|---------------|
| nutrisignal-web| `client` | `npm run build`     | `dist`        |
| nutrisignal-api| `server` | `npm run build`     | —             |

#### 6. Set Environment Variables in Vercel

Go to **Vercel Dashboard → Project → Settings → Environment Variables** and add:

**For the API project (`server`):**

| Variable             | Value                                              |
|----------------------|----------------------------------------------------|
| `DATABASE_URL`       | `postgresql://...@neon.tech/nutrisignal?sslmode=require` |
| `JWT_SECRET`         | (generate a secure random string)                  |
| `ADMIN_BOOTSTRAP_KEY`| (generate a secure random string)                  |
| `CLIENT_URL`         | `https://nutrisignal-web.vercel.app`               |
| `AI_PROVIDER`        | `grok`                                             |
| `AI_API_KEY`         | `xai-...` (your Grok key)                          |
| `VERCEL`             | `1`                                                |

**For the frontend project (`client`):**

| Variable        | Value                                       |
|-----------------|---------------------------------------------|
| `VITE_API_URL`  | `https://nutrisignal-api.vercel.app/api`    |

---

## Option B: Vercel (Frontend) + Railway (Backend)

Better for long-running processes or if you need WebSockets later.

### Why Railway
- Always-on server (not serverless) — no cold starts
- Built-in PostgreSQL (free trial: $5 credit/month)
- Simple deploy from GitHub
- Automatic HTTPS

### Step-by-Step

#### 1. Deploy Backend on Railway

1. Go to [railway.app](https://railway.app) and connect your GitHub
2. Create a new project → "Deploy from GitHub repo"
3. Set the root directory to `server`
4. Add a **PostgreSQL** service (Railway provisions it automatically)
5. Railway auto-sets `DATABASE_URL` — add the other env vars:

| Variable             | Value                                |
|----------------------|--------------------------------------|
| `JWT_SECRET`         | (random secure string)               |
| `ADMIN_BOOTSTRAP_KEY`| (random secure string)               |
| `CLIENT_URL`         | `https://nutrisignal.vercel.app`     |
| `AI_PROVIDER`        | `grok`                               |
| `AI_API_KEY`         | `xai-...`                            |
| `PORT`               | `${{PORT}}`  (Railway provides this) |

6. Set build command: `npm run build && npx prisma migrate deploy`
7. Set start command: `npm start`

Railway gives you a URL like `https://nutrisignal-api.up.railway.app`.

#### 2. Deploy Frontend on Vercel

1. Connect GitHub → select the repo
2. Root directory: `client`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable: `VITE_API_URL` = `https://nutrisignal-api.up.railway.app/api`

---

## Option C: Vercel (Frontend) + Render (Backend)

Similar to Railway but with a permanent free tier.

### Render Free Tier
- **Web Service**: 750 hours/month free (spins down after 15 min inactivity, ~30s cold start)
- **PostgreSQL**: Free for 90 days, then $7/month

### Step-by-Step

1. Go to [render.com](https://render.com), connect GitHub
2. Create **Web Service** → root directory `server`
3. Build command: `npm install && npm run build && npx prisma migrate deploy`
4. Start command: `npm start`
5. Add environment variables (same as Railway table above)
6. Create **PostgreSQL** database, copy the internal URL to `DATABASE_URL`
7. Deploy frontend on Vercel (same as Option B step 2)

---

## Database Hosting Comparison

| Provider   | Free Tier                    | Pros                           | Cons                       |
|------------|------------------------------|--------------------------------|----------------------------|
| **Neon**   | 0.5 GB, 190 compute hrs/mo  | Serverless, scales to zero, branching | Cold starts on free tier |
| **Supabase**| 500 MB, 2 projects          | Dashboard, Auth, Realtime built-in | Pauses after 1 week inactivity |
| **Railway**| $5/mo credit                 | Always-on, easy setup          | No permanent free tier     |
| **Render** | 90 days free, then $7/mo    | Simple, free initially         | DB expires after 90 days   |
| **ElephantSQL** | 20 MB (Tiny Turtle)    | Always free                    | Very limited storage       |

**Recommendation**: **Neon** for production (serverless, generous free tier, pairs well with Vercel).

---

## Recommended Deployment (Summary)

For a project at this stage, the simplest and cheapest approach:

```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐
│   Vercel     │    │   Vercel     │    │    Neon       │
│  (Frontend)  │───▶│ (Serverless  │───▶│ (PostgreSQL)  │
│  Static CDN  │    │   API)       │    │  Serverless   │
└─────────────┘    └─────────────┘    └──────────────┘
```

| Service | Cost   | What it hosts              |
|---------|--------|----------------------------|
| Vercel  | Free   | React SPA + Express API    |
| Neon    | Free   | PostgreSQL database         |
| **Total** | **$0/month** | Full production stack |

---

## Pre-Deployment Checklist

Before deploying, these changes are needed:

- [ ] Make API base URL dynamic in frontend (`VITE_API_URL` env var)
- [ ] Add `export default app` to server entry and conditional `app.listen`
- [ ] Create `vercel.json` for both client and server
- [ ] Add `prisma generate` to server build step
- [ ] Update CORS to accept the production frontend domain
- [ ] Generate production-grade `JWT_SECRET` and `ADMIN_BOOTSTRAP_KEY`
- [ ] Set up Neon database and run `prisma migrate deploy`
- [ ] Update `CLIENT_URL` to production frontend URL (for QR code generation)
- [ ] Test the bootstrap-super-admin flow on production
- [ ] Verify AI API key works from Vercel's serverless environment

---

## Post-Deployment Steps

1. **Bootstrap Super Admin**: Visit `https://your-app.vercel.app/bootstrap-super-admin` and create the admin account
2. **Create Subscription Plans**: Log in as super admin and add plans
3. **Register a Restaurant**: Use `/register` to create the first restaurant
4. **Set Up Menu & Tables**: Log in as restaurant owner, add categories/items/tables
5. **Generate QR Codes**: Download and print QR codes for each table
6. **Test Customer Flow**: Scan a QR code with your phone to verify the full flow

---

## Future Deployment Considerations

| Concern           | Solution                                           |
|-------------------|----------------------------------------------------|
| Custom domain     | Add domain in Vercel dashboard (free)              |
| HTTPS             | Automatic with Vercel and Neon                     |
| Image uploads     | Move from local `/uploads` to **Cloudinary** or **S3** |
| Rate limiting     | Add `express-rate-limit` middleware                |
| Monitoring        | Vercel Analytics (free) + Sentry for error tracking|
| Scaling           | Neon auto-scales; Vercel scales serverless functions|
| CI/CD             | Connect GitHub → Vercel auto-deploys on push       |
