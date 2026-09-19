# Deployment Guide: Vercel + Supabase + Langfuse

This guide outlines how to run the full live assessment workflow locally, connect to Supabase PostgreSQL, trace all candidate interactions with Langfuse, and deploy to Vercel.

---

## 1. Running Locally Right Now (Live Real Workflow)

The local environment is fully configured for real live workflows:
- **Local PostgreSQL**: Running on port `54329` (via Podman/Docker). Schema is migrated and seeded.
- **Model**: `gpt-5.5` with your verified OpenAI API Key.
- **Mode**: `DATA_SOURCE="db"` and `DEMO_MODE="false"`.

### Starting the App
```bash
# 1. Ensure database is running
podman-compose up -d db # or docker compose up -d db

# 2. Run dev server
npm run dev
```
Open **http://localhost:3000** in your browser.

### Real End-to-End Workflow:
1. **Intake (`/`)**:
   - Paste any real job description (e.g., your 4WD Supacentre JD or one of the presets).
   - The top header stepper shows: **`1. Input JD`** (active).
   - Click **"Generate Assessment Challenge"**.
2. **Challenge & Rubric (`/challenge/[id]`)**:
   - The top header stepper dynamically advances to: **`2. Challenge & Rubric`** (active with pulsing dot).
   - Review the generated project brief, domain context, and the **4D Product Lifecycle Framework**.
   - Click **"Start building"**.
3. **Build Workspace (`/build/[sessionId]`)**:
   - The top header stepper advances to: **`3. Build Workspace`** (active).
   - Chat with the live AI assistant (`gpt-5.5`).
   - The assistant writes and edits files in real-time.
   - Click **"Submit"** when ready.
4. **Assessment Report (`/report/[id]`)**:
   - The top header stepper advances to: **`4. Assessment Report`** (active).
   - Review the candidate scorecard citing exact evidence from the conversation.
5. **Share to Employer (Card Deck View) (`/report/[id]/employer`)**:
   - Click **"Share to Employer (Deck View)"**.
   - Review the candidate **one focused card in the center of the screen at a time**:
     - *Card 1*: Executive Verdict & Overall Score
     - *Card 2*: How They Build (4D Engineering Lifecycle)
     - *Card 3*: How They Direct AI (Barron Cognitive Rubric & Zero-Trust verification)
     - *Card 4*: Verbatim Transcript Evidence (exact quotes of what the candidate told the AI)
     - *Card 5*: Tamper-Proof Cryptographic Audit Receipt & Next Steps

---

## 2. Setting Up Langfuse Observability & Tracking

Langfuse provides transparent tracking of:
- **What exactly the user said**: Every prompt and message typed in the workspace chat is recorded with session and user attribution.
- **AI Model Generations**: Traced with reasoning tokens, output tokens, latency, prompt tokens, and validation retries.
- **Platform Lifecycle Events**: Tracked when a JD is submitted, build submitted, evaluation completed, or score contested.

### How to Enable:
1. Create a free account at [https://cloud.langfuse.com](https://cloud.langfuse.com) (or self-host).
2. Create a new project (e.g. `ProofCraft`).
3. In Langfuse, navigate to **Settings → API Keys** and click **"Create new API keys"**.
4. Add these to your `.env` (and Vercel environment variables):
```ini
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_BASEURL="https://cloud.langfuse.com" # or "https://us.cloud.langfuse.com"
```
5. Restart your dev server (`npm run dev`). All chat messages, prompts, and model completions will automatically stream to your Langfuse dashboard under **Traces** and **Sessions**!

> **Note**: If Langfuse keys are omitted or empty, the entire app functions normally with zero errors and zero overhead (graceful fallback).

---

## 3. Connecting Supabase (Production PostgreSQL)

Supabase provides high-performance hosted PostgreSQL with built-in connection pooling.

1. Sign in to [Supabase](https://supabase.com) and click **"New project"**.
2. Go to **Project Settings → Database → Connection string**.
3. Select **"Transaction"** mode (connection pooling via PgBouncer on port `6543`), which is ideal for serverless deployments like Vercel.
4. Set your `DATABASE_URL` in `.env` / Vercel:
```ini
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[YOUR-REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
```
5. Deploy the schema migrations to Supabase:
```bash
npx prisma migrate deploy
```
6. (Optional) Seed the baseline accounts and demo challenges:
```bash
npm run db:seed
```

---

## 4. Deploying to Vercel

1. Push your git repository to GitHub / GitLab:
```bash
git push origin main
```
2. In [Vercel](https://vercel.com), click **"Add New... → Project"** and import the repository.
3. In **Settings → Environment Variables**, add:
   - `DATABASE_URL`: Your Supabase connection string.
   - `DATA_SOURCE`: `db`
   - `OPENAI_API_KEY`: Your OpenAI API Key.
   - `OPENAI_MODEL`: `gpt-5.5`
   - `DEMO_MODE`: `false`
   - `LANGFUSE_PUBLIC_KEY`: Your Langfuse Public Key (optional).
   - `LANGFUSE_SECRET_KEY`: Your Langfuse Secret Key (optional).
   - `LANGFUSE_BASEURL`: `https://cloud.langfuse.com`
4. Click **Deploy**. Vercel will build and deploy the Next.js App Router application automatically.
