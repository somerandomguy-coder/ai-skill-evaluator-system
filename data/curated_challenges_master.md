# Curated Benchmark Challenges & Dataset Master Plan (100 Finest Challenges)

> **Core Philosophy**: 100 gritty, highly authentic engineering briefs with real-world invariants beat 600 generic boilerplate JDs every day of the week.
> Modeled after real industry mentors, judges, and real systems engineering problems across Australia and global tech leaders.

---

## 1. Dataset Overview

- **Total Curated Challenges**: **100** distinct production-grade engineering challenges.
- **Total Requirements**: **700** SFIA 9 & Evidence-Centered Design (ECD) calibrated criteria.
- **Requirements per Challenge**: Exactly **7** categories per challenge:
  1. `PROBLEM_FRAMING` (weight: 15)
  2. `TECHNICAL_APPROACH` (weight: 15)
  3. `AI_DIRECTION` (weight: 15)
  4. `CRITICAL_JUDGMENT` (weight: 20, containing an authentic `injectedTrap`)
  5. `TRADEOFF_AWARENESS` (weight: 10)
  6. `DOMAIN_FIT` (weight: 15)
  7. `COMMUNICATION` (weight: 10)
- **Data Export Files**:
  - [`data-export/requirements-dataset.json`](file:///home/nam/Documents/git-repos/active/ai-skill-evaluator-system/data-export/requirements-dataset.json)
  - [`data-export/requirements-dataset.csv`](file:///home/nam/Documents/git-repos/active/ai-skill-evaluator-system/data-export/requirements-dataset.csv)
- **Quality Standard**:
  - 100% of challenges have realistic, non-generic problem briefs.
  - 100% of CRITICAL_JUDGMENT criteria have non-empty, domain-authentic `injectedTrap` definitions.
  - 100% of requirements have >= 2 concrete `successSignals` and >= 1 concrete `failureModes`.
  - Zero empty strings or generic placeholder boilerplate.

---

## 2. Creative Real-World Bug Archetypes Matrix

Implemented dynamically in [`src/lib/engine/planted-bugs.ts`](file:///home/nam/Documents/git-repos/active/ai-skill-evaluator-system/src/lib/engine/planted-bugs.ts):

| Domain Archetype | Trap 1: Precision / Mathematical Drift | Trap 2: Security, Traversal & Privacy | Trap 3: State Mutation / Resilience |
| :--- | :--- | :--- | :--- |
| **FinTech & Statutory Systems** | **Float Currency Drift**: IEEE-754 floating-point division (`cents / 100`) causing rounding drift.<br>*(Fix: Wad/Ray 18-decimal or integer cents).* | **PII & TFN Data Leak**: Plaintext Tax File Numbers, account numbers, or user IDs in logs.<br>*(Fix: Identity masking / redaction).* | **Negative Underflow**: Missing validation for negative numbers `< 0`.<br>*(Fix: Defensive bounds clamp).* |
| **Game & Simulation Engines** | **Floating-Point Tick Drift**: Frame-variable `dt` (`x += speed * dt`) causing desync.<br>*(Fix: 20Hz / 50ms fixed accumulator).* | **$O(N^2)$ Pairwise Distance**: Nested all-pairs distance comparison.<br>*(Fix: Spatial hash grid partitioning).* | **In-Loop State Mutation**: Mutating coordinates during active iteration.<br>*(Fix: Double-buffering / snapshots).* |
| **Marketplace & Subscription Billing** | **Floating GST / Proration Drift**: Float multiplication (`price * 0.1`) causing currency drift.<br>*(Fix: Math.round integer cents).* | **Swallowed SRE Exceptions**: Catch block returning HTTP 200 OK without correlation ID.<br>*(Fix: Differentiate 500 retryable vs 400).* | **Non-Idempotent Retries**: Missing eventId deduplication causing double-billing.<br>*(Fix: Idempotency Key Guard).* |
| **Zero Trust Security & Governance** | **Fail-Open Default-Allow**: Unhandled tools or schema parse errors default to allowed.<br>*(Fix: Strict fail-closed default-deny).* | **Path Traversal Escape**: Naive `path.startsWith()` allowing `../../etc/passwd`.<br>*(Fix: `path.resolve()` root-jail containment).* | **Mutable / Unhashed Audit Logs**: Plain `console.log()` without cryptographic chaining.<br>*(Fix: Append-only SHA-256 hash chain).* |
| **High-Frequency Trading & Systems** | **Non-Deterministic Tie-Breakers**: Equal limit prices sorted with unstable sort.<br>*(Fix: Strict FIFO arrival time order).* | **Nanosecond Timestamp Rollover**: 32-bit truncation or non-monotonic clock steps.<br>*(Fix: 64-bit BigInt monotonic clock).* | **Concurrent Matching Race**: Unprotected shared order book memory access.<br>*(Fix: Atomic ring buffers / mutexes).* |
| **Frontend Canvas & Interactive Graphics** | **High-DPI / Retina Blur**: Missing `window.devicePixelRatio` scaling causing blurry rendering.<br>*(Fix: DPR scaling & mouse offset math).* | **Uncleaned Window Listeners**: Event listeners attached without cleanup in `useEffect`.<br>*(Fix: Proper cleanup in return).* | **Bounding Box Underflow**: Layout dimensions `<= 0` causing `NaN` bounding boxes.<br>*(Fix: Defensive bounds clamp).* |
| **Cloud SRE & Observability** | **Unbounded Metric Cardinality**: Raw dynamic user IDs in Prometheus metric labels.<br>*(Fix: Static enum label whitelist).* | **Trace Context Loss**: Trace headers (`traceparent`) dropped across async tasks.<br>*(Fix: W3C trace context propagation).* | **Unbounded Buffer Overflow**: Ingestion workers lacking backpressure under load.<br>*(Fix: Bounded ring buffer & drop policy).* |

---

## 3. Directory of 100 Curated Challenges

### Cluster A: Mentor & Judge Verified Benchmarks (7)
1. **Employment Hero** — Single Touch Payroll (STP) Phase 2 Disaggregation (`verified-stp2-engine`)
2. **Macquarie / Up Bank** — Consumer Data Right (CDR) Consent Gateway (`verified-cdr-gateway`)
3. **TalentAI** — Fair Hiring AI Resume Screener & Bias Filter (`verified-talentai-screener`)
4. **Total Game Development** — Deterministic 20Hz RTS Simulation Engine (`verified-tgd-rts-sim`)
5. **Aegis Risk Analytics** — P2P Lending Protocol Risk Engine & Telemetry Chain (`verified-aegis-lending-risk`)
6. **Apex Marketplace Infrastructure** — Idempotent Subscription Webhook Reconciler (`verified-apex-subscription-billing`)
7. **Aegis Cloud Defense** — Zero Trust Agent Execution Boundary Proxy (`verified-aegis-agent-security-gate`)

### Cluster B: Real-World Industry Imported Challenges (50)
8. **Canva** — Staff Frontend Engineer — Core Canvas (`challenge-imported-canva-01`)
9. **Stripe** — Senior Backend Payments Engineer (`challenge-imported-stripe-02`)
10. **Employment Hero** — Senior Full-Stack Engineer — Payroll Engine (`challenge-imported-employment-hero-03`)
11. **Datadog** — Senior Cloud Infrastructure Engineer (`challenge-imported-datadog-04`)
12. **Atlassian** — Senior Real-Time Collaborative Engineer (`challenge-imported-atlassian-05`)
13. **Culture Amp** — Senior Applied AI & Privacy Engineer (`challenge-imported-culture-amp-06`)
14. **SafetyCulture** — Senior Mobile Sync & Offline Systems Architect (`challenge-imported-safetyculture-07`)
15. **Vercel** — Senior Edge Runtime & Serverless Architect (`challenge-imported-vercel-08`)
16. **Finder** — Senior Open Banking & CDR Gateway Engineer (`challenge-imported-finder-09`)
17. **Wise** — Senior FX Liquidity & Cross-Border Ledger Engineer (`challenge-imported-wise-10`)
18. **Stake** — Front End Engineer (`challenge-imported-stake-11`)
19. **Qantas** — Front-End Developer — Product Innovation Centre (`challenge-imported-qantas-12`)
20. **Fetch** — Front-end Engineer (Craft & UI) (`challenge-imported-fetch-13`)
21. **Luxury Escapes** — Frontend Engineer — Booking Platform (`challenge-imported-luxury-escapes-14`)
22. **Fetch** — Senior Front-end Engineer (React) (`challenge-imported-fetch-15`)
23. **Canva** — Senior Frontend Software Engineer — CMS Team (`challenge-imported-canva-16`)
24. **Atlassian** — Senior Frontend Software Engineer — Cloud R&D (`challenge-imported-atlassian-17`)
25. **Linear** — Design Engineer — Magic Team (`challenge-imported-linear-18`)
26. **Mitti by SafetyCulture** — Frontend Platform Engineer / Architect (`challenge-imported-mitti-by-safetyculture-19`)
27. **TikTok** — Frontend Engineer — TikTok LIVE Ecosystem (`challenge-imported-tiktok-20`)
28. **Stealth FinTech** — Principal Backend Engineer — Payments Infrastructure (`challenge-imported-stealth-fintech-payments-infrastructure-21`)
29. **Mitti by SafetyCulture** — Software Engineer II — Distributed Backend (`challenge-imported-mitti-by-safetyculture-22`)
30. **Mitti by SafetyCulture** — Software Engineer II — Customer Identity (CIAM) (`challenge-imported-mitti-by-safetyculture-23`)
31. **Propeller** — Backend Processing Pipeline Engineer (`challenge-imported-propeller-24`)
32. **Global FinTech** — Senior Software Engineer — Backend FinTech (`challenge-imported-global-fintech-sydney-25`)
33. **Stripe** — Senior Software Engineer — Financial Data Platform (`challenge-imported-stripe-26`)
34. **Wise** — Senior Software Engineer — Business Onboarding (`challenge-imported-wise-27`)
35. **Airwallex** — Senior Backend Engineer — Liquidity Platform (`challenge-imported-airwallex-28`)
36. **Block** — Senior Software Engineer — Tax Engine (Cash App) (`challenge-imported-block-29`)
37. **Macquarie Group** — Senior Software Engineer — Cybersecurity (`challenge-imported-macquarie-group-30`)
38. **Rippling** — Senior Software Engineer — Global Payroll (`challenge-imported-rippling-31`)
39. **Macquarie Group** — Senior Software Engineer — Payments Platform (`challenge-imported-macquarie-group-32`)
40. **Employment Hero** — Intermediate Backend Engineer — Payroll OS (`challenge-imported-employment-hero-33`)
41. **Xero** — Associate Engineer — Backend & Accounting Systems (`challenge-imported-xero-34`)
42. **MYOB** — Senior Developer — Full-Stack (`challenge-imported-myob-35`)
43. **MYOB** — Machine Learning Engineer — Financial AI (`challenge-imported-myob-36`)
44. **Zip Co** — Director, Engineering — Merchant & Payments (`challenge-imported-zip-co-37`)
45. **Stake** — Software Engineer — Core Investing Platform (`challenge-imported-stake-38`)
46. **AWS** — Software Development Engineer — Internet Edge Service (`challenge-imported-amazon-web-services-aws-39`)
47. **Anduril Industries** — Software Engineer — Autonomous Systems (`challenge-imported-anduril-industries-40`)
48. **CFS** — Senior Azure Cloud & DevOps Engineer (`challenge-imported-investment-wealth-cloud-operations-41`)
49. **CFS** — DevOps & Reliability Engineer — FirstChoice Platform (`challenge-imported-colonial-first-state-cfs-42`)
50. **Macquarie Group** — Cloud Platform Engineer — Distributed Kubernetes (`challenge-imported-macquarie-group-43`)
51. **AWS** — Systems Development Engineer — Sovereign Cloud & DNS (`challenge-imported-amazon-web-services-aws-44`)
52. **Ericsson Australia** — Senior Cloud Infrastructure Integrator (`challenge-imported-ericsson-australia-45`)
53. **Datadog** — Senior Software Engineer — Cloud Networks (`challenge-imported-datadog-46`)
54. **Cloudflare** — Systems Software Engineer — Cloudflare Network Interconnect (`challenge-imported-cloudflare-47`)
55. **Fastly** — Senior Cloud & Edge Solutions Engineer (`challenge-imported-fastly-48`)
56. **AWS** — Dedicated Cloud Engineer — Region Reliability (`challenge-imported-amazon-web-services-aws-49`)
57. **Nine Entertainment** — Senior Platform Engineer — Cloud Operations (`challenge-imported-nine-entertainment-technology-50`)

### Cluster C: Premier Industry Systems & Architecture Challenges (43)
58. **Supabase** — Postgres Realtime CDC & WebSocket Streamer (`challenge-supabase-realtime-cdc`)
59. **Grafana Labs** — High-Throughput PromQL Range Query Stream Aggregator (`challenge-grafana-promql-streamer`)
60. **HashiCorp** — Dynamic Secrets Lease Manager & Revocation Pipeline (`challenge-hashicorp-vault-lease`)
61. **Tyro Payments** — Merchant EFTPOS Terminal Protocol & Settlement Switch (`challenge-tyro-pos-terminal`)
62. **Afterpay** — Real-Time BNPL Fraud Velocity & Installment Risk Engine (`challenge-afterpay-fraud-velocity`)
63. **Cochlear** — Low-Latency Polyphonic Filter Bank & Acoustic Processor (`challenge-cochlear-audio-dsp`)
64. **ResMed** — CPAP Device Telemetry Ingestion & Compliance Analyzer (`challenge-resmed-apnea-telemetry`)
65. **Jump Trading** — Nanosecond L2 Limit Order Book Matching Engine (`challenge-jump-trading-orderbook`)
66. **Optiver** — Real-Time Volatility Surface Cubic Spline Interpolator (`challenge-optiver-volatility-spline`)
67. **IMC Trading** — Statistical Arbitrage Execution Gateway & Tick Synchronizer (`challenge-imc-trading-etf-arb`)
68. **Citadel Securities** — High-Throughput FIX Protocol Drop-Copy Streamer (`challenge-citadel-fix-gateway`)
69. **Honeycomb.io** — High-Cardinality Distributed Trace Collector & Sampler (`challenge-honeycomb-tracer`)
70. **Vercel** — Incremental Static Regeneration (ISR) Cache Revalidator (`challenge-vercel-isr-cache`)
71. **Retool** — Sandboxed Iframe PostMessage Security Bridge (`challenge-retool-sandboxed-bridge`)
72. **GitHub** — Reliable Webhook Delivery & Fanout Queue (`challenge-github-webhook-queue`)
73. **GitLab** — Ephemeral Containerized Job Execution Orchestrator (`challenge-gitlab-ci-runner`)
74. **Docker** — Container Cgroup Memory & OOM Event Watcher (`challenge-docker-cgroup-watcher`)
75. **Elastic** — Distributed Inverted Index Sharding & Query Router (`challenge-elastic-index-sharder`)
76. **Snowflake** — High-Throughput Columnar Parquet File Decoder (`challenge-snowflake-parquet-reader`)
77. **Twilio** — WebRTC Adaptive Audio Jitter Buffer & Packet Reorderer (`challenge-twilio-webrtc-jitter`)
78. **OpenAI** — Distributed Token Bucket Rate Limiter & Concurrency Gate (`challenge-openai-token-bucket`)
79. **Anthropic** — KV-Cache Replay & Prompt Deduplication Proxy (`challenge-anthropic-prompt-cache`)
80. **Stan** — 4K HLS Segment Transmuxer & Audio-Video Synchronizer (`challenge-stan-hls-transmuxer`)
81. **Woolworths Digital** — Cold-Chain Grocery Delivery Vehicle Routing Solver (`challenge-woolworths-route-solver`)
82. **Coles Technology** — Cold-Chain Refrigerator Sensor Ingestion & Alert Engine (`challenge-coles-iot-coldchain`)
83. **Telstra Purple** — High-Concurrency MQTT Fleet Telemetry Broker (`challenge-telstra-mqtt-broker`)
84. **Commonwealth Bank** — Real-Time PayID Resolution & ISO 20022 Message Router (`challenge-cba-payid-resolver`)
85. **National Australia Bank** — CDR Consent Lifecycle & Data Access Revocation Switch (`challenge-nab-consent-revocation`)
86. **Westpac Group** — High-Availability Card Authorization & Payment Switch (`challenge-westpac-payment-switch`)
87. **Judo Bank** — SME Commercial Loan Cash Flow & Stress Test Simulator (`challenge-judo-bank-sme-risk`)
88. **Canva** — Generative Vector Path Optimizer & SVG Sanitizer (`challenge-canva-magic-svg`)
89. **Culture Amp** — Differential Privacy Noise Generator for Employee Surveys (`challenge-cultureamp-diff-privacy`)
90. **Envato** — Dynamic Watermarking & Digital Asset Protection Engine (`challenge-envato-watermark-stamper`)
91. **SafetyCulture** — Offline-First Inspection Audit State Synchronizer (`challenge-safetyculture-checklist-sync`)
92. **Whispir** — Multi-Carrier Emergency SMS Notification Dispatcher (`challenge-whispir-emergency-relay`)
93. **RedBalloon** — Experience Voucher Escrow & Fraud-Resistant Code Generator (`challenge-redballoon-voucher-escrow`)
94. **Airtasker** — Peer-to-Peer Task Milestone Escrow Settlement Engine (`challenge-airtasker-milestone-escrow`)
95. **Atlassian** — Real-Time Collaborative Document CRDT Vector Clock Engine (`challenge-atlassian-confluence-crdt`)
96. **Miro** — Infinite Canvas QuadTree Spatial Indexer & Culling Engine (`challenge-miro-whiteboard-quadtree`)
97. **Figma** — 2D Vector Path Boolean Union & Difference Clipper (`challenge-figma-boolean-clipper`)
98. **Procreate** — WebGL Dual-Source Color Blending & Brush Shader (`challenge-procreate-webgl-shader`)
99. **Ableton / RØDE** — Low-Latency Polyphonic Synthesizer Voice Allocator (`challenge-webaudio-polyphony`)
100. **Linear** — Offline-First Distributed Sync Engine & Tombstone Manager (`challenge-linear-git-sync`)

---

## 4. Integrity Verification

Every time `python3 scripts/build_curated_100.py` executes, it verifies:
- Exactly 100 unique challenges.
- Exactly 700 requirements across the 7 SFIA categories.
- 100% non-empty `injectedTrap` strings for all CRITICAL_JUDGMENT criteria.
- 100% of requirements have at least 2 distinct `successSignals`.
- 100% of requirements have at least 1 distinct `failureModes`.
- Zero empty strings or generic boilerplate copies.
