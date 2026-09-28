import * as fs from "node:fs";
import * as path from "node:path";

interface ImportedJd {
  roleTitle: string;
  employer: string;
  domain: string;
  sourceUrl: string;
  rawJd: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  timeboxMinutes: number;
}

const rawPath = path.join(process.cwd(), "data", "raw_jds_cluster_2.txt");
const jsonPath = path.join(process.cwd(), "data", "imported_jds.json");

const rawContent = fs.readFileSync(rawPath, "utf-8");

// Split by candidate URL beginnings
const urlIndices = [
  { url: "https://www.linkedin.com/jobs/view/4467957805/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4467957805/") },
  { url: "https://www.linkedin.com/jobs/view/4472703106/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4472703106/") },
  { url: "https://www.linkedin.com/jobs/view/4458161044/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4458161044/") },
  { url: "https://www.linkedin.com/jobs/view/4454233912/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4454233912/") },
  { url: "https://www.linkedin.com/jobs/view/4466590565/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4466590565/") },
  { url: "https://stripe.com/careers/listing/senior-software-engineer-backend/8230952", idx: rawContent.indexOf("https://stripe.com/careers/listing/senior-software-engineer-backend/8230952") },
  { url: "https://wise.jobs/job/senior-software-engineer-i-business-onboarding-and-verification-in-london-jid-3627", idx: rawContent.indexOf("https://wise.jobs/job/senior-software-engineer-i-business-onboarding-and-verification-in-london-jid-3627") },
  { url: "https://careers.airwallex.com/job/62989730-2731-4af4-9ff1-97c016207758/senior-backend-engineer-liquidity-platform/", idx: rawContent.indexOf("https://careers.airwallex.com/job/62989730-2731-4af4-9ff1-97c016207758/senior-backend-engineer-liquidity-platform/") },
  { url: "https://block.xyz/careers/jobs/5207134008", idx: rawContent.indexOf("https://block.xyz/careers/jobs/5207134008") },
  { url: "https://recruitment.macquarie.com/en_US/careers/JobDetail?jobId=22476", idx: rawContent.indexOf("https://recruitment.macquarie.com/en_US/careers/JobDetail?jobId=22476") },
];

const metadataList = [
  {
    roleTitle: "Staff / Principal Backend Engineer — Payments Infrastructure",
    employer: "Stealth FinTech / Payments Infrastructure",
    domain: "SaaS Payments & Billing Infrastructure",
    mustHaveSkills: ["Java / JVM", "Distributed Systems", "Ledger & Transaction Processing", "Event-Driven Architecture", "API Design"],
    niceToHaveSkills: ["Pricing Logic", "Eventual vs Strong Consistency", "Observability", "Cloud Architecture"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Software Engineer II — Distributed Backend",
    employer: "Mitti by SafetyCulture",
    domain: "Frontline Workplace Operations & Distributed Services",
    mustHaveSkills: ["Golang", "AWS", "PostgreSQL", "Kafka", "Distributed Systems"],
    niceToHaveSkills: ["Data Warehousing", "AI Coding Assistants", "SaaS Scale"],
    timeboxMinutes: 120,
  },
  {
    roleTitle: "Software Engineer II — Customer Identity & Access Management (CIAM)",
    employer: "Mitti by SafetyCulture",
    domain: "Identity, Authentication & Access Security",
    mustHaveSkills: ["Golang", "OpenID Connect / OAuth2", "SAML", "PostgreSQL", "AWS / Kafka"],
    niceToHaveSkills: ["Auth0", "Token Security & Credential Hygiene", "Idempotency & Retries"],
    timeboxMinutes: 120,
  },
  {
    roleTitle: "Backend Processing Pipeline Engineer",
    employer: "Propeller",
    domain: "Geospatial 3D Mapping & Compute-Heavy Pipelines",
    mustHaveSkills: ["Node.js / Python", "Temporal (Workflow Orchestration)", "Distributed Processing Pipelines", "Cloud Infrastructure"],
    niceToHaveSkills: ["GIS / Geospatial", "Photogrammetry", "3D Survey Datasets"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Software Engineer — Backend FinTech",
    employer: "Global FinTech (Sydney)",
    domain: "Financial Technology & High-Scale Transactions",
    mustHaveSkills: ["Python", "FastAPI / Django", "PostgreSQL", "AWS", "Distributed Systems"],
    niceToHaveSkills: ["Asynchronous Processing", "Event-Driven Systems", "API Resilience"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Software Engineer — Financial Data Platform",
    employer: "Stripe",
    domain: "Global Financial Infrastructure & Ledger Accounting",
    mustHaveSkills: ["Java / Scala / Python", "Distributed Systems", "Big Data / Apache Spark", "SQL & Ledger Modeling", "Fintech Compliance"],
    niceToHaveSkills: ["JUnit / Mockito", "Petabyte Data Pipelines", "Production Incident Response"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Software Engineer — Business Onboarding & Verification",
    employer: "Wise",
    domain: "Global Payments & Financial Crime Compliance",
    mustHaveSkills: ["Java / JVM", "Spring Framework", "Distributed & Concurrent Systems", "Relational Databases / Schema Design", "TDD"],
    niceToHaveSkills: ["Machine Learning Basics", "CI/CD", "Automated Compliance Controls"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Backend Engineer — Liquidity Platform",
    employer: "Airwallex",
    domain: "Global Liquidity, Treasury & Fund Movements",
    mustHaveSkills: ["Kotlin / Java", "Distributed Systems (Concurrency, Idempotency)", "Kafka / Event-Driven Architecture", "PostgreSQL", "gRPC / REST"],
    niceToHaveSkills: ["Safeguarding Compliance", "Treasury & FX Positioning", "Financial Auditing"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Software Engineer — Tax Engine (Cash App)",
    employer: "Block",
    domain: "Tax Engine & Regulated Financial Filing",
    mustHaveSkills: ["Java / Kotlin", "SQL Relational Databases", "gRPC / Protocol Buffers", "Distributed Architecture", "System Design"],
    niceToHaveSkills: ["Tax Rule Engines", "Datadog / Splunk", "AI Coding Agents"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Software Engineer — Cybersecurity & Detection Engineering",
    employer: "Macquarie Group",
    domain: "Banking & Financial Cybersecurity Infrastructure",
    mustHaveSkills: ["Python", "API Design", "Multi-Cloud (AWS / Azure)", "Distributed Systems", "Vulnerability Management"],
    niceToHaveSkills: ["Financial Services Security", "Automation Workflows", "Multi-Cloud Governance"],
    timeboxMinutes: 180,
  },
];

const cluster2Jds: ImportedJd[] = [];

for (let i = 0; i < urlIndices.length; i++) {
  const current = urlIndices[i];
  const next = urlIndices[i + 1];
  const rawChunk = rawContent.slice(current.idx, next ? next.idx : undefined).trim();
  const meta = metadataList[i];

  if (!meta) continue;

  // Extract raw text excluding the first line if it is the URL
  const firstLineEnd = rawChunk.indexOf("\n");
  const url = firstLineEnd !== -1 ? rawChunk.slice(0, firstLineEnd).trim() : current.url;
  const rawJd = firstLineEnd !== -1 ? rawChunk.slice(firstLineEnd).trim() : rawChunk;

  cluster2Jds.push({
    roleTitle: meta.roleTitle,
    employer: meta.employer,
    domain: meta.domain,
    sourceUrl: url,
    rawJd,
    mustHaveSkills: meta.mustHaveSkills,
    niceToHaveSkills: meta.niceToHaveSkills,
    timeboxMinutes: meta.timeboxMinutes,
  });
}

// Read existing JDs
const existing: ImportedJd[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

const updated = [...existing];
let addedCount = 0;

for (const p of cluster2Jds) {
  const existingIdx = updated.findIndex((e) => e.sourceUrl === p.sourceUrl);
  if (existingIdx !== -1) {
    updated[existingIdx] = p;
  } else {
    updated.push(p);
    addedCount++;
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2), "utf-8");
console.log(`Successfully processed Cluster 2! Added ${addedCount} new JDs. Total JDs now: ${updated.length}`);
