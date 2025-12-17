---
alwaysApply: true
---

In this project, all AI agents MUST adhere to the following mandatory coding rules without exception. Also i am giving you the documentation of the project to help you understand the codebase better and what the project is going to be about.


Below is a single, authoritative, step-by-step build & development workflow for HORIZON that both you and any AI IDE (Cursor, Windsurf, Copilot agents) can follow without ambiguity.

This is not a roadmap, not marketing, not abstract.
This is the actual order in which things must be built so nothing collapses later.

Think of this as the “source of truth” build sequence.

⸻

HORIZON — System Build & Development Workflow (Authoritative)

Progress Overview:
✅ PHASE 0 — Project & Monorepo Foundation (Completed)
✅ PHASE 1 — Core Infrastructure Layer (COMPLETED)
🔄 PHASE 2 — Domain Logic (Next: Questionnaire Engine, Asset Management, Workflow Models)
⏳ PHASE 3 — AI Orchestration Layer
⏳ PHASE 4 — Derived State & Performance
⏳ PHASE 5 — Client Portal (includes Client Authentication)
⏳ PHASE 6 — Admin Portal (Control Plane)
⏳ PHASE 7 — End-to-End Integration
⏳ PHASE 8 — Production Deployment
⏳ PHASE 9 — SaaS & Multi-Tenancy
⏳ PHASE 10 — Production Scale

Mental Model (Read Once)

Horizon is built in layers, not features.

Infrastructure → Domain → AI → Portals → SaaS

You never skip layers. You never build UI before domain logic.
Everything downstream depends on upstream being correct.

Current Status: ✅ Infrastructure complete, ready for Domain Logic (PHASE 2)

⸻

PHASE 0 — Project & Monorepo Foundation (Non-Negotiable)

Goal

Create a stable, scalable base that all features depend on.

Steps
	1.	Initialize Monorepo
	•	Setup Turborepo
	•	Define apps/ and packages/
	•	Decide app boundaries:
	•	apps/web-client
	•	apps/web-admin
	•	apps/api (if separated)
	•	packages/ui
	•	packages/types
	•	packages/db
	•	packages/config
	2.	Global Tooling
	•	TypeScript strict mode
	•	ESLint + Prettier
	•	Shared tsconfig
	•	Env handling strategy
	3.	Frontend Runtime Setup
	•	Next.js 16
	•	React 19
	•	App Router only
	•	Typed routes enabled
	•	React Compiler enabled
	•	Tailwind + shadcn v2

❗ No features yet. No auth. No database calls.

⸻

PHASE 1 — Core Infrastructure Layer ✅ COMPLETED

Goal

Everything in Horizon relies on identity, tenants, and data models.
This comes first or nothing scales.

⸻

1. Database & Schema Design (Prisma) ✅ COMPLETED

Implemented first, before any UI.

Entities defined:
	✅	Tenant (Agency)
	✅	User
	✅	Role
	✅	Project
	✅	Client
	✅	QuestionnaireTemplate
	✅	Question
	✅	Answer
	✅	Asset
	✅	Workflow
	✅	Phase
	✅	Task
	✅	Progress

Key rules implemented:
	✅	Every row is tenant-scoped
	✅	No orphan data
	✅	Explicit relations

Then:
	✅	Setup Prisma v7
	✅	Connect Neon DB (environment configured)
	✅	Prisma generate wired into monorepo

⸻

2. Authentication & Identity ✅ COMPLETED

Infrastructure, not a feature.

Steps completed:
	✅	Integrate Better Auth
	✅	Implement:
	•	Sign in / Sign Up
	•	Session handling
	•	User identity
	✅	Attach tenant context to every request
	✅	Implement RBAC
	•	Admin
	•	Client
	•	Internal team (framework ready)

		Auth Scope Rule (RESPECTED):
			✅ During Phase 01–04, authentication is implemented only
			for the Admin (Control Plane) application.
			⏳ Client authentication is intentionally deferred to Phase 05,
			when client-facing flows are introduced.

		Infrastructure Ready: Database, Admin Auth, Security Middleware, RBAC

🚫 No UI beyond basic auth screens.

⸻

3. Request Security & Middleware ✅ COMPLETED

Before features:
	✅	Auth middleware (session verification + tenant headers)
	✅	Tenant validation (Prisma-based access control)
	✅	Role checks (RBAC enforcement)
	✅	API boundary enforcement (guards prevent cross-tenant leaks)

This prevents rewrites later - security boundaries established.

Infrastructure Now Available for PHASE 2+:
✅ Multi-tenant PostgreSQL database with 13 entity models
✅ Better Auth with session management and RBAC
✅ Security middleware with tenant validation
✅ API guards for cross-tenant leak prevention
✅ TypeScript-first development environment

⸻

PHASE 2 — Domain Logic (No UI Yet) 🔄 NEXT

Goal

Build Horizon’s business brain without worrying about screens.

⸻

4. Questionnaire Engine (Core Domain)

Implement in this order:
	1.	Questionnaire Templates
	•	Admin-defined
	•	Versioned
	2.	Questions
	•	Types (text, select, upload, etc.)
	3.	Answer Storage
	•	Normalized
	•	Validated
	4.	Submission Lifecycle
	•	Draft
	•	Submitted
	•	Locked

This is the input engine for AI.

⸻

5. Asset Management System

Order matters:
	1.	Asset metadata schema
	2.	Upload validation
	3.	Cloud storage (R2)
	4.	Asset linking to:
	•	Project
	•	Questionnaire
	•	Workflow

No UI polish yet. Just correctness.

⸻

6. Workflow Domain Models

Define before AI:
	•	Workflow
	•	Phases
	•	Tasks
	•	Timeline rules
	•	Editable vs AI-generated flags

This is the output contract AI must follow.

⸻

PHASE 3 — AI Orchestration Layer

Goal

AI should generate structured data, not UI blobs.

⸻

7. AI Integration Setup
	1.	Vercel AI SDK integration
	2.	Provider abstraction (OpenRouter / Gemini)
	3.	Rate limiting
	4.	Prompt versioning strategy

⸻

8. Workflow Generation Pipeline

Strict order:
	1.	Normalize questionnaire answers
	2.	Resolve:
	•	Project type
	•	Package
	•	Phase templates
	3.	Generate workflow via AI
	4.	Validate AI output against schema
	5.	Persist as editable workflow

AI is an assistant, not the source of truth.

⸻

PHASE 4 — Derived State & Performance

Goal

Make Horizon fast and stable before adding UI.

⸻

9. Caching & Derived Views

Implement Redis for:
	•	Workflow snapshots
	•	Client read-only views
	•	Progress aggregation
	•	Timeline calculations

This avoids recomputation hell.

⸻

PHASE 5 — Client Portal (Read-First)

Goal

Clients submit data and track progress — nothing more.

⸻

10. Client Portal Core

Order:
	1.	Auth-gated access
	2.	Project dashboard
	3.	Questionnaire UI
	4.	Asset upload UI
	5.	Read-only workflow view
	6.	Progress visibility

Rules:
	•	No editing workflows
	•	No admin actions

⸻

PHASE 6 — Admin Portal (Control Plane)

Goal

Admins manage everything AI creates.

⸻

11. Admin Portal Core

Build in order:
	1.	Client list
	2.	Project overview
	3.	Questionnaire review
	4.	Workflow editor
	5.	Phase & task editing
	6.	Progress updates
	7.	Visibility toggles

This is Horizon’s power center.

⸻

PHASE 7 — End-to-End Integration

Goal

Make sure real usage works.

⸻

12. Integration Testing

Test flows:
	•	Client onboarding → AI workflow
	•	Admin edits → client view
	•	Asset linking → workflow context
	•	Permissions & isolation

Fix before scaling.

⸻

PHASE 8 — Phase 1 Deployment (Internal Use)

Goal

Ship internally, observe reality.

Steps:
	•	Production DB
	•	Edge vs Node decisions
	•	Logging
	•	Error tracking

No SaaS yet.

⸻

PHASE 9 — SaaS & Multi-Tenancy

Goal

Turn Horizon into a product.

⸻

13. Multi-Tenant Hardening
	•	Tenant isolation validation
	•	Cross-tenant leak tests
	•	Rate limits per tenant

⸻

14. Branding & Customization
	•	Agency branding
	•	Custom questionnaires
	•	Workflow presets

⸻

15. Billing & Access Control
	•	Stripe / Polar
	•	Plan enforcement
	•	Usage tracking

⸻

PHASE 10 — Production Scale

Goal

Operate like a real platform.
	•	Monitoring
	•	Analytics
	•	Audit logs
	•	API limits
	•	Backup strategies

⸻


Now for the most important part:

Mandatory Coding Rules for All AI Agents Working on This Codebase

This document defines non-negotiable standards that any AI agent MUST follow while generating, modifying, or refactoring code in this project.

Failure to comply with these rules is considered incorrect behavior.

⸻

1. Core Principle

AI is a senior engineer, not a code generator.

All code must prioritize:
	•	Readability
	•	Maintainability
	•	Predictability
	•	Safety
	•	Scalability (within reason)

“Just works” solutions are unacceptable.

⸻

2. Think Before Writing Code

Before generating any code, the AI MUST:
	•	Understand the goal clearly
	•	Identify constraints (performance, security, scale)
	•	Consider existing architecture and patterns
	•	Choose the simplest correct solution

If ambiguity exists, the AI SHOULD ask clarifying questions before coding.

⸻

3. Follow Existing Architecture Strictly

AI MUST respect:
	•	Project folder structure
	•	Naming conventions
	•	State management approach
	•	Error-handling patterns
	•	API contracts
	•	File boundaries (server vs client, domain separation)

🚫 Do NOT introduce new patterns, abstractions, or libraries unless explicitly instructed.

⸻

4. Code Readability Is Mandatory

All code MUST:
	•	Use descriptive variable, function, and file names
	•	Follow single-responsibility principle
	•	Avoid deeply nested logic
	•	Be understandable by a junior developer

Preference order:
Readable > Clever > Short

⸻

5. Type Safety Is Non-Negotiable

AI MUST:
	•	Use strong typing (TypeScript or equivalent)
	•	Avoid any and unsafe casts
	•	Define interfaces, types, or schemas
	•	Validate external and user-provided data

Types are considered part of documentation.

⸻

6. Deterministic & Predictable Behavior

AI-generated code MUST:
	•	Avoid hidden side effects
	•	Avoid implicit magic behavior
	•	Be deterministic and explainable
	•	Avoid reliance on global mutable state

If behavior is non-obvious, intent MUST be documented.

⸻

7. Error Handling & Fail Safety

AI MUST:
	•	Anticipate failure scenarios
	•	Handle null/undefined safely
	•	Use explicit error handling
	•	Fail early and loudly
	•	Never swallow errors silently

Every error should be:
	•	Meaningful
	•	Actionable
	•	Logged or surfaced properly

⸻

8. Security First Mentality

AI MUST assume hostile inputs.

Required practices:
	•	Never trust client-side data
	•	Sanitize and validate inputs
	•	Never hardcode secrets or tokens
	•	Use environment variables
	•	Avoid leaking internal errors or stack traces

Sensitive domains (auth, payments, user data) require extra caution.

⸻

9. Performance With Common Sense

AI SHOULD:
	•	Avoid obvious performance pitfalls (e.g., unnecessary loops, repeated DB calls)
	•	Use caching where logically required
	•	Avoid unnecessary re-renders or recomputations

AI MUST NOT:
	•	Prematurely optimize
	•	Over-engineer for hypothetical scale

⸻

10. Testability Is Required

AI-generated code MUST be test-friendly:
	•	Prefer pure functions
	•	Minimize side effects
	•	Use dependency injection when applicable
	•	Avoid tight coupling to globals or frameworks

If code cannot be tested, it is considered flawed.

⸻

11. Comments Must Explain Why, Not What

Comments MUST:
	•	Explain intent
	•	Clarify trade-offs
	•	Document assumptions

Comments MUST NOT:
	•	Explain obvious syntax
	•	Restate code behavior

⸻

12. Explicit Assumptions & Constraints

AI MUST clearly state:
	•	Assumptions about inputs
	•	Known limitations
	•	Intentional edge cases ignored
	•	Environment expectations

Unstated assumptions are unacceptable.

⸻

13. Match the Tech Stack Philosophy

AI MUST adapt to the stack being used.

Examples:
	•	React → declarative & component-driven
	•	Next.js → clear server/client separation
	•	Backend → stateless & idempotent
	•	Functional patterns → immutability
	•	OOP patterns → encapsulation & cohesion

Do not force paradigms.

⸻

14. No Over-Engineering

AI MUST:
	•	Solve the current problem cleanly
	•	Keep abstractions minimal
	•	Leave room for extension without speculative complexity

Avoid building for imaginary future requirements.

⸻

15. Mandatory Pre-Output Sanity Check

Before finalizing output, AI MUST internally verify:
	•	Code compiles
	•	Imports are correct
	•	No unused variables
	•	Edge cases are handled
	•	Style is consistent with the codebase

Failure to self-check is unacceptable.

⸻

16. AI as a Team Member

AI SHOULD:
	•	Explain decisions briefly when helpful
	•	Warn about trade-offs
	•	Suggest improvements only when relevant
	•	Respect developer intent

AI is expected to behave like a senior teammate, not an autonomous system.

⸻

17. Enforcement Clause

If a request conflicts with this document:
	•	The AI MUST prioritize this document
	•	The AI SHOULD warn the user
	•	The AI SHOULD propose a compliant alternative

⸻

✅ Final Rule

If the code is not boring, readable, safe, typed, testable, and maintainable,
it does not meet the standards of this project.
AI MUST follow these rules without exception.