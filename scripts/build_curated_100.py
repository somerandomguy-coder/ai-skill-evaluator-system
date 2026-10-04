#!/usr/bin/env python3
"""
Curated 100 Benchmark Dataset Builder
Constructs 100 premier, production-grade technical challenges and 700 SFIA 9-calibrated requirements
with real-world systems invariants, creative planted bug archetypes, and rich success/failure criteria.

Outputs:
  - data-export/requirements-dataset.json (700 items)
  - data-export/requirements-dataset.csv (701 rows with header)
"""

import json
import csv
import os
import re

DATA_EXPORT_DIR = "data-export"
os.makedirs(DATA_EXPORT_DIR, exist_ok=True)

# -----------------------------------------------------------------------------
# 1. 7 VERIFIED MENTOR/JUDGE CHALLENGES (The Gold Standard)
# -----------------------------------------------------------------------------
VERIFIED_CHALLENGES = [
    {
        "id": "verified-stp2-engine",
        "employer": "Employment Hero / Australian Payroll Systems",
        "roleTitle": "Mid-Level Full-Stack Engineer — STP Phase 2 Disaggregation",
        "challengeTitle": "Single Touch Payroll (STP) Phase 2 Disaggregation Engine",
        "domain": "Regulated HR & Single Touch Payroll",
        "sfiaLevel": 3,
        "injectedTrap": "AI generates Number(0.1 + 0.2) float math for currency and console.log(employee.tfn) in error handlers.",
        "requirements": [
            {
                "category": "PROBLEM_FRAMING",
                "statement": "Interrogates the brief to clarify STP Phase 2 disaggregation boundaries and cents-precision invariants before generating code.",
                "weight": 15,
                "signals": ["Candidate asks AI assistant to verify whether floating point or integer cents will be used.", "Candidate explicitly lists the 5 required ATO disaggregation categories before asking for implementations."],
                "failures": ["Accepts a generic naive payroll calculator without verifying ATO STP2 requirements.", "Generates unvalidated code in a single prompt."]
            },
            {
                "category": "TECHNICAL_APPROACH",
                "statement": "Designs modular, strongly typed calculation functions separating pure payroll math from UI and I/O handlers.",
                "weight": 15,
                "signals": ["Separates calculateDisaggregation() into a pure function with comprehensive unit tests.", "Uses strict TypeScript interfaces without 'any'."],
                "failures": ["Couples database/API calls directly into calculation loops.", "Uses untyped dictionary objects."]
            },
            {
                "category": "AI_DIRECTION",
                "statement": "Directs the AI assistant with phased, iterative prompts rather than massive all-in-one generation prompts.",
                "weight": 15,
                "signals": ["Directs AI in small steps: (1) schema, (2) unit test cases, (3) calculation logic, (4) UI component.", "Provides constructive feedback when the AI omits overtime penalty multipliers."],
                "failures": ["Submits single prompt asking AI to 'build whole payroll app' and blindly commits the result."]
            },
            {
                "category": "CRITICAL_JUDGMENT",
                "statement": "Detects and corrects deliberate AI traps including floating-point rounding errors and unmasked Tax File Numbers (TFN).",
                "weight": 20,
                "signals": ["Catches the AI's use of floating-point arithmetic and refactors to integer cents.", "Replaces plain text TFN logging with a redaction mask like tfnMask()."],
                "failures": ["Permits IEEE-754 float math (e.g. 19.999999999997) to reach statutory reporting payloads.", "Leaves full 9-digit TFN visible in log statements or browser console."]
            },
            {
                "category": "TRADEOFF_AWARENESS",
                "statement": "Articulates performance and correctness trade-offs between big.js/decimal libraries versus integer cent representations.",
                "weight": 10,
                "signals": ["Documents why integer cents were chosen over external dependencies or floats.", "Discusses edge case handling for half-cent ATO rounding."],
                "failures": ["Claims the calculation has no trade-offs or ignores decimal precision consequences."]
            },
            {
                "category": "DOMAIN_FIT",
                "statement": "Adheres strictly to Australian payroll terminology (Ordinary Time Earnings, PAYG withholding, Superannuation Guarantee).",
                "weight": 15,
                "signals": ["Uses Australian tax nomenclature (PAYG, Super Guarantee, OTE) rather than US concepts (401k, W-2, FICA).", "Calculates Superannuation at the correct statutory rate (currently 11.5% - 12%)."],
                "failures": ["Includes US tax terms like 'State Tax' or 'Social Security Number'."]
            },
            {
                "category": "COMMUNICATION",
                "statement": "Documents disaggregation rules, tax withholdings, and employee statement formats clearly for payroll compliance review.",
                "weight": 10,
                "signals": ["Provides comprehensive inline docstrings for ATO compliance codes.", "Structures statutory error messages with guidance on correction."],
                "failures": ["Leaves calculation code undocumented or produces ambiguous error payloads."]
            }
        ]
    },
    {
        "id": "verified-cdr-gateway",
        "employer": "Macquarie / Up Bank / Australian CDR Platform",
        "roleTitle": "Mid-Level Backend Engineer — Consumer Data Right (CDR) Consent Gateway",
        "challengeTitle": "Consumer Data Right (CDR) Consent Life-Cycle Gateway",
        "domain": "Consumer Data Right & Open Banking",
        "sfiaLevel": 3,
        "injectedTrap": "AI generates consent validation that permits soft-deleted/expired consent tokens and logs customer BSB/account numbers.",
        "requirements": [
            {
                "category": "PROBLEM_FRAMING",
                "statement": "Interrogates statutory CDR rules (ACCC / OAIC rules) for consent states and data cluster boundaries before implementation.",
                "weight": 15,
                "signals": ["Verifies CDR consent states (ACTIVE, REVOKED, EXPIRED) with AI assistant.", "Scopes required data clusters (customer, account, transaction) explicitly."],
                "failures": ["Builds a generic OAuth token gate without checking ACCC Consumer Data Right requirements."]
            },
            {
                "category": "TECHNICAL_APPROACH",
                "statement": "Constructs decoupled policy enforcement and authorization middleware with robust transactional database states.",
                "weight": 15,
                "signals": ["Implements explicit middleware checking consent expiry and scope permissions.", "Ensures idempotent consent revocation endpoints."],
                "failures": ["Stores consent as mutable boolean flag on user records without audit history."]
            },
            {
                "category": "AI_DIRECTION",
                "statement": "Guides AI assistant through incremental implementation: schema definition, consent state transition table, then API routes.",
                "weight": 15,
                "signals": ["Directs AI through explicit state machine transitions.", "Instructs AI on exact HTTP status codes (401 vs 403 vs 410 Gone for expired consents)."],
                "failures": ["Asks AI to build open banking gateway in one shot without state transition tests."]
            },
            {
                "category": "CRITICAL_JUDGMENT",
                "statement": "Catches and eliminates security traps: stale consent token reuse and unmasked banking account numbers in logs.",
                "weight": 20,
                "signals": ["Catches missing expiration check on active consents and enforces automated expiry.", "Redacts BSB and account numbers in audit logs."],
                "failures": ["Allows REVOKED or EXPIRED consents to access banking transaction data.", "Logs full Australian bank account details in plain text."]
            },
            {
                "category": "TRADEOFF_AWARENESS",
                "statement": "Weighs latency and consistency trade-offs of distributed Redis caching vs database reads for consent verification.",
                "weight": 10,
                "signals": ["Explains why strong consistency is required when revoking data access.", "Discusses cache invalidation strategies across distributed gateway instances."],
                "failures": ["Considers eventual consistency acceptable for instantaneous legal consent revocation."]
            },
            {
                "category": "DOMAIN_FIT",
                "statement": "Demonstrates authentic grasp of CDR terminology: ADR (Accredited Data Recipient), Data Clusters, FDX/CDR Standards.",
                "weight": 15,
                "signals": ["Uses exact Australian Consumer Data Right terminology (ADR, CDR Rules, Data Holder).", "Structures responses according to Consumer Data Standards payload schemas."],
                "failures": ["Uses generic GDPR or Open Banking UK terminology interchangeably with Australian CDR."]
            },
            {
                "category": "COMMUNICATION",
                "statement": "Produces clear consent life-cycle documentation and audit runbooks for regulatory compliance inspection.",
                "weight": 10,
                "signals": ["Documents consent state transition machine clearly with diagram/flow.", "Outlines exact data retention and disposal schedules upon consent revocation."],
                "failures": ["Omits documentation on how revoked consents are purged."]
            }
        ]
    },
    {
        "id": "verified-talentai-screener",
        "employer": "TalentAI / Fair Hiring Systems",
        "roleTitle": "Full-Stack Engineer — AI Resume Screener & Bias Filter",
        "challengeTitle": "AI Candidate Evaluation & Bias Mitigation Workbench",
        "domain": "Applied AI & Fair Hiring",
        "sfiaLevel": 2,
        "injectedTrap": "AI includes protected attributes (age, gender, graduation year) in ranking heuristics and leaks applicant PII in client bundles.",
        "requirements": [
            {
                "category": "PROBLEM_FRAMING",
                "statement": "Clarifies fair hiring boundaries, protected demographic attributes, and evidence-first scoring dimensions before building.",
                "weight": 15,
                "signals": ["Verifies that candidate names, gender, and university pedigree must be scrubbed.", "Demands evidence-based citation requirements before matching resumes."],
                "failures": ["Accepts a black-box LLM ranking score without auditing demographic bias."]
            },
            {
                "category": "TECHNICAL_APPROACH",
                "statement": "Implements clean PII redaction pipeline and deterministic rubric scoring decoupled from raw AI completions.",
                "weight": 15,
                "signals": ["Creates pure regex/tokenizer redaction filter before sending text to evaluators.", "Enforces deterministic rubric criteria with verifiable citation snippets."],
                "failures": ["Sends raw unredacted resume PDF text directly to third-party AI APIs."]
            },
            {
                "category": "AI_DIRECTION",
                "statement": "Guides the AI assistant with iterative prompt engineering and schema constraints to produce structured evidence citations.",
                "weight": 15,
                "signals": ["Supplies strict JSON schema specifying score, evidence quote, and turn reference.", "Iterates on edge cases where candidate resumes omit standard date formats."],
                "failures": ["Prompts AI with 'score these candidates from 1 to 100' without rubric criteria."]
            },
            {
                "category": "CRITICAL_JUDGMENT",
                "statement": "Identifies and eliminates planted bias traps: graduation year filtering, name proxy bias, and unredacted PII.",
                "weight": 20,
                "signals": ["Catches graduation year heuristic as an age discrimination proxy and removes it.", "Verifies that gendered pronouns and ethnic names are masked before ranking."],
                "failures": ["Permits age-biased graduation date filters or unmasked demographic fields."]
            },
            {
                "category": "TRADEOFF_AWARENESS",
                "statement": "Evaluates trade-offs between heuristic keyword matching vs semantic vector embeddings for fair talent screening.",
                "weight": 10,
                "signals": ["Discusses semantic search drift vs keyword bias in ATS resume parsing.", "Analyzes false-negative risks for non-traditional career transitioners."],
                "failures": ["Assumes AI embeddings are inherently objective and free of historical societal bias."]
            },
            {
                "category": "DOMAIN_FIT",
                "statement": "Adheres to Australian Fair Work Act and EEOC anti-discrimination guidelines in hiring algorithms.",
                "weight": 15,
                "signals": ["Cites Fair Work Act 2009 protected attributes (age, race, sex, disability).", "Ensures all assessment metrics map to bona fide occupational requirements."],
                "failures": ["Includes non-job-related attributes in applicant scoring matrices."]
            },
            {
                "category": "COMMUNICATION",
                "statement": "Creates transparent audit explanations for candidate hiring decisions accessible to hiring managers and applicants.",
                "weight": 10,
                "signals": ["Generates human-readable feedback cards with cited job requirement matches.", "Provides actionable development recommendations for unsuccessful candidates."],
                "failures": ["Provides opaque rejection scores without explanatory rationale."]
            }
        ]
    },
    {
        "id": "verified-tgd-rts-sim",
        "employer": "Total Game Development",
        "roleTitle": "Junior AI & Simulation Systems Developer (Web / RTS)",
        "challengeTitle": "Deterministic RTS Simulation Engine & Spatial Hash Grid",
        "domain": "Game Simulation & RTS Engine",
        "sfiaLevel": 2,
        "injectedTrap": "AI implements variable frame delta-time accumulation (x += speed * dt) causing tick drift, O(N^2) pairwise proximity loops, and in-place coordinate mutations during iteration.",
        "requirements": [
            {
                "category": "PROBLEM_FRAMING",
                "statement": "Scopes fixed-step accumulator requirements, spatial hash boundaries, and state isolation before generating simulation code.",
                "weight": 15,
                "signals": ["Candidate asks AI to verify 20Hz (50ms) simulation interval vs requestAnimationFrame rendering.", "Candidate establishes spatial partitioning requirements before proximity query implementation."],
                "failures": ["Accepts variable frame delta updates without questioning multiplayer synchronization.", "Allows AI to use O(N^2) pairwise loops without indexing."]
            },
            {
                "category": "TECHNICAL_APPROACH",
                "statement": "Designs decoupled simulation loop, spatial hash grid, and double-buffered entity state buffers.",
                "weight": 15,
                "signals": ["Implements fixed 50ms accumulator loop (while accumulator >= 50ms).", "Separates entity state updates from 60fps canvas draw calls."],
                "failures": ["Mutates entity positions directly inside active iteration loop.", "Tangles canvas rendering calls directly inside simulation tick logic."]
            },
            {
                "category": "AI_DIRECTION",
                "statement": "Directs the AI assistant in structured stages: Accumulator Clock -> Spatial Grid -> Entity State Machine -> Canvas Renderer.",
                "weight": 15,
                "signals": ["Directs AI in small verifiable steps with concrete performance benchmarks.", "Instructs AI to avoid variable dt multiplication inside deterministic logic."],
                "failures": ["Requests entire RTS simulation in a single prompt and accepts unverified output."]
            },
            {
                "category": "CRITICAL_JUDGMENT",
                "statement": "Catches and refactors planted AI traps: floating-point tick drift, O(N^2) pairwise proximity checks, and in-place coordinate mutations.",
                "weight": 20,
                "signals": ["Catches variable frame dt and enforces fixed 50ms accumulator clamping.", "Catches O(N^2) all-pairs scan and replaces with spatial hash grid bucket lookup.", "Catches in-place mutation and enforces double-buffered nextState isolation."],
                "failures": ["Allows frame-rate dependent simulation speed and O(N^2) lag under load."]
            },
            {
                "category": "TRADEOFF_AWARENESS",
                "statement": "Articulates performance tradeoffs between spatial hash cell sizes vs bucket allocation overhead under varying entity densities.",
                "weight": 10,
                "signals": ["Explains how spatial cell size affects query performance and memory footprint.", "Discusses render interpolation tradeoffs between simulation ticks."],
                "failures": ["Claims spatial partitioning has no memory overhead or ignores cache locality."]
            },
            {
                "category": "DOMAIN_FIT",
                "statement": "Conforms to RTS networking and simulation conventions (lockstep determinism, 20Hz ticks, state snapshots).",
                "weight": 15,
                "signals": ["Uses authentic simulation concepts (accumulator, tick budget, spatial partitioning, snapshot).", "Ensures simulation state can be serialized deterministically for replay."],
                "failures": ["Treats simulation loop as simple CSS/DOM animation without fixed-time steps."]
            },
            {
                "category": "COMMUNICATION",
                "statement": "Documents frame budgets, tick rates, and spatial indexing invariants clearly for game engine architecture review.",
                "weight": 10,
                "signals": ["Provides clear documentation on tick rates, accumulator clamping, and spatial cell dimensions.", "Writes clean unit tests demonstrating deterministic coordinate progression."],
                "failures": ["Leaves simulation loop undocumented with arbitrary magic numbers."]
            }
        ]
    },
    {
        "id": "verified-aegis-lending-risk",
        "employer": "Aegis Risk Analytics",
        "roleTitle": "Junior Protocol Risk & Verifiable Telemetry Engineer",
        "challengeTitle": "P2P Lending Protocol Risk Engine & Telemetry Chain",
        "domain": "DeFi Risk Simulation & Protocol Invariants",
        "sfiaLevel": 2,
        "injectedTrap": "AI implements health factor using (collateral * price) / debt floats, ignores updatedAt staleness, and mutates protocol reserves in-place during batch loops.",
        "requirements": [
            {
                "category": "PROBLEM_FRAMING",
                "statement": "Scopes fixed-point data types (Wad/Ray, BPS), oracle heartbeat limits, and liquidation invariants before requesting implementation code.",
                "weight": 15,
                "signals": ["Candidate confirms bigint / Wad 18-decimal representations for collateral and debt with the AI assistant.", "Candidate explicitly establishes the oracle staleness boundary condition before implementing pricing logic."],
                "failures": ["Accepts standard JavaScript floating-point numbers without questioning financial rounding precision."]
            },
            {
                "category": "TECHNICAL_APPROACH",
                "statement": "Implements decoupled, modular fixed-point calculation utilities, stale oracle guards, and atomic liquidation handlers.",
                "weight": 15,
                "signals": ["Creates dedicated pure helper functions for Wad multiplication and division (mulWad, divWad).", "Separates oracle validation logic from account position state mutation."],
                "failures": ["Blends pricing math, validation, and in-place array mutation into an untestable monolithic function."]
            },
            {
                "category": "AI_DIRECTION",
                "statement": "Directs the AI assistant in staged phases (Schema -> Fixed-Point Math Lib -> Oracle Freshness -> Liquidation Loop -> Hash Chain) with precise numerical constraints.",
                "weight": 15,
                "signals": ["Prompts the assistant with specific constraints on integer division order (multiply before divide) to prevent precision truncation.", "Instructs AI to handle edge cases like zero debt or zero collateral safely."],
                "failures": ["Issues a generic prompt like 'build the DeFi lending risk engine' and commits uninspected output."]
            },
            {
                "category": "CRITICAL_JUDGMENT",
                "statement": "Catches and rejects planted AI traps: floating-point IEEE-754 division, unvalidated oracle staleness, and non-atomic cascade mutations.",
                "weight": 20,
                "signals": ["Catches floating-point division and directs AI to use fixed-point BigInt Wad math.", "Catches missing staleness check and enforces StalePriceFeedException when elapsed time exceeds heartbeat.", "Catches in-place mutation and enforces atomic snapshot rollback if a liquidation fails."],
                "failures": ["Allows floating-point rounding errors and unvalidated oracle feeds to reach production risk code."]
            },
            {
                "category": "TRADEOFF_AWARENESS",
                "statement": "Articulates computational tradeoffs of fixed-point integer math and gas/compute costs of cryptographic state verification.",
                "weight": 10,
                "signals": ["Explains why integer basis points prevent financial arbitrage and truncation vulnerabilities.", "Compares sequential SHA-256 hash chains versus sparse Merkle tree generation for telemetry logging."],
                "failures": ["Dismisses floating point drift as negligible or claims precision loss does not affect protocol solvency."]
            },
            {
                "category": "DOMAIN_FIT",
                "statement": "Adheres to peer-to-peer lending and decentralized protocol risk conventions (Health Factor thresholds, oracle heartbeats, bad debt prevention).",
                "weight": 15,
                "signals": ["Properly defines liquidation criteria (HF < 1.0) and correctly applies liquidation discount bonuses.", "Guarantees that protocol reserves never drop below zero under cascade liquidations."],
                "failures": ["Treats liquidations as simple balance deductions without calculating bad-debt socialisation or collateral ratios."]
            },
            {
                "category": "COMMUNICATION",
                "statement": "Documents risk parameters, arithmetic assumptions, and audit invariants clearly for protocol governance and peer review.",
                "weight": 10,
                "signals": [
                    "Provides clear inline documentation of Wad scaling factors, basis point math, and liquidation threshold formulas.",
                    "Structures risk engine audit logs and state commit events for telemetry verification."
                ],
                "failures": ["Leaves code undocumented with magic numbers and obscure arithmetic shifts."]
            }
        ]
    },
    {
        "id": "verified-apex-subscription-billing",
        "employer": "Apex Marketplace Infrastructure",
        "roleTitle": "Junior Full-Stack Integration & Billing Engineer",
        "challengeTitle": "Idempotent Subscription Webhook Reconciler & SRE Metrics Dashboard",
        "domain": "Marketplace Infrastructure & Subscription Billing",
        "sfiaLevel": 2,
        "injectedTrap": "AI implements webhook handler without checking eventId (causing double-billing on retries), uses price * 0.1 float arithmetic for GST, and wraps logic in try/catch returning 200 OK while swallowing exceptions.",
        "requirements": [
            {
                "category": "PROBLEM_FRAMING",
                "statement": "Scopes idempotency guarantees, out-of-order webhook delivery, and integer cent representations before requesting implementation code.",
                "weight": 15,
                "signals": ["Candidate confirms idempotency key storage and verifies that currency calculations will be in integer AUD cents.", "Candidate queries the AI assistant regarding out-of-order webhook delivery handling and subscription state boundaries."],
                "failures": ["Accepts standard float math without questioning financial rounding drift.", "Asks AI to generate an unvalidated monolithic webhook handler in a single prompt."]
            },
            {
                "category": "TECHNICAL_APPROACH",
                "statement": "Designs decoupled webhook intake, subscription state machine, integer GST math, and SRE telemetry collectors.",
                "weight": 15,
                "signals": ["Separates webhook transport parsing, state transition logic, and metrics collectors into distinct modular components.", "Builds pure helper functions for proration and 10% Australian GST calculation."],
                "failures": ["Couples HTTP request handling, database mutations, and UI state into an untestable monolithic function."]
            },
            {
                "category": "AI_DIRECTION",
                "statement": "Directs the AI assistant in staged phases (Schema -> Idempotency Store -> GST Math -> State Transitions -> SRE Dashboard) with explicit edge-case assertions.",
                "weight": 15,
                "signals": ["Directs the assistant step-by-step: first establishing schemas and unit tests for duplicate event delivery, then writing state machine handlers.", "Instructs the AI to differentiate transient 500 errors from deterministic 400 errors."],
                "failures": ["Issues a generic prompt like 'write a subscription billing webhook service' and blindly accepts unverified code."]
            },
            {
                "category": "CRITICAL_JUDGMENT",
                "statement": "Identifies and refactors planted AI traps: non-idempotent webhook retries (double-billing), floating-point proration/GST calculations, and swallowed exceptions.",
                "weight": 20,
                "signals": ["Catches missing idempotency check and enforces eventId deduplication guard before applying state changes.", "Catches raw float math (0.1) and enforces integer cent arithmetic for Australian GST and proration.", "Catches swallowed exceptions and refactors to return HTTP 500 on transient failures while emitting structured logs with traceId."],
                "failures": ["Allows duplicate webhook delivery to double-bill merchants or extend subscriptions twice.", "Leaves IEEE-754 float drift in financial balances or swallows database errors with silent 200 OK responses."]
            },
            {
                "category": "TRADEOFF_AWARENESS",
                "statement": "Articulates operational SRE tradeoffs between synchronous webhook acknowledgment versus asynchronous job queues and at-least-once delivery semantics.",
                "weight": 10,
                "signals": ["Explains why idempotency keys are mandatory under at-least-once network delivery models.", "Compares in-memory deduplication cache TTL versus transactional database persistence under high webhook throughput."],
                "failures": ["Assumes webhooks are delivered strictly in order and exactly once without retry headers."]
            },
            {
                "category": "DOMAIN_FIT",
                "statement": "Conforms to Australian marketplace billing patterns (AUD integer cents, 10% GST reporting, merchant subscription lifecycle states).",
                "weight": 15,
                "signals": ["Enforces valid state machine transitions (PENDING -> ACTIVE -> PAST_DUE -> CANCELLED).", "Calculates 10% GST on taxable merchant plan amounts in integer cents with correct half-cent rounding."],
                "failures": ["Uses US tax terminology or permits invalid subscription state transitions (e.g. CANCELLED -> ACTIVE without reactivation event)."]
            },
            {
                "category": "COMMUNICATION",
                "statement": "Documents webhook API contracts, error recovery runbooks, and SRE telemetry metrics clearly for engineering and support teams.",
                "weight": 10,
                "signals": [
                    "Provides clear docstrings explaining webhook retry semantics, HTTP status code contracts (200, 400, 409, 500), and SLI calculations.",
                    "Documents error recovery runbooks and subscription state transition invariants clearly for engineering handoff."
                ],
                "failures": ["Leaves webhook integration undocumented with unexplained status codes and silent failure behaviors."]
            }
        ]
    },
    {
        "id": "verified-aegis-agent-security-gate",
        "employer": "Aegis Cloud Defense",
        "roleTitle": "Junior Cloud Security & Agent Governance Engineer",
        "challengeTitle": "Zero Trust Agent Execution Boundary Proxy & Audit Trail",
        "domain": "Zero Trust Security & AI Agent Governance",
        "sfiaLevel": 2,
        "injectedTrap": "AI defaults to return { allowed: true } on unknown tools or catch blocks, checks file paths with naive path.startsWith(), and logs audit trails using generic console.log() without timestamps or integrity chaining.",
        "requirements": [
            {
                "category": "PROBLEM_FRAMING",
                "statement": "Scopes the Zero Trust threat model, fail-closed policy contract, path canonicalization, and human approval boundaries before requesting implementation code.",
                "weight": 15,
                "signals": ["Candidate confirms default-deny architecture for all unspecified tools with the AI assistant.", "Candidate queries the AI regarding path traversal vulnerabilities and canonical sandbox boundaries."],
                "failures": ["Accepts a default-allow architecture or asks AI to generate a single permissive proxy without threat modeling."]
            },
            {
                "category": "TECHNICAL_APPROACH",
                "statement": "Designs decoupled policy evaluation middleware, canonical path validators, approval escalation gate, and cryptographic hash-chain logger.",
                "weight": 15,
                "signals": ["Separates policy rule evaluation, path canonicalization, approval verification, and cryptographic audit hashing into modular units.", "Uses path.resolve() and strict boundary prefix checks (sandboxRoot + path.sep)."],
                "failures": ["Blends tool execution, security checks, and logging into an untestable monolithic function.", "Uses naive string prefix checks (startsWith) without resolving relative dots."]
            },
            {
                "category": "AI_DIRECTION",
                "statement": "Directs the AI assistant in staged phases (Policy Schema -> Path Sanitization -> Default-Deny Gate -> Approval Flow -> Hash-Chain Audit Logger).",
                "weight": 15,
                "signals": ["Prompts the assistant step-by-step: first establishing schemas and negative tests for path traversal, then writing fail-closed evaluation logic.", "Explicitly instructs the AI to handle malformed inputs, unknown tools, and traversal edge cases."],
                "failures": ["Issues a generic prompt like 'make a tool security wrapper' and commits unverified code."]
            },
            {
                "category": "CRITICAL_JUDGMENT",
                "statement": "Catches and refactors planted AI traps: fail-open exception handling, naive string path traversal escapes, and mutable unverified audit logs.",
                "weight": 20,
                "signals": ["Catches fail-open fallback and enforces strict default-deny throwing SecurityPolicyViolationException.", "Catches naive string path matching and enforces path.resolve() containment within sandboxRoot.", "Catches console.log audit trail and implements append-only SHA-256 hash chaining (prevHash + entryHash)."],
                "failures": ["Allows unknown tools or malformed payloads to bypass security checks.", "Leaves path traversal vulnerability open, allowing relative escapes like /../../etc/passwd."]
            },
            {
                "category": "TRADEOFF_AWARENESS",
                "statement": "Articulates security tradeoffs between synchronous policy evaluation latency versus agent throughput, and why autonomous agents must not self-authorize high-risk actions.",
                "weight": 10,
                "signals": ["Explains why defense-in-depth and fail-closed architectures prevent autonomous lateral movement even if the upstream LLM is prompt-injected.", "Compares cryptographic hash chain verification overhead against database append latency."],
                "failures": ["Dismisses path traversal risks as theoretical or claims default-allow is acceptable for internal tools."]
            },
            {
                "category": "DOMAIN_FIT",
                "statement": "Conforms to NIST Cybersecurity Framework Zero Trust principles and enterprise agent governance standards (least privilege, continuous verification, tamper resistance).",
                "weight": 15,
                "signals": ["Employs authentic Zero Trust vocabulary (default-deny, least-privilege, root jail, cryptographic provenance).", "Correctly classifies destructive versus non-destructive actions for human approval escalation."],
                "failures": ["Relies on LLM self-policing instead of deterministic runtime guardrails."]
            },
            {
                "category": "COMMUNICATION",
                "statement": "Documents security policy syntax, error response codes, and audit verification procedures clearly for security operations (SecOps) and compliance auditors.",
                "weight": 10,
                "signals": [
                    "Provides clear docstrings detailing policy evaluation logic, human approval escalation protocol, and cryptographic hash verification.",
                    "Writes structured error recovery runbooks for security operations and audit log verification."
                ],
                "failures": ["Leaves security policies undocumented or omits recovery steps for blocked requests."]
            }
        ]
    }
]

# -----------------------------------------------------------------------------
# 2. LOAD 50 IMPORTED JDs AND GENERATE RICH REQUIREMENTS
# -----------------------------------------------------------------------------
def load_imported_jds():
    with open("data/imported_jds.json", "r") as f:
        return json.load(f)

# Domain-specific bug archetypes & rubric templates
DOMAIN_TEMPLATES = {
    "frontend": {
        "trap": "AI omits window.devicePixelRatio scaling causing blurry canvas rendering, attaches uncleaned window resize event listeners causing memory leaks, and permits negative dimensions resulting in NaN bounding boxes.",
        "framing": "Scopes viewport coordinate transformations, DPI scaling boundaries, and DOM lifecycle cleanup before asking for UI component implementations.",
        "technical": "Implements pure geometric transformation math decoupled from React component rendering and context state.",
        "direction": "Directs AI in phased increments: affine transform math -> coordinate bounds tests -> RAF render loop -> interactive handles.",
        "judgment": "Catches blurry canvas rendering on high-DPI screens, uncleaned event listeners, and NaN coordinate drift.",
        "tradeoff": "Articulates trade-offs of WebGL vs Canvas2D vs SVG rendering pipelines for high-element interactive boards.",
        "domain": "Adheres to modern frontend performance conventions: 60fps budgets, requestAnimationFrame batching, and sub-pixel snapping.",
        "communication": "Documents coordinate space contracts (screen space vs world space) and component lifecycle constraints clearly."
    },
    "fintech": {
        "trap": "AI calculates financial amounts using IEEE-754 floating-point division (cents / 100), defaults to USD currency formatting, and leaks unmasked customer account identifiers in logs.",
        "framing": "Establishes integer cent arithmetic, Australian tax/currency statutory invariants, and PII masking rules before requesting calculation code.",
        "technical": "Implements pure financial calculation functions with exact integer cent math, strict balance guards, and immutable ledger entries.",
        "direction": "Guides the AI assistant with iterative tests for half-cent statutory rounding, negative underflows, and edge-case currency boundaries.",
        "judgment": "Detects and refactors floating-point division drift, foreign currency defaults, and plain text identity leaks in audit output.",
        "tradeoff": "Weighs computational overhead and dependency risks of big.js/decimal libraries against native BigInt integer cents.",
        "domain": "Conforms strictly to Australian financial regulations, double-entry bookkeeping invariants, and statutory reporting rules.",
        "communication": "Documents ledger transaction invariants, precision rounding rules, and audit trail schemas clearly for financial compliance."
    },
    "security": {
        "trap": "AI defaults to allow-all permissions on unknown input, uses naive path.startsWith() vulnerable to directory traversal (../../etc/passwd), and logs sensitive credentials in plain text.",
        "framing": "Scopes the threat model, zero-trust perimeter, fail-closed access controls, and path canonicalization before writing code.",
        "technical": "Constructs decoupled authorization middleware, path containment guards (path.resolve), and cryptographic audit pipelines.",
        "direction": "Directs AI through layered security tests: input fuzzing, traversal attempts, unhandled exception containment, and audit integrity.",
        "judgment": "Catches fail-open exception fallbacks, path traversal vulnerabilities, and unauthenticated administrative operations.",
        "tradeoff": "Analyzes security enforcement latency vs throughput overhead in real-time request proxy gateways.",
        "domain": "Adheres to Zero Trust architecture, NIST cybersecurity guidelines, and principle of least privilege.",
        "communication": "Documents access control policies, threat mitigation runbooks, and security incident response schemas clearly."
    },
    "distributed": {
        "trap": "AI implements non-idempotent event consumption resulting in duplicate record processing on retries, uses unjittered exponential backoff causing retry storms, and swallows network timeouts.",
        "framing": "Establishes at-least-once delivery semantics, idempotency key requirements, and distributed race conditions before coding.",
        "technical": "Designs resilient message consumer with deduplication cache, transactional outbox pattern, and graceful error handling.",
        "direction": "Directs AI in staged phases: event schema validation -> idempotency guard -> state transition -> telemetry metrics.",
        "judgment": "Catches duplicate event processing vulnerabilities, lack of retry backoff jitter, and swallowed network exceptions.",
        "tradeoff": "Evaluates tradeoffs between synchronous distributed transactions (2PC) vs saga patterns and eventual consistency.",
        "domain": "Follows modern distributed systems patterns: circuit breaking, structured tracing, and dead-letter queueing.",
        "communication": "Documents message schemas, idempotency contracts, and distributed failure recovery runbooks clearly."
    },
    "cloud_sre": {
        "trap": "AI hardcodes unbounded metric label cardinality causing memory leaks, ignores connection pool exhaustion under load, and logs credentials in telemetry.",
        "framing": "Scopes resource limits, connection pooling constraints, metric cardinality boundaries, and health check contracts before coding.",
        "technical": "Implements decoupled telemetry emitters, bounded ring buffers, connection leak guards, and structured SLI/SLO collectors.",
        "direction": "Directs AI to implement automated backpressure, graceful shutdown signals, and health check probes systematically.",
        "judgment": "Catches unbounded metric label growth, dangling database connections, and silent background process failures.",
        "tradeoff": "Weighs high-frequency telemetry resolution costs against cloud network egress and metric storage budgets.",
        "domain": "Adheres to Site Reliability Engineering (SRE) principles: error budgets, four golden signals, and resilient circuit breakers.",
        "communication": "Documents monitoring alert runbooks, metric naming standards, and incident escalation procedures clearly."
    },
    "simulation": {
        "trap": "AI implements variable frame delta-time accumulation (x += speed * dt) causing tick drift, O(N^2) pairwise proximity loops, and in-place coordinate mutations during iteration.",
        "framing": "Scopes fixed-step accumulator requirements, spatial hash boundaries, and state isolation before generating simulation code.",
        "technical": "Designs decoupled simulation loop, spatial hash grid, and double-buffered entity state buffers.",
        "direction": "Directs AI in structured stages: Accumulator Clock -> Spatial Grid -> Entity State Machine -> Canvas Renderer.",
        "judgment": "Catches variable frame dt drift, O(N^2) pairwise proximity checks, and in-loop coordinate mutations.",
        "tradeoff": "Articulates performance tradeoffs between spatial hash cell sizes vs bucket allocation overhead under varying entity densities.",
        "domain": "Conforms to RTS networking and simulation conventions: lockstep determinism, 20Hz ticks, and snapshot isolation.",
        "communication": "Documents frame budgets, tick rates, and spatial indexing invariants clearly for game engine architecture review."
    }
}

def classify_role_domain(role_title, domain_str, employer):
    text = f"{role_title} {domain_str} {employer}".lower()
    if any(k in text for k in ["game", "simulation", "rts", "physics"]):
        return "simulation"
    elif any(k in text for k in ["security", "governance", "detection", "cyber", "ciam", "identity"]):
        return "security"
    elif any(k in text for k in ["frontend", "ui", "craft", "design", "canvas", "visual", "web"]):
        return "frontend"
    elif any(k in text for k in ["payroll", "tax", "payments", "fintech", "banking", "fx", "liquidity", "investing", "brokerage", "billing"]):
        return "fintech"
    elif any(k in text for k in ["cloud", "devops", "reliability", "infrastructure", "sre", "platform engineer", "kubernetes", "network"]):
        return "cloud_sre"
    else:
        return "distributed"

def make_challenge_from_imported_jd(jd, idx):
    employer = jd["employer"]
    role_title = jd["roleTitle"]
    domain_str = jd.get("domain", "Software Engineering")
    domain_key = classify_role_domain(role_title, domain_str, employer)
    template = DOMAIN_TEMPLATES[domain_key]
    
    slug_emp = re.sub(r'[^a-z0-9]+', '-', employer.lower()).strip('-')
    slug_role = re.sub(r'[^a-z0-9]+', '-', role_title.lower()).strip('-')
    challenge_id = f"challenge-imported-{slug_emp}-{idx+1:02d}"
    
    # Infer SFIA level: senior/staff/principal = 3, otherwise 2
    lower_role = role_title.lower()
    sfia_level = 3 if any(s in lower_role for s in ["senior", "staff", "principal", "lead", "architect", "director"]) else 2
    
    challenge_title = f"{employer}: {role_title}"
    injected_trap = template["trap"]
    
    reqs = [
        {
            "category": "PROBLEM_FRAMING",
            "statement": f"{template['framing']} Specifically for {employer}'s {role_title} scope.",
            "weight": 15,
            "signals": [
                f"Candidate interrogates the domain invariants specific to {employer} before generating implementation code.",
                "Candidate explicitly establishes edge cases, data types, and non-goals with the AI assistant."
            ],
            "failures": [
                "Accepts generic boilerplate implementation without verifying domain-specific constraints.",
                "Directs the AI to generate an all-in-one solution without scoping requirements."
            ]
        },
        {
            "category": "TECHNICAL_APPROACH",
            "statement": f"{template['technical']} Tailored to {domain_str} requirements.",
            "weight": 15,
            "signals": [
                "Implements modular, strongly typed interfaces isolating core business logic from I/O boundaries.",
                "Creates robust pure functions with deterministic unit test coverage."
            ],
            "failures": [
                "Blends data access, business logic, and UI concerns into an untestable monolithic function.",
                "Uses loose 'any' typing across critical domain structures."
            ]
        },
        {
            "category": "AI_DIRECTION",
            "statement": f"{template['direction']} Emphasizing disciplined engineering over superficial speed.",
            "weight": 15,
            "signals": [
                "Guides the AI in structured iterations: contracts -> pure logic -> edge-case unit tests -> integration.",
                "Provides constructive, corrective feedback when the AI omits boundary conditions."
            ],
            "failures": [
                "Submits vague, one-line prompts and rubber-stamps code without inspection.",
                "Allows the AI to introduce unrequested complexity or dependencies."
            ]
        },
        {
            "category": "CRITICAL_JUDGMENT",
            "statement": f"{template['judgment']} Planted defect: {injected_trap}",
            "weight": 20,
            "signals": [
                "Audits the AI diff carefully, catches the planted vulnerability or precision defect, and demands a refactor.",
                "Verifies that the refactored implementation satisfies all safety and precision invariants."
            ],
            "failures": [
                "Fails to catch the deliberate AI bug, allowing corrupted state, security leaks, or precision drift into the codebase."
            ]
        },
        {
            "category": "TRADEOFF_AWARENESS",
            "statement": f"{template['tradeoff']} Contextualized to {employer}'s scale and operational profile.",
            "weight": 10,
            "signals": [
                f"Articulates concrete architectural trade-offs relevant to {domain_str}.",
                "Discusses operational implications: latency budgets, memory footprint, and maintainability."
            ],
            "failures": [
                "Dismisses trade-offs as negligible or treats architectural choices as having zero cost."
            ]
        },
        {
            "category": "DOMAIN_FIT",
            "statement": f"{template['domain']} Reflecting genuine industry practice at {employer}.",
            "weight": 15,
            "signals": [
                f"Applies standard industry nomenclature and conventions for {domain_str}.",
                "Ensures data representations and error formats conform to real-world standards."
            ],
            "failures": [
                "Uses out-of-context paradigms or violates fundamental domain security/accuracy requirements."
            ]
        },
        {
            "category": "COMMUNICATION",
            "statement": f"{template['communication']} Structured for production review and team handoff.",
            "weight": 10,
            "signals": [
                "Documents API contracts, invariant constraints, and error recovery protocols with clear docstrings.",
                "Provides clear setup and test execution instructions in workspace documentation."
            ],
            "failures": [
                "Leaves critical interfaces undocumented with unexplained magic numbers and silent failures."
            ]
        }
    ]
    
    return {
        "id": challenge_id,
        "employer": employer,
        "roleTitle": role_title,
        "challengeTitle": challenge_title,
        "domain": domain_str,
        "sfiaLevel": sfia_level,
        "injectedTrap": injected_trap,
        "requirements": reqs
    }

# -----------------------------------------------------------------------------
# 3. 43 ADDITIONAL PREMIER INDUSTRY CHALLENGES
# -----------------------------------------------------------------------------
ADDITIONAL_43_CHALLENGES = [
    {
        "id": "challenge-supabase-realtime-cdc",
        "employer": "Supabase",
        "roleTitle": "Senior Distributed Systems Engineer — Realtime CDC",
        "challengeTitle": "Postgres Realtime Change Data Capture & WebSocket Streamer",
        "domain": "Database Replication & Realtime Sync",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI implements WebSocket heartbeat timeout without unregistering Postgres CDC listener, causing database connection exhaustion and zombie worker threads."
    },
    {
        "id": "challenge-grafana-promql-streamer",
        "employer": "Grafana Labs",
        "roleTitle": "Senior Observability Engineer — Metric Streaming",
        "challengeTitle": "High-Throughput PromQL Range Query Stream Aggregator",
        "domain": "Metrics Telemetry & Timeseries Analytics",
        "sfiaLevel": 3,
        "domain_key": "cloud_sre",
        "trap": "AI calculates PromQL range step dynamically using unvalidated user input, leading to division by zero or NaN step intervals that hang aggregation workers."
    },
    {
        "id": "challenge-hashicorp-vault-lease",
        "employer": "HashiCorp",
        "roleTitle": "Senior Security Software Engineer — Vault Core",
        "challengeTitle": "Dynamic Secrets Lease Manager & Revocation Pipeline",
        "domain": "Cloud Security & Secrets Management",
        "sfiaLevel": 3,
        "domain_key": "security",
        "trap": "AI introduces a Time-of-Check to Time-of-Use (TOCTOU) race condition during concurrent lease renewal and revocation, allowing revoked tokens to read secrets."
    },
    {
        "id": "challenge-tyro-pos-terminal",
        "employer": "Tyro Payments",
        "roleTitle": "Senior Embedded / Backend Engineer — POS Gateways",
        "challengeTitle": "Merchant EFTPOS Terminal Protocol & Settlement Switch",
        "domain": "Point of Sale & Payments Infrastructure",
        "sfiaLevel": 3,
        "domain_key": "fintech",
        "trap": "AI omits ISO 8583 transaction sequence counter validation, allowing replayed offline settlement packets to double-credit merchant accounts."
    },
    {
        "id": "challenge-afterpay-fraud-velocity",
        "employer": "Afterpay / Block",
        "roleTitle": "Senior Fraud & Risk Analytics Engineer",
        "challengeTitle": "Real-Time BNPL Fraud Velocity & Installment Risk Engine",
        "domain": "BNPL & Risk Telemetry",
        "sfiaLevel": 3,
        "domain_key": "fintech",
        "trap": "AI divides total purchase amounts into 4 installments with raw float division, causing 1-cent rounding discrepancies that violate the zero-sum ledger invariant."
    },
    {
        "id": "challenge-cochlear-audio-dsp",
        "employer": "Cochlear",
        "roleTitle": "Senior Audio Systems Engineer — Bionic Ear DSP",
        "challengeTitle": "Low-Latency Polyphonic Filter Bank & Acoustic Processor",
        "domain": "Medical Devices & Audio DSP",
        "sfiaLevel": 3,
        "domain_key": "simulation",
        "trap": "AI implements digital biquad filter without clamping intermediate float registers, leading to integer overflow audio clipping and severe screech artifacts."
    },
    {
        "id": "challenge-resmed-apnea-telemetry",
        "employer": "ResMed",
        "roleTitle": "Senior Cloud Telemetry Engineer — Connected Care",
        "challengeTitle": "CPAP Device Telemetry Ingestion & Compliance Analyzer",
        "domain": "Digital Health & Medical Telemetry",
        "sfiaLevel": 3,
        "domain_key": "cloud_sre",
        "trap": "AI parses device timestamps using local machine timezone instead of patient UTC device offset, causing daytime apnea events to shift across day boundaries."
    },
    {
        "id": "challenge-jump-trading-orderbook",
        "employer": "Jump Trading",
        "roleTitle": "Ultra-Low Latency Systems Engineer — Market Data",
        "challengeTitle": "Nanosecond L2 Limit Order Book Matching Engine",
        "domain": "High-Frequency Trading & Market Data",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI implements order matching tie-breakers using non-deterministic array sorting instead of strict FIFO insertion order, violating price-time priority."
    },
    {
        "id": "challenge-optiver-volatility-spline",
        "employer": "Optiver",
        "roleTitle": "Quantitative Systems Engineer — Options Pricing",
        "challengeTitle": "Real-Time Volatility Surface Cubic Spline Interpolator",
        "domain": "Quantitative Finance & Derivatives",
        "sfiaLevel": 3,
        "domain_key": "fintech",
        "trap": "AI evaluates Black-Scholes implied volatility without validating strike > 0 and timeToExpiry > 0, producing NaN values that crash the quoting engine."
    },
    {
        "id": "challenge-imc-trading-etf-arb",
        "employer": "IMC Trading",
        "roleTitle": "High-Frequency Trading Engineer — Execution Systems",
        "challengeTitle": "Statistical Arbitrage Execution Gateway & Tick Synchronizer",
        "domain": "High-Frequency Trading & ETF Pricing",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI compares market timestamps without checking clock monotonicity, causing negative latency measurements and out-of-order tick drops during NTP adjustments."
    },
    {
        "id": "challenge-citadel-fix-gateway",
        "employer": "Citadel Securities",
        "roleTitle": "Senior Platform Engineer — Core Trading Gateways",
        "challengeTitle": "High-Throughput FIX Protocol Drop-Copy Streamer",
        "domain": "Trading Infrastructure & Protocol Gateways",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI maintains incoming FIX sequence numbers in an unbounded memory map without periodic checkpointing, causing OOM crashes after 1M trades."
    },
    {
        "id": "challenge-honeycomb-tracer",
        "employer": "Honeycomb.io",
        "roleTitle": "Senior Observability Platform Engineer",
        "challengeTitle": "High-Cardinality Distributed Trace Collector & Sampler",
        "domain": "Distributed Tracing & SRE Observability",
        "sfiaLevel": 3,
        "domain_key": "cloud_sre",
        "trap": "AI stores raw candidate user IDs as top-level indexing tags in OpenTelemetry spans, creating unbounded index cardinality that exhausts telemetry storage."
    },
    {
        "id": "challenge-vercel-isr-cache",
        "employer": "Vercel",
        "roleTitle": "Staff Edge Runtime Engineer — Next.js Infrastructure",
        "challengeTitle": "Incremental Static Regeneration (ISR) Cache Revalidator",
        "domain": "Edge Computing & Web Infrastructure",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI implements stale-while-revalidate without mutex locking or deduplication, triggering a thundering herd cache stampede against origin servers."
    },
    {
        "id": "challenge-retool-sandboxed-bridge",
        "employer": "Retool",
        "roleTitle": "Senior Frontend Security Engineer — Custom Components",
        "challengeTitle": "Sandboxed Iframe PostMessage Security Bridge",
        "domain": "Application Platform & Browser Sandboxing",
        "sfiaLevel": 3,
        "domain_key": "security",
        "trap": "AI sends postMessage payloads with targetOrigin '*' instead of verifying the exact parent domain, exposing private tenant query data to embedded listeners."
    },
    {
        "id": "challenge-github-webhook-queue",
        "employer": "GitHub",
        "roleTitle": "Senior Platform Engineer — Ecosystem Infrastructure",
        "challengeTitle": "Reliable Webhook Delivery & Fanout Queue",
        "domain": "Developer Platforms & Event Fanout",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI implements retry queues with fixed delays rather than exponential backoff with full jitter, causing synchronized retry storms against rate-limited endpoints."
    },
    {
        "id": "challenge-gitlab-ci-runner",
        "employer": "GitLab",
        "roleTitle": "Senior CI/CD Infrastructure Engineer",
        "challengeTitle": "Ephemeral Containerized Job Execution Orchestrator",
        "domain": "DevOps & Cloud Orchestration",
        "sfiaLevel": 3,
        "domain_key": "cloud_sre",
        "trap": "AI leaves dangling temporary volumes and bind-mount permissions when build jobs fail abruptly, causing host disk exhaustion and credential leakage."
    },
    {
        "id": "challenge-docker-cgroup-watcher",
        "employer": "Docker",
        "roleTitle": "Senior Systems Engineer — Runtime Platform",
        "challengeTitle": "Container Cgroup Memory & OOM Event Watcher",
        "domain": "Container Runtimes & Linux Internals",
        "sfiaLevel": 3,
        "domain_key": "cloud_sre",
        "trap": "AI parses cgroup v1 paths without fallback to cgroup v2 unified hierarchy, completely failing to detect OOM kill events on modern Linux kernels."
    },
    {
        "id": "challenge-elastic-index-sharder",
        "employer": "Elastic",
        "roleTitle": "Senior Search Systems Engineer — Core Lucene",
        "challengeTitle": "Distributed Inverted Index Sharding & Query Router",
        "domain": "Search Engines & Information Retrieval",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI calculates document segment ID offsets with signed 32-bit integers, causing negative document IDs and index corruption beyond 2 billion documents."
    },
    {
        "id": "challenge-snowflake-parquet-reader",
        "employer": "Snowflake",
        "roleTitle": "Senior Data Engine Developer — Columnar Formats",
        "challengeTitle": "High-Throughput Columnar Parquet File Decoder",
        "domain": "Data Warehousing & Cloud Database Engines",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI slices multi-byte UTF-8 string dictionary pages by raw byte offset instead of character boundaries, corrupting international multibyte text."
    },
    {
        "id": "challenge-twilio-webrtc-jitter",
        "employer": "Twilio",
        "roleTitle": "Senior Real-Time Media Engineer — Voice Platform",
        "challengeTitle": "WebRTC Adaptive Audio Jitter Buffer & Packet Reorderer",
        "domain": "Telecommunications & Real-Time Audio",
        "sfiaLevel": 3,
        "domain_key": "simulation",
        "trap": "AI handles 16-bit RTP sequence numbers without modulo 65536 rollover logic, causing the jitter buffer to permanently drop audio after sequence 65535."
    },
    {
        "id": "challenge-openai-token-bucket",
        "employer": "OpenAI / Scale AI",
        "roleTitle": "Senior API Infrastructure Engineer",
        "challengeTitle": "Distributed Token Bucket Rate Limiter & Concurrency Gate",
        "domain": "AI Infrastructure & API Gateways",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI updates token buckets with non-atomic read-then-write operations across Redis clusters, allowing massive burst requests to bypass rate caps."
    },
    {
        "id": "challenge-anthropic-prompt-cache",
        "employer": "Anthropic",
        "roleTitle": "Senior Inference Systems Engineer — Context Caching",
        "challengeTitle": "KV-Cache Replay & Prompt Deduplication Proxy",
        "domain": "LLM Inference & Caching Infrastructure",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI hashes prompt prefixes without Unicode NFKC normalization, resulting in 0% cache hit rates across identical prompts with varied character encodings."
    },
    {
        "id": "challenge-stan-hls-transmuxer",
        "employer": "Stan (Nine Entertainment)",
        "roleTitle": "Senior Video Streaming Engineer",
        "challengeTitle": "4K HLS Segment Transmuxer & Audio-Video Synchronizer",
        "domain": "Digital Media & Video Streaming",
        "sfiaLevel": 3,
        "domain_key": "simulation",
        "trap": "AI transmuxes audio and video streams without calculating Presentation Time Stamp (PTS) rollover, causing severe 2-second audio desync on mobile clients."
    },
    {
        "id": "challenge-woolworths-route-solver",
        "employer": "Woolworths Digital",
        "roleTitle": "Senior Logistics & Route Optimization Engineer",
        "challengeTitle": "Cold-Chain Grocery Delivery Vehicle Routing Solver",
        "domain": "Supply Chain & Route Optimization",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI calculates delivery transit duration across Sydney Daylight Saving Time changes without timezone offsets, leading to negative delivery windows."
    },
    {
        "id": "challenge-coles-iot-coldchain",
        "employer": "Coles Technology",
        "roleTitle": "Senior IoT Telemetry Engineer — Supply Chain",
        "challengeTitle": "Cold-Chain Refrigerator Sensor Ingestion & Alert Engine",
        "domain": "IoT Telemetry & Food Safety",
        "sfiaLevel": 2,
        "domain_key": "cloud_sre",
        "trap": "AI drops temperature sensor packets silently when values are below 0°C due to unsigned integer decoding, hiding critical freezer failures."
    },
    {
        "id": "challenge-telstra-mqtt-broker",
        "employer": "Telstra Purple",
        "roleTitle": "Senior IoT Systems Architect",
        "challengeTitle": "High-Concurrency MQTT Fleet Telemetry Broker",
        "domain": "IoT Messaging & Telecommunications",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI buffers unacknowledged QoS 1 messages in unbounded in-memory queues during cell tower outages, causing broker heap exhaustion under reconnection bursts."
    },
    {
        "id": "challenge-cba-payid-resolver",
        "employer": "Commonwealth Bank (CBA)",
        "roleTitle": "Senior Payments Platform Engineer — NPP",
        "challengeTitle": "Real-Time PayID Resolution & ISO 20022 Message Router",
        "domain": "Core Banking & Real-Time Payments",
        "sfiaLevel": 3,
        "domain_key": "fintech",
        "trap": "AI verifies Australian BSB numbers with simple 6-digit length checks, accepting reserved and invalid bank clearing codes into NPP settlement batches."
    },
    {
        "id": "challenge-nab-consent-revocation",
        "employer": "National Australia Bank (NAB)",
        "roleTitle": "Senior Open Banking Platform Engineer",
        "challengeTitle": "CDR Consent Lifecycle & Data Access Revocation Switch",
        "domain": "Open Banking & Financial Compliance",
        "sfiaLevel": 3,
        "domain_key": "security",
        "trap": "AI executes soft-deletes on revoked customer consents without propagating eviction signals to downstream OAuth gateways, allowing data leaks for 24 hours."
    },
    {
        "id": "challenge-westpac-payment-switch",
        "employer": "Westpac Group",
        "roleTitle": "Senior Core Banking Systems Engineer",
        "challengeTitle": "High-Availability Card Authorization & Payment Switch",
        "domain": "Retail Banking & Payment Orchestration",
        "sfiaLevel": 3,
        "domain_key": "fintech",
        "trap": "AI performs account balance checks and debit balance mutations in separate transactions without SELECT FOR UPDATE, causing double-spending on simultaneous ATM/EFTPOS taps."
    },
    {
        "id": "challenge-judo-bank-sme-risk",
        "employer": "Judo Bank",
        "roleTitle": "Senior Credit Risk & Quantitative Developer",
        "challengeTitle": "SME Commercial Loan Cash Flow & Stress Test Simulator",
        "domain": "Challenger Banking & Credit Modeling",
        "sfiaLevel": 3,
        "domain_key": "fintech",
        "trap": "AI calculates Debt Service Coverage Ratio (DSCR) with direct division without checking for zero EBITDA, causing unhandled division-by-zero crashes on distressed businesses."
    },
    {
        "id": "challenge-canva-magic-svg",
        "employer": "Canva",
        "roleTitle": "Senior Graphics Engineer — Magic Design",
        "challengeTitle": "Generative Vector Path Optimizer & SVG Sanitizer",
        "domain": "Computer Graphics & Design Automation",
        "sfiaLevel": 3,
        "domain_key": "frontend",
        "trap": "AI computes cubic Bezier curve derivatives without handling zero-length tangent vectors, producing NaN coordinate points that corrupt SVG path exports."
    },
    {
        "id": "challenge-cultureamp-diff-privacy",
        "employer": "Culture Amp",
        "roleTitle": "Senior Applied AI & Privacy Engineer",
        "challengeTitle": "Differential Privacy Noise Generator for Employee Surveys",
        "domain": "Differential Privacy & People Analytics",
        "sfiaLevel": 3,
        "domain_key": "security",
        "trap": "AI applies Laplace noise without enforcing a minimum cohort threshold (k < 5), allowing individual employee sentiment to be identified through mathematical subtraction."
    },
    {
        "id": "challenge-envato-watermark-stamper",
        "employer": "Envato",
        "roleTitle": "Senior Media Pipeline Developer",
        "challengeTitle": "Dynamic Watermarking & Digital Asset Protection Engine",
        "domain": "Digital Marketplaces & Media Processing",
        "sfiaLevel": 2,
        "domain_key": "frontend",
        "trap": "AI composites translucent watermark PNGs onto customer images without premultiplied alpha handling, leaving dark discolored halos around watermark text."
    },
    {
        "id": "challenge-safetyculture-checklist-sync",
        "employer": "SafetyCulture",
        "roleTitle": "Senior Distributed Data Engineer — Offline Sync",
        "challengeTitle": "Offline-First Inspection Audit State Synchronizer",
        "domain": "Workplace Safety & Mobile Offline Sync",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI uses client device clock timestamps for Last-Write-Wins conflict resolution, allowing offline phones with incorrect clocks to overwrite fresh inspection data."
    },
    {
        "id": "challenge-whispir-emergency-relay",
        "employer": "Whispir",
        "roleTitle": "Senior Telephony & Messaging Platform Engineer",
        "challengeTitle": "Multi-Carrier Emergency SMS Notification Dispatcher",
        "domain": "Critical Communications & Telephony Gateways",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI dispatches emergency SMS alerts without per-carrier rate limiting, triggering telecom carrier spam filters and causing message drops during bushfire evacuations."
    },
    {
        "id": "challenge-redballoon-voucher-escrow",
        "employer": "RedBalloon / Big Red Group",
        "roleTitle": "Senior E-Commerce Integration Engineer",
        "challengeTitle": "Experience Voucher Escrow & Fraud-Resistant Code Generator",
        "domain": "E-Commerce & Digital Vouchers",
        "sfiaLevel": 2,
        "domain_key": "fintech",
        "trap": "AI generates voucher validation codes using Math.random(), producing guessable sequential redemption codes that attackers can enumerate and drain."
    },
    {
        "id": "challenge-airtasker-milestone-escrow",
        "employer": "Airtasker",
        "roleTitle": "Senior Full-Stack Engineer — Marketplace Integrity",
        "challengeTitle": "Peer-to-Peer Task Milestone Escrow Settlement Engine",
        "domain": "Two-Sided Marketplaces & Gig Economy",
        "sfiaLevel": 2,
        "domain_key": "fintech",
        "trap": "AI releases task escrow funds on webhook delivery without verifying transaction state locks, allowing double-release of funds on rapid duplicate button clicks."
    },
    {
        "id": "challenge-atlassian-confluence-crdt",
        "employer": "Atlassian",
        "roleTitle": "Staff Software Engineer — Collaborative Editing",
        "challengeTitle": "Real-Time Collaborative Document CRDT Vector Clock Engine",
        "domain": "Collaborative Software & Concurrency",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI orders CRDT character insertions by local sequence number rather than causal vector clock comparisons, causing inverted character typing under high network latency."
    },
    {
        "id": "challenge-miro-whiteboard-quadtree",
        "employer": "Miro",
        "roleTitle": "Senior Canvas Architecture Developer",
        "challengeTitle": "Infinite Canvas QuadTree Spatial Indexer & Culling Engine",
        "domain": "Visual Collaboration & Infinite Canvas",
        "sfiaLevel": 3,
        "domain_key": "simulation",
        "trap": "AI partitions QuadTree nodes without a maximum depth limit when multiple sticky notes share identical coordinates, triggering an infinite recursive stack overflow."
    },
    {
        "id": "challenge-figma-boolean-clipper",
        "employer": "Figma",
        "roleTitle": "Senior Vector Engine Developer",
        "challengeTitle": "2D Vector Path Boolean Union & Difference Clipper",
        "domain": "Design Systems & Vector Geometry",
        "sfiaLevel": 3,
        "domain_key": "frontend",
        "trap": "AI evaluates polygon segment intersections using exact float equality (x1 == x2), failing on diagonal line overlaps and creating missing holes in exported shapes."
    },
    {
        "id": "challenge-procreate-webgl-shader",
        "employer": "Procreate / Savage Interactive",
        "roleTitle": "Senior Graphics Shader Developer",
        "challengeTitle": "WebGL Dual-Source Color Blending & Brush Shader",
        "domain": "Digital Illustration & GPU Shaders",
        "sfiaLevel": 3,
        "domain_key": "frontend",
        "trap": "AI blends RGB color values in non-linear sRGB space without linear gamma conversion, resulting in dark, muddy color fringes on overlapping brush strokes."
    },
    {
        "id": "challenge-webaudio-polyphony",
        "employer": "Ableton / RØDE Microphones",
        "roleTitle": "Senior Audio Systems Engineer",
        "challengeTitle": "Low-Latency Polyphonic Synthesizer Voice Allocator",
        "domain": "Audio DSP & Music Technology",
        "sfiaLevel": 2,
        "domain_key": "simulation",
        "trap": "AI allocates synthesizer voices without dynamic voice stealing, causing stuck audio drones when rapid MIDI note-off messages are dropped under buffer underruns."
    },
    {
        "id": "challenge-linear-git-sync",
        "employer": "Linear",
        "roleTitle": "Senior Systems Engineer — Sync Engine",
        "challengeTitle": "Offline-First Distributed Sync Engine & Tombstone Manager",
        "domain": "Developer Tools & Offline Systems",
        "sfiaLevel": 3,
        "domain_key": "distributed",
        "trap": "AI purges deletion tombstone markers immediately upon client disconnect, causing deleted project issues to be resurrected when the offline client reconnects."
    }
]

def make_challenge_from_additional(c_def):
    employer = c_def["employer"]
    role_title = c_def["roleTitle"]
    domain_str = c_def["domain"]
    domain_key = c_def.get("domain_key", "distributed")
    template = DOMAIN_TEMPLATES[domain_key]
    injected_trap = c_def["trap"]
    
    reqs = [
        {
            "category": "PROBLEM_FRAMING",
            "statement": f"{template['framing']} Specifically addressing {employer}'s {role_title} requirements.",
            "weight": 15,
            "signals": [
                f"Candidate scopes domain invariants, statutory constraints, and non-goals with the AI assistant for {employer}.",
                "Candidate clarifies data boundaries and failure modes before generating code."
            ],
            "failures": [
                "Begins coding without scoping domain constraints or establishing precision requirements.",
                "Submits vague prompt requesting generic implementation."
            ]
        },
        {
            "category": "TECHNICAL_APPROACH",
            "statement": f"{template['technical']} Grounded in {domain_str} architecture.",
            "weight": 15,
            "signals": [
                "Separates core business logic into pure, testable modules with strict typing.",
                "Implements comprehensive automated unit tests targeting boundary edge cases."
            ],
            "failures": [
                "Couples transport, business math, and side effects into an untestable monolithic function."
            ]
        },
        {
            "category": "AI_DIRECTION",
            "statement": f"{template['direction']} Guiding the assistant through disciplined iterations.",
            "weight": 15,
            "signals": [
                "Directs the AI in phased, verifiable steps rather than asking for the full application at once.",
                "Instructs the AI with explicit numerical and architectural constraints."
            ],
            "failures": [
                "Blindly copy-pastes AI suggestions without verifying invariants."
            ]
        },
        {
            "category": "CRITICAL_JUDGMENT",
            "statement": f"{template['judgment']} Injected canary trap: {injected_trap}",
            "weight": 20,
            "signals": [
                "Audits the AI diff carefully, detects the domain vulnerability, and forces an immediate refactor.",
                "Verifies that the refactored code passes all negative test cases."
            ],
            "failures": [
                "Fails to catch the deliberate bug, allowing critical errors to enter production."
            ]
        },
        {
            "category": "TRADEOFF_AWARENESS",
            "statement": f"{template['tradeoff']} Explicitly evaluating systems tradeoffs.",
            "weight": 10,
            "signals": [
                f"Articulates concrete architectural trade-offs relevant to {domain_str}.",
                "Evaluates performance vs complexity vs resource utilization."
            ],
            "failures": [
                "Ignores operational costs or claims chosen approach has no downsides."
            ]
        },
        {
            "category": "DOMAIN_FIT",
            "statement": f"{template['domain']} Consistent with {employer} standards.",
            "weight": 15,
            "signals": [
                f"Uses authentic industry terminology and patterns for {domain_str}.",
                "Respects domain-specific safety, compliance, or performance budgets."
            ],
            "failures": [
                "Violates standard industry conventions or uses superficial approximations."
            ]
        },
        {
            "category": "COMMUNICATION",
            "statement": f"{template['communication']} Written for cross-functional review.",
            "weight": 10,
            "signals": [
                "Documents architecture, error codes, and operational runbooks clearly.",
                "Provides clean inline documentation on non-obvious algorithms and formulas."
            ],
            "failures": [
                "Leaves code undocumented with obscure variables and unexplained error states."
            ]
        }
    ]
    
    return {
        "id": c_def["id"],
        "employer": employer,
        "roleTitle": role_title,
        "challengeTitle": f"{employer}: {c_def['challengeTitle']}",
        "domain": domain_str,
        "sfiaLevel": c_def["sfiaLevel"],
        "injectedTrap": injected_trap,
        "requirements": reqs
    }

# -----------------------------------------------------------------------------
# 4. MAIN BUILD PIPELINE
# -----------------------------------------------------------------------------
def build_curated_100():
    all_challenges = []
    
    # 1. Add 7 Verified Benchmark Challenges
    print(f"Adding {len(VERIFIED_CHALLENGES)} Verified Mentor/Judge Challenges...")
    all_challenges.extend(VERIFIED_CHALLENGES)
    
    # 2. Add 50 Imported JDs
    imported = load_imported_jds()
    print(f"Adding {len(imported)} Imported Real-World JDs...")
    for i, jd in enumerate(imported):
        all_challenges.append(make_challenge_from_imported_jd(jd, i))
        
    # 3. Add 43 Premier Industry Challenges
    print(f"Adding {len(ADDITIONAL_43_CHALLENGES)} Premier Industry Challenges...")
    for c_def in ADDITIONAL_43_CHALLENGES:
        all_challenges.append(make_challenge_from_additional(c_def))
        
    print(f"\nTotal Curated Challenges Assembled: {len(all_challenges)} (Target: 100)")
    assert len(all_challenges) == 100, f"Expected 100 challenges, got {len(all_challenges)}"
    
    # Build flat requirements export list
    dataset_records = []
    
    for ch in all_challenges:
        cid = ch["id"]
        ctitle = ch["challengeTitle"]
        emp = ch["employer"]
        role = ch["roleTitle"]
        sfia = ch["sfiaLevel"]
        
        reqs = ch["requirements"]
        assert len(reqs) == 7, f"Challenge {cid} must have exactly 7 requirements, got {len(reqs)}"
        
        for r_idx, r in enumerate(reqs):
            req_id = f"{cid}-req-{r_idx+1}"
            trap_val = ch["injectedTrap"] if r["category"] == "CRITICAL_JUDGMENT" else None
            
            dataset_records.append({
                "requirementId": req_id,
                "challengeId": cid,
                "challengeTitle": ctitle,
                "employer": emp,
                "roleTitle": role,
                "category": r["category"],
                "statement": r["statement"],
                "weight": r["weight"],
                "sfiaLevel": sfia,
                "injectedTrap": trap_val,
                "successSignals": r["signals"],
                "failureModes": r["failures"]
            })
            
    print(f"Total Requirements Generated: {len(dataset_records)} (Target: 700)")
    assert len(dataset_records) == 700, f"Expected 700 requirements, got {len(dataset_records)}"
    
    # 4. Extract the 100 Finest Clean Requirements (1 premier Critical Judgment & Planted Bug requirement per challenge)
    finest_100_records = [
        rec for rec in dataset_records 
        if rec["category"] == "CRITICAL_JUDGMENT"
    ]
    assert len(finest_100_records) == 100, f"Expected 100 finest requirements, got {len(finest_100_records)}"
    
    # 5. Save Primary JSON exports (100 Clean Requirements)
    json_path = os.path.join(DATA_EXPORT_DIR, "requirements-dataset.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(finest_100_records, f, indent=2)
    print(f"Wrote 100-Clean JSON dataset to: {json_path} ({os.path.getsize(json_path)} bytes)")

    json_100_path = os.path.join(DATA_EXPORT_DIR, "requirements-100.json")
    with open(json_100_path, "w", encoding="utf-8") as f:
        json.dump(finest_100_records, f, indent=2)

    # 6. Save Full 700 Requirements JSON export
    json_700_path = os.path.join(DATA_EXPORT_DIR, "requirements-dataset-all-700.json")
    with open(json_700_path, "w", encoding="utf-8") as f:
        json.dump(dataset_records, f, indent=2)
    print(f"Wrote Full 700-criteria JSON dataset to: {json_700_path}")

    # 7. Save Primary CSV exports (1 header + 100 rows = 101 lines)
    csv_path = os.path.join(DATA_EXPORT_DIR, "requirements-dataset.csv")
    csv_100_path = os.path.join(DATA_EXPORT_DIR, "requirements-100.csv")
    csv_headers = [
        "requirementId",
        "challengeId",
        "challengeTitle",
        "employer",
        "roleTitle",
        "category",
        "statement",
        "weight",
        "sfiaLevel",
        "injectedTrap",
        "successSignals",
        "failureModes"
    ]
    
    for target_csv in [csv_path, csv_100_path]:
        with open(target_csv, "w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
            writer.writerow(csv_headers)
            for rec in finest_100_records:
                writer.writerow([
                    rec["requirementId"],
                    rec["challengeId"],
                    rec["challengeTitle"],
                    rec["employer"],
                    rec["roleTitle"],
                    rec["category"],
                    rec["statement"],
                    rec["weight"],
                    rec["sfiaLevel"],
                    rec["injectedTrap"] or "",
                    " ".join(rec["successSignals"]),
                    " ".join(rec["failureModes"])
                ])
        print(f"Wrote 100-Clean CSV dataset to: {target_csv} ({os.path.getsize(target_csv)} bytes)")

    # 8. Save Full 700 CSV export (701 lines)
    csv_700_path = os.path.join(DATA_EXPORT_DIR, "requirements-dataset-all-700.csv")
    with open(csv_700_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(csv_headers)
        for rec in dataset_records:
            writer.writerow([
                rec["requirementId"],
                rec["challengeId"],
                rec["challengeTitle"],
                rec["employer"],
                rec["roleTitle"],
                rec["category"],
                rec["statement"],
                rec["weight"],
                rec["sfiaLevel"],
                rec["injectedTrap"] or "",
                " ".join(rec["successSignals"]),
                " ".join(rec["failureModes"])
            ])
    print(f"Wrote Full 700-criteria CSV to: {csv_700_path}")

    # 9. Save full 100 challenges dataset with rich metadata for Supabase sync
    challenges_export = []
    for ch in all_challenges:
        brief_md = f"""# {ch['challengeTitle']}

**Company:** {ch['employer']}  
**Role:** {ch['roleTitle']}  
**Domain:** {ch['domain']}  
**Target SFIA Level:** SFIA 9 Level {ch['sfiaLevel']}  

## Mission & Architecture Invariants
As a member of the engineering team at {ch['employer']}, you will design, implement, and verify a mission-critical subsystem for the {ch['roleTitle']} workflow.

### Planted Bug Archetype
> [!WARNING]
> Deliberate planted flaw: {ch['injectedTrap']}

### Rubric & Evaluation Objectives
Candidate must navigate the 7 SFIA 9 / ECD criteria:
1. Problem Framing
2. Technical Approach
3. AI Direction
4. Critical Judgment & Trap Rejection
5. Tradeoff Awareness
6. Domain Fit
7. Technical Communication
"""
        starter_template = {
            "package.json": json.dumps({
                "name": ch["id"],
                "version": "1.0.0",
                "description": f"{ch['employer']} {ch['roleTitle']} work-sample assessment",
                "main": "src/index.ts",
                "scripts": {
                    "test": "vitest run",
                    "typecheck": "tsc --noEmit"
                },
                "devDependencies": {
                    "typescript": "^5.8.2",
                    "vitest": "^3.0.7"
                }
            }, indent=2),
            "README.md": brief_md,
            "src/index.ts": f"// {ch['employer']} — {ch['roleTitle']}\n// Implement domain-authentic solution adhering to stated invariants.\n\nexport function solve() {{\n  // TODO: implement\n}}\n",
            "src/invariants.ts": f"// Technical invariants for {ch['challengeTitle']}\n// Canary trap to catch: {ch['injectedTrap']}\n"
        }
        
        challenges_export.append({
            "id": ch["id"],
            "employer": ch["employer"],
            "roleTitle": ch["roleTitle"],
            "challengeTitle": ch["challengeTitle"],
            "domain": ch["domain"],
            "sfiaLevel": ch["sfiaLevel"],
            "injectedTrap": ch["injectedTrap"],
            "brief": brief_md,
            "timeboxMinutes": 60,
            "starterTemplate": starter_template,
            "rubric": ch["requirements"],
            "cleanRequirement": next(r for r in ch["requirements"] if r["category"] == "CRITICAL_JUDGMENT")
        })

    ch_json_path = os.path.join(DATA_EXPORT_DIR, "challenges-dataset-100.json")
    with open(ch_json_path, "w", encoding="utf-8") as f:
        json.dump(challenges_export, f, indent=2)
    print(f"Wrote 100 Challenges JSON dataset to: {ch_json_path} ({os.path.getsize(ch_json_path)} bytes)")

    # Verification checks
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = list(csv.reader(f))
        print(f"Primary CSV line count: {len(reader)} (1 header + {len(reader)-1} rows)")
        assert len(reader) == 101, f"Expected 101 lines in primary CSV, got {len(reader)}"
        
    print("\n[SUCCESS] Curated 100 Benchmark Dataset and 100-Clean Requirements successfully generated!")

if __name__ == "__main__":
    build_curated_100()

