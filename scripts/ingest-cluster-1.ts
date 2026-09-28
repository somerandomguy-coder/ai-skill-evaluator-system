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

const rawPath = path.join(process.cwd(), "data", "raw_jds_cluster_1.txt");
const jsonPath = path.join(process.cwd(), "data", "imported_jds.json");

const rawContent = fs.readFileSync(rawPath, "utf-8");

// Split by https:// URLs
const sections = rawContent.split(/(?=https:\/\/)/g).filter(s => s.trim().startsWith("https://"));

console.log(`Found ${sections.length} JD sections in raw_jds_cluster_1.txt`);

const metadataList = [
  {
    roleTitle: "Front End Engineer",
    employer: "Stake",
    domain: "Fintech & Stock Trading Platform",
    mustHaveSkills: ["TypeScript", "Angular", "Ionic", "Responsive UI", "WCAG 2.0 Accessibility"],
    niceToHaveSkills: ["RxJS", "Storybook", "Figma", "Go (Backend)", "Financial Services"],
    timeboxMinutes: 120,
  },
  {
    roleTitle: "Front-End Developer — Product Innovation Centre",
    employer: "Qantas",
    domain: "Aviation & Digital Travel Platform",
    mustHaveSkills: ["JavaScript / TypeScript", "React JS", "SSR / Micro Front Ends", "Design Systems", "Automated Testing"],
    niceToHaveSkills: ["AWS (EC2, S3, Lambda)", "Docker & Kubernetes", "GraphQL", "Adobe Edge Delivery", "Observability (Datadog/Splunk)"],
    timeboxMinutes: 120,
  },
  {
    roleTitle: "Front-end Engineer (Craft & UI)",
    employer: "Fetch",
    domain: "Pet Insurance & HealthTech",
    mustHaveSkills: ["React", "TypeScript", "Design Systems", "Web Performance & Perceived Speed", "AI Coding Tools"],
    niceToHaveSkills: ["React Native", "Next.js", "GCP", "Figma", "Interaction Design"],
    timeboxMinutes: 120,
  },
  {
    roleTitle: "Frontend Engineer — Booking Platform",
    employer: "Luxury Escapes",
    domain: "Global Travel Marketplace & High-Conversion Booking",
    mustHaveSkills: ["React", "TypeScript", "State Architecture", "A/B Testing & Experimentation", "Frontend Performance"],
    niceToHaveSkills: ["Node.js Microservices", "AWS", "CI/CD", "Accessibility"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Front-end Engineer (React)",
    employer: "Fetch",
    domain: "Pet Insurance & HealthTech",
    mustHaveSkills: ["TypeScript", "React", "Design Systems Architecture", "Performance Tuning", "AI-Augmented Workflows"],
    niceToHaveSkills: ["React Native", "Next.js", "Micro-interactions", "Observability"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Frontend Software Engineer — CMS Team",
    employer: "Canva",
    domain: "Visual Design & Collaborative Content Management",
    mustHaveSkills: ["TypeScript", "React", "CS Fundamentals (Concurrency, Data Structures)", "Performance Optimization", "Content Architecture"],
    niceToHaveSkills: ["Localisation", "Experimentation Platforms", "Design Systems", "Cross-browser Compatibility"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Frontend Software Engineer — Cloud R&D",
    employer: "Atlassian",
    domain: "Team Collaboration Cloud (Jira, Confluence, Trello)",
    mustHaveSkills: ["JavaScript (ES6+)", "TypeScript", "React", "Frontend Ecosystem & Bundling", "Automated Testing (Jest, Cypress)"],
    niceToHaveSkills: ["Large-Scale Systems", "Mentorship", "Agile Methodologies", "Cloud Migration"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Design Engineer — Magic Team (Web & Brand)",
    employer: "Linear",
    domain: "Product Development Systems & Developer Tooling",
    mustHaveSkills: ["React", "TypeScript", "Creative Animations & Micro-interactions", "Figma-to-Code Prototyping", "Agentic Coding Tools"],
    niceToHaveSkills: ["Motion Design", "Design Systems", "Web Performance", "Craftsmanship"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Frontend Platform Engineer / Architect",
    employer: "Mitti by SafetyCulture",
    domain: "Frontline Workplace Operations & Modern Architecture",
    mustHaveSkills: ["React", "Frontend Architecture", "Shared Infrastructure & Tooling", "RFCs & Design Reviews", "Code Quality & Performance"],
    niceToHaveSkills: ["AI Tooling Integration", "Multi-team Migration", "Monorepos", "Cross-platform"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Frontend Engineer — TikTok LIVE Ecosystem",
    employer: "TikTok",
    domain: "Real-Time Distributed Live Streaming & Interactive Media",
    mustHaveSkills: ["React / Vue", "JavaScript / TypeScript", "Performance Optimization", "Cross-Browser Compatibility", "AI Coding Tools"],
    niceToHaveSkills: ["Three.js / WebGL", "Interactive Rendering", "React Native / PC", "Low-code Systems"],
    timeboxMinutes: 180,
  },
];

const parsedJds: ImportedJd[] = [];

for (let i = 0; i < sections.length; i++) {
  const section = sections[i].trim();
  const firstLineEnd = section.indexOf("\n");
  const url = firstLineEnd !== -1 ? section.slice(0, firstLineEnd).trim() : section.trim();
  const rawJd = firstLineEnd !== -1 ? section.slice(firstLineEnd).trim() : "";
  const meta = metadataList[i];

  if (!meta) continue;

  parsedJds.push({
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

// Filter out any duplicates by sourceUrl
const updated = [...existing];
let addedCount = 0;

for (const p of parsedJds) {
  const existingIdx = updated.findIndex((e) => e.sourceUrl === p.sourceUrl);
  if (existingIdx !== -1) {
    updated[existingIdx] = p; // update
  } else {
    updated.push(p);
    addedCount++;
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2), "utf-8");
console.log(`Successfully processed Cluster 1! Added ${addedCount} new JDs. Total JDs now: ${updated.length}`);
