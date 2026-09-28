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

const rawPath = path.join(process.cwd(), "data", "raw_jds_cluster_3.txt");
const jsonPath = path.join(process.cwd(), "data", "imported_jds.json");

const rawContent = fs.readFileSync(rawPath, "utf-8");

// Split by candidate URL beginnings
const urlIndices = [
  { url: "https://www.linkedin.com/jobs/view/4454899770/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4454899770/") },
  { url: "https://www.linkedin.com/jobs/view/4425751636/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4425751636/") },
  { url: "https://employmenthero.com/my/jobs/position/employment-hero-intermediate-backend-engineer-remote-malaysia-6039s/?source_name=embedded_career_page", idx: rawContent.indexOf("https://employmenthero.com/my/jobs/position/employment-hero-intermediate-backend-engineer-remote-malaysia-6039s/?source_name=embedded_career_page") },
  { url: "https://careers.xero.com/jobs/8f7f41b3-85db-4029-ab1a-70c88c5dc987/associate-engineer-back-end/", idx: rawContent.indexOf("https://careers.xero.com/jobs/8f7f41b3-85db-4029-ab1a-70c88c5dc987/associate-engineer-back-end/") },
  { url: "https://jobs.lever.co/myob-2/34e52edd-0f0c-42ef-b8f1-bd06ce6e977d", idx: rawContent.indexOf("https://jobs.lever.co/myob-2/34e52edd-0f0c-42ef-b8f1-bd06ce6e977d") },
  { url: "https://jobs.lever.co/myob-2/34139e5f-67e4-4a6a-9d94-55e3584247f3", idx: rawContent.indexOf("https://jobs.lever.co/myob-2/34139e5f-67e4-4a6a-9d94-55e3584247f3") },
  { url: "https://zip.co/careers/roles/4694956006", idx: rawContent.indexOf("https://zip.co/careers/roles/4694956006") },
  { url: "https://stake.breezy.hr/p/ef0cb9ce6354-software-engineer?popup=true", idx: rawContent.indexOf("https://stake.breezy.hr/p/ef0cb9ce6354-software-engineer?popup=true") },
  { url: "https://www.linkedin.com/jobs/view/4465361273/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4465361273/") },
  { url: "https://www.linkedin.com/jobs/view/4316028952/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4316028952/") },
];

const metadataList = [
  {
    roleTitle: "Senior Software Engineer — Global Payroll",
    employer: "Rippling",
    domain: "Global Payroll & HR Systems",
    mustHaveSkills: ["Python", "Django", "Payroll Systems", "Distributed Systems", "Database Schema Design"],
    niceToHaveSkills: ["React", "Production Support / On-Call", "Mentorship", "Engineering Quality"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Software Engineer — Payments & Core Banking Platforms",
    employer: "Macquarie Group",
    domain: "Core Banking & Payment Platforms",
    mustHaveSkills: ["Java", "Spring Boot", "Microservices", "Event-Driven Architecture", "REST APIs"],
    niceToHaveSkills: ["Google Cloud Platform", "NoSQL Databases", "Payment Security", "Incident Management", "AI-Assisted Development"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Intermediate Backend Engineer — Payroll & HR OS",
    employer: "Employment Hero",
    domain: "Automated Payroll & Employment OS",
    mustHaveSkills: ["Server-side RESTful APIs", "TypeScript / Ruby", "Software Testing", "Relational Databases", "Agile"],
    niceToHaveSkills: ["Frontend / FullStack Web", "Agent-Assisted Software Delivery", "Mentoring"],
    timeboxMinutes: 120,
  },
  {
    roleTitle: "Associate Engineer — Backend & Accounting Systems",
    employer: "Xero",
    domain: "Small Business Accounting & Invoicing",
    mustHaveSkills: ["C#", ".NET Framework", "SQL Databases", "Object-Oriented Programming", "Unit Testing"],
    niceToHaveSkills: ["WPF / XAML", "Git Workflows", "Pair Programming", "Monitoring & Logs"],
    timeboxMinutes: 120,
  },
  {
    roleTitle: "Senior Developer — Full-Stack (MYOB Business)",
    employer: "MYOB",
    domain: "SME Business Management & Financial ERP",
    mustHaveSkills: ["TypeScript", "React", ".NET", "C#", "Azure", "CI/CD"],
    niceToHaveSkills: ["AI-Assisted Development", "Solution Architecture", "Engineering Mentorship"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Machine Learning Engineer — Financial Forecasting & AI Accounting",
    employer: "MYOB",
    domain: "Financial AI & Automated Document Understanding",
    mustHaveSkills: ["Python", "Machine Learning (TensorFlow / PyTorch)", "LLMs & Foundation Models", "AWS (SageMaker, Bedrock)", "MLOps (Docker, Kubernetes)"],
    niceToHaveSkills: ["Financial Forecasting", "Document Processing", "Thought Leadership"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Director, Engineering — Merchant & Payments",
    employer: "Zip Co",
    domain: "Payment Orchestration & BNPL Digital Commerce",
    mustHaveSkills: ["Distributed Systems Architecture", "Payments Architecture (Tokenisation, Settlement)", "Cloud Native (AWS, Kubernetes)", "Engineering Leadership & Scaling"],
    niceToHaveSkills: ["Agentic Commerce / AI in Payments", "Payment Orchestration", "Risk & Fraud Mitigation"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Software Engineer — Core Investing Platform",
    employer: "Stake",
    domain: "Digital Brokerage & Securities Trading",
    mustHaveSkills: ["Distributed Systems", "Backend Service Development", "Testing & Verification", "High Availability & Scalability"],
    niceToHaveSkills: ["Golang", "CockroachDB / SQL", "Redis", "gRPC / Event-Driven", "FinTech Regulation"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Software Development Engineer — Internet Edge Service (IES)",
    employer: "Amazon Web Services (AWS)",
    domain: "Global Edge Network & High-Throughput Traffic Routing",
    mustHaveSkills: ["Distributed Systems", "Software Architecture & System Design", "Java / C++ / Python", "High-Throughput Network Routing", "Testing & Operational Health"],
    niceToHaveSkills: ["Full SDLC", "Network Engineering & Optimization", "AWS Cloud Services"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Software Engineer — Autonomous Systems & Safety-Critical Platform",
    employer: "Anduril Industries",
    domain: "Autonomous Robotics, Edge Systems & Mission Control",
    mustHaveSkills: ["Systems Programming (C++ / Rust / Python)", "Data Structures & Concurrency", "Hardware-in-the-Loop & Testing Fixtures", "Distributed Systems & Telemetry"],
    niceToHaveSkills: ["TypeScript / React", "Safety-Critical Verification", "Robotics Middleware", "Australian Security Clearance"],
    timeboxMinutes: 180,
  },
];

const cluster3Jds: ImportedJd[] = [];

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

  cluster3Jds.push({
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

for (const p of cluster3Jds) {
  const existingIdx = updated.findIndex((e) => e.sourceUrl === p.sourceUrl);
  if (existingIdx !== -1) {
    updated[existingIdx] = p;
  } else {
    updated.push(p);
    addedCount++;
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2), "utf-8");
console.log(`Successfully processed Cluster 3! Added ${addedCount} new JDs. Total JDs now: ${updated.length}`);
