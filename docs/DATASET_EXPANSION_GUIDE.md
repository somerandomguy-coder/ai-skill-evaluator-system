# Job Description & Requirement Bank Expansion Guide

This guide details how to expand the platform's challenge and requirement database using real-world job descriptions sourced from LinkedIn, Seek, Indeed, or company careers portals.

---

## 1. Why Pre-Populating the Database Matters

1. **Sub-Second Evaluation Loading**: Querying pre-indexed challenges from PostgreSQL takes under **150ms**, eliminating the 30–60 second latency of live LLM generation.
2. **Zero API Cost & Rate-Limit Immunity**: Candidates can practice and build without consuming OpenAI token credits.
3. **Enterprise Calibration**: Pre-populated challenges undergo rigorous 4D lifecycle validation and planted defect calibration so mentors and hiring managers evaluate against validated benchmarks.

---

## 2. Recommended Engineering Archetypes & LinkedIn Search Queries

When sourcing job descriptions, look for roles that demand **real technical judgment**, architecture trade-offs, and algorithmic discipline.

| Engineering Archetype | Recommended LinkedIn Search Queries | Target Tier-1 Companies |
| :--- | :--- | :--- |
| **Frontend & Graphics** | `Staff Frontend Engineer`, `WebGL React Engineer`, `Design Systems Tech Lead` | Canva, Figma, Linear, Vercel |
| **Backend & Payments** | `Senior Backend Platform`, `Distributed Systems Engineer`, `Payments Infrastructure` | Stripe, Square/Block, Adyen, Wise |
| **Applied AI & NLP** | `Staff Applied AI Engineer`, `LLM Systems Architect`, `AI Safety & Evaluation` | Culture Amp, OpenAI, Anthropic, Cohere |
| **Fullstack Collaboration** | `Senior Fullstack Engineer`, `Realtime Collaboration`, `State Sync Engineer` | Atlassian, Notion, Slack, Miro |
| **Cloud & Systems** | `Cloud Systems Engineer`, `High-Throughput Telemetry`, `Site Reliability Tech Lead` | Datadog, Cloudflare, Fastly, AWS |

---

## 3. What to Copy from a LinkedIn Job Description

When viewing a LinkedIn job posting, copy the key technical sections while stripping out generic recruitment marketing:

### ✅ What to Include:
1. **Role Title & Company Name**: e.g., *Staff Frontend Engineer at Canva*
2. **Location & Work Mode**: e.g., *Sydney, Australia (Hybrid)*
3. **Team Context & About the Role**: 1–2 paragraphs explaining what the team builds.
4. **Key Responsibilities**: The bullet points detailing daily technical tasks.
5. **Technical Skills & Qualifications**: Languages, frameworks, architectural concepts (e.g. TypeScript, WebGL, ACID, k-anonymity).

### ❌ What to Exclude (Avoid Boilerplate):
- Generic employee perks (health insurance, 401k/superannuation, snack bars)
- Standard legal EEO statements ("We are an equal opportunity employer...")
- Salary bands and internal referral instructions

---

## 4. How to Add New JDs to the Database

### Method A: Using `data/imported_jds.json` (Recommended for Batch Ingestion)

1. Create or open the file `data/imported_jds.json` in the root of your project:
   ```bash
   cp data/imported_jds.example.json data/imported_jds.json
   ```

2. Paste your copied LinkedIn job descriptions in JSON format:
   ```json
   [
     {
       "roleTitle": "Senior Backend Payments Engineer",
       "employer": "Stripe",
       "domain": "Fintech & Distributed Transactions",
       "sourceUrl": "https://www.linkedin.com/jobs/view/stripe-payments-example",
       "rawJd": "Role: Senior Backend Payments Engineer\nCompany: Stripe\n...\n[Paste full text here]",
       "mustHaveSkills": ["TypeScript", "Distributed Systems", "Idempotency", "PostgreSQL"],
       "niceToHaveSkills": ["Redis", "Kafka"],
       "timeboxMinutes": 180
     }
   ]
   ```

3. Run the population pipeline script:
   ```bash
   npm run db:populate
   ```

The script will automatically:
- Parse and sanitize the job descriptions
- Generate structured 4D lifecycle requirements (Problem Framing, Technical Approach, Critical Judgment, Trade-off Awareness, Domain Fit, Communication)
- Insert the challenges and requirement banks directly into your PostgreSQL database.

---

### Method B: Adding Curated Roles Directly in Code

To add permanent default challenges that ship with the platform repository:
1. Open [`scripts/populate-challenges.ts`](file:///home/nam/Documents/git-repos/active/ai-skill-evaluator-system/scripts/populate-challenges.ts).
2. Append your new role to the `CURATED_ROLES` array with:
   - Challenge brief (problem statement, constraints, what "done" means)
   - 6–12 weighted requirements with specific `successSignals` and `failureModes`
3. Run `npm run db:populate`.

---

## 5. Verifying in the UI

Once populated:
1. Start your local dev server: `npm run dev`.
2. Visit `/start` or the home dashboard.
3. Paste any URL or text matching your employer/role, or select the pre-populated challenge from the catalog.
4. Notice the challenge and requirement bank loads instantly without any API delays!
