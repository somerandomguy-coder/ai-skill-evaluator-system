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

const rawPath = path.join(process.cwd(), "data", "raw_jds_cluster_4.txt");
const jsonPath = path.join(process.cwd(), "data", "imported_jds.json");

const rawContent = fs.readFileSync(rawPath, "utf-8");

// Split by candidate URL beginnings
const urlIndices = [
  { url: "https://www.linkedin.com/jobs/view/4460480625/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4460480625/") },
  { url: "https://www.linkedin.com/jobs/view/4464094198/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4464094198/") },
  { url: "https://www.linkedin.com/jobs/view/4430291497/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4430291497/") },
  { url: "https://www.linkedin.com/jobs/view/4455907695/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4455907695/") },
  { url: "https://www.linkedin.com/jobs/view/4451663461/", idx: rawContent.indexOf("https://www.linkedin.com/jobs/view/4451663461/") },
  { url: "https://careers.datadoghq.com/detail/8128450/?gh_jid=8128450", idx: rawContent.indexOf("https://careers.datadoghq.com/detail/8128450/?gh_jid=8128450") },
  { url: "https://job-boards.greenhouse.io/cloudflare/jobs/8088751?gh_jid=8088751", idx: rawContent.indexOf("https://job-boards.greenhouse.io/cloudflare/jobs/8088751?gh_jid=8088751") },
  { url: "https://www.fastly.com/about/jobs/apply?gh_jid=8082266", idx: rawContent.indexOf("https://www.fastly.com/about/jobs/apply?gh_jid=8082266") },
  { url: "https://www.amazon.jobs/en/jobs/10534229/amazon-dedicated-cloud-engineer-region-reliability", idx: rawContent.indexOf("https://www.amazon.jobs/en/jobs/10534229/amazon-dedicated-cloud-engineer-region-reliability") },
  { url: "https://nine.wd105.myworkdayjobs.com/en-US/Nine_External_Career_Site/job/Senior-Platform-Engineer_JR001059", idx: rawContent.indexOf("https://nine.wd105.myworkdayjobs.com/en-US/Nine_External_Career_Site/job/Senior-Platform-Engineer_JR001059") },
];

const metadataList = [
  {
    roleTitle: "Senior Azure Cloud & DevOps Engineer",
    employer: "Investment & Wealth Cloud Operations",
    domain: "Investment, Wealth & Superannuation Cloud Infrastructure",
    mustHaveSkills: ["Azure Cloud", "Terraform (IaC)", "Azure DevOps CI/CD", "Microsoft Entra ID (RBAC / SSO)", "PowerShell / Python / Bash"],
    niceToHaveSkills: ["Azure Key Vault", "GitHub Actions", "Observability & Alerting", "GitHub Copilot"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "DevOps & Reliability Engineer (FirstChoice Platform)",
    employer: "Colonial First State (CFS)",
    domain: "Wealth Management & Superannuation Platform Operations",
    mustHaveSkills: ["CI/CD Pipelines (Jenkins, GitHub Actions)", "Infrastructure as Code (Terraform)", "Scripting (PowerShell, Bash, Python, .NET)", "Cloud Platform Operations"],
    niceToHaveSkills: ["DevSecOps", "Observability & Monitoring", "Service Reliability", "Incident Management L2/L3"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Cloud Platform Engineer — Distributed Kubernetes & Go",
    employer: "Macquarie Group",
    domain: "Digital Banking & Cloud Native Infrastructure",
    mustHaveSkills: ["Go (Golang)", "Kubernetes & Kubernetes Operators", "GCP / AWS", "ArgoCD (GitOps)", "Infrastructure as Code (Terraform / Helm)"],
    niceToHaveSkills: ["HashiCorp Vault", "Production Incident Support", "Technical Mentorship"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Systems Development Engineer — Sovereign Cloud & Route 53 DNS",
    employer: "Amazon Web Services (AWS)",
    domain: "Sovereign Cloud & Global Route 53 DNS Infrastructure",
    mustHaveSkills: ["Distributed Systems", "DNS Architecture (Route 53, GeoDNS, Latency Routing)", "Automation Tooling (Python / Java / Go)", "CI/CD & Production Operations"],
    niceToHaveSkills: ["Sovereign Cloud Governance", "High-Availability 100% SLA", "Incident Response & Runbooks", "Australian Security Clearance"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Cloud Infrastructure & Systems Integrator",
    employer: "Ericsson Australia",
    domain: "Telco Cloud Infrastructure, NFVI & Kubernetes Container Distribution",
    mustHaveSkills: ["Cloud Systems Integration (NFVI/CNIS)", "Kubernetes & Docker", "IP Networking & Routing", "Infrastructure as Code (Ansible, Helm, Terraform)", "Linux & Virtualization"],
    niceToHaveSkills: ["Telco Cloud (5G Core, Packet Core, Cloud RAN)", "Storage (Ceph, NetApp)", "Monitoring & Observability", "Customer Operations"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Software Engineer — Cloud Networks",
    employer: "Datadog",
    domain: "Multi-Cloud Production Networking & Observability Platform",
    mustHaveSkills: ["Software-Defined Networking (SDN)", "BGP & Routing Protocols", "Systems Programming / Network Automation", "Multi-Cloud (AWS, GCP, Azure)", "Incident Response"],
    niceToHaveSkills: ["Packet Analysis (pcap)", "Latency & Packet Loss Optimization", "Large Scale Multi-Region Connectivity"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Systems Software Engineer — Cloudflare Network Interconnect (CNI)",
    employer: "Cloudflare",
    domain: "Global Edge Network & Private Dedicated Interconnects",
    mustHaveSkills: ["Systems Programming (Rust, Go, C++)", "IP Networking (BGP, Layer 3 Routing, VLANs, Overlays)", "Distributed Systems", "Automated Testing & Run What You Build"],
    niceToHaveSkills: ["Linux Networking", "Kubernetes", "Telemetry (Prometheus, Grafana, ClickHouse)", "AI-Assisted Tooling"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Cloud & Edge Solutions Engineer",
    employer: "Fastly",
    domain: "Edge Cloud Platform, CDN & Programmable Traffic Routing",
    mustHaveSkills: ["Edge Computing & CDN Architecture", "Internet Protocols (HTTP/S, TCP, TLS, DNS)", "Linux & Scripting (Python, Go, Node.js)", "Cloud Networking (AWS, GCP, Azure)"],
    niceToHaveSkills: ["Varnish Configuration Language (VCL)", "Streaming Video/Audio (HLS, DASH)", "Pre/Post-Sales Solutions Architecture"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Dedicated Cloud Engineer — Region Reliability Engineering (RRE)",
    employer: "Amazon Web Services (AWS)",
    domain: "Sovereign Dedicated Cloud & Regional Reliability Engineering",
    mustHaveSkills: ["Systems Administration & Reliability (Linux/Windows)", "Scripting & Automation (Python, Ruby, Perl)", "Cloud Infrastructure (AWS CLI/Console)", "Root Cause Analysis"],
    niceToHaveSkills: ["AI for Reliability (Amazon Bedrock)", "National Security Clearance (TS/SCI)", "Network Defender / Security+"],
    timeboxMinutes: 180,
  },
  {
    roleTitle: "Senior Platform Engineer — Cloud Operations & Multi-Cloud Governance",
    employer: "Nine Entertainment Technology",
    domain: "Media Streaming, Cloud Operations & Multi-Cloud Platform (AWS & GCP)",
    mustHaveSkills: ["Multi-Cloud (AWS & GCP)", "Infrastructure as Code (Terraform, CloudFormation)", "CI/CD Automation (GitLab CI, Jenkins)", "Scripting (Python, Go, Bash)", "Docker & Kubernetes"],
    niceToHaveSkills: ["Observability & Monitoring", "FinOps", "Data Security Posture Management (DSPM)", "CDN & Database Shared Services"],
    timeboxMinutes: 180,
  },
];

const cluster4Jds: ImportedJd[] = [];

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

  cluster4Jds.push({
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

for (const p of cluster4Jds) {
  const existingIdx = updated.findIndex((e) => e.sourceUrl === p.sourceUrl);
  if (existingIdx !== -1) {
    updated[existingIdx] = p;
  } else {
    updated.push(p);
    addedCount++;
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2), "utf-8");
console.log(`Successfully processed Cluster 4! Added ${addedCount} new JDs. Total JDs now: ${updated.length}`);
