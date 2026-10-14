# Codex implementation request — A.4.1/1 Small Vessel Registration (<150 tons)

You are the lead engineer implementing **one service module** within a broader Kuwait Maritime / public-services platform. Begin by **reading the existing repository and identifying the actual stack, directory layout, auth, UI/i18n, database, API, and test conventions**. Reuse them. If the repository is empty, propose a production-suitable stack and scaffold only after explaining the choice. Do not replace an existing architecture just to match a proposed stack.

## Input files (read in this order)

1. `01-small-vessel-registration-as-is.puml`: authoritative trace of the **current manual 9-step process**, from the supplied official Arabic diagrams.
2. `02-small-vessel-registration-to-be.puml`: **proposed** digitized workflow, with source-to-task IDs.
3. `03-small-vessel-registration-status-model.puml`: proposed persistable case state machine.
4. `04-proposed-system-architecture.puml`: **illustrative**, not an approved architecture or vendor decision.

**Do not confuse [ASIS-NN] or [BR-NNN] (source-derived) with [PROP-NN] or [SYS-NN] (implementation/design proposals).** All `PROP` requirements require confirmation. Where they affect legality, fees, data sharing, signatures, insurance, or SLAs, implement as configurable workflows behind disabled-by-default feature flags, simulated adapters, or clearly labelled TODOs; never silently assert they are approved.

## Build order

### 1. Repository discovery and domain design

- Map the service onto existing modules and identify integration points.
- Produce a requirement-to-component mapping: `ASIS-01..09`, `BR-001..011`, `SYS-01..18`, `PROP-01..10` (where present).
- Create a short assumptions/decisions file with owner, status (`CONFIRMED`, `PENDING_CLIENT`, `PROPOSED`), and blocking implications.
- Design entities, migrations, enums, policy rules and tests **before** making UI screens.

### 2. Server-side module and persistence

Model at minimum:

- `RegistrationCase`: UUID, public application number, intake channel (`PORTAL`, `EXTERNAL_CENTER`), status, applicant and ownership relationships, timestamps, version, assigned officer.
- `Vessel`: name/identifiers where applicable, declared tonnage, country/previous flag, registration attributes.
- `Party` / `Applicant` / `AuthorizedRepresentative` with ownership and company/person category, authority evidence.
- `Document` and `DocumentRequirement`: type, classification, condition, file metadata, immutable versions, validation results, verified-by user, review history.
- `FeeAssessment`, `FeeLine`, `Payment`, `PaymentReconciliation`: fixed fee, surveyor wages, violations; currency configurable; a verified center-paid fee must never be charged again.
- `Inspection`: center, reference, report file, result, any permitted reinspection history, submission channel.
- `Certificate` and `CertificateVersion`: draft, allocated/proposed registry number, issue/release dates, secured file reference.
- `ApprovalStep`: role, order, assignee or policy group, version of document signed, timestamp, comments, result.
- `CaseStatusEvent` / immutable `AuditEvent` / `NotificationOutbox`.
- `CaseSlaRecord` using configurable working-day/holiday calendar and ministry-confirmed pause rules.
- Optional `InsuranceComplianceTask` only when BR-009 timing is approved.

Use database migrations, foreign keys, unique constraints, transaction boundaries and optimistic concurrency or row locking for competing approvals. Store documents in protected storage; don't store binary scans in the main case row. Encrypt sensitive identity details, use short-lived authorized file access and configure retention policies. Never log raw Civil IDs, commercial registration documents or payment secrets.

### 3. Business rules and decision policies

- `BR-001`: enforce `declaredTonnage < 150`, and define tonnage unit/precision with product owner rather than assuming gross tonnage.
- `BR-002`: conditional document checklist for ownership evidence; foreign flag deletion certificate when relevant; civil ID; for companies, signatory authorization and commercial register; official POA if represented; MOC clearance; other listed ownership/customs evidence depending on approved rules. **Do not assume that all ownership proof variants are universally mandatory** without confirmation.
- `BR-003`: source lists **fixed fee 16, currency unverified**. Add surveyor wages and applicable violations where confirmed. Require fee configuration/approval; never hardcode 'KWD' as a verified source fact. No payment capture until gateway and currency rules are approved.
- `BR-004`: published target 2–3 working days. Do not assume inspection waiting is excluded; only stop/pause timers for periods approved by ministry policy. Incomplete documents suspend procedure per BR-008.
- `BR-005`: support both ministry-first and center-first intake; the direct center route allows center collection of fees. Prevent duplicate charging and support official verification of center receipts.
- `BR-006`: enforce officer -> sequential responsible officials -> ship registrar. Number and delegation of responsible officials are configurable. A draft is generated **before** any signatures; do not let a rejected draft continue to final issuance.
- `BR-007`: archive issued certificate and retained copy in case file.
- `BR-008`: incomplete evidence returns the case for correction; preserve comments, reviewer, versions and resubmission history.
- `BR-009`: insurance document phrase concerns validity **after registration procedures**. Do not block initial document intake for insurance by default; client must clarify whether post-registration tracking, release condition or another arrangement applies.
- `BR-010`: require officially authorized representation where applicant is a proxy.
- `BR-011`: source has applicant return inspected papers to registration officer. Permit this as manual fallback; electronic inspection-center upload is unapproved `PROP-05`.
- Coast Guard is named among external units, **not** shown as an automated data recipient. Do not implement data transfer without approval, legal basis, payload definition and security controls.

### 4. Workflow API and authorization

Use versioned HTTP endpoints consistent with the existing repo. Suggested routes (adapt naming but keep capabilities):

- `POST /api/maritime/small-vessel-registrations` create draft case.
- `GET /api/maritime/small-vessel-registrations/:id` retrieve only authorized case.
- `PATCH /api/maritime/small-vessel-registrations/:id` update editable case fields with revision control.
- `POST /api/maritime/small-vessel-registrations/:id/documents` upload document and validate metadata.
- `POST /api/maritime/small-vessel-registrations/:id/submit` validate and submit.
- `POST /api/maritime/small-vessel-registrations/:id/review/request-info` record reasons and return for correction.
- `POST /api/maritime/small-vessel-registrations/:id/review/approve` initial or final review (require explicit stage).
- `GET /api/maritime/small-vessel-registrations/:id/fees` calculate assessment (not automatic charge).
- `POST /api/maritime/small-vessel-registrations/:id/payment-confirmations` **authenticated payment-provider adapter only**, or privileged manual verification where approved, never client-supplied trusted success.
- `POST /api/maritime/small-vessel-registrations/:id/inspection-reports` receive an authorized report or staff-verified manual file.
- `POST /api/maritime/small-vessel-registrations/:id/certificate/draft` produce preview, not final issuance.
- `POST /api/maritime/small-vessel-registrations/:id/approvals/:stepId/decision` record one controlled approval/return.
- `POST /api/maritime/small-vessel-registrations/:id/release` release only after all approved signatures.
- `GET /api/maritime/small-vessel-registrations/:id/audit-events` authorized audit read.
- `GET /api/maritime/small-vessel-registrations` with paging, statuses, assignment, filters.
- Optional `POST /api/integrations/inspection-centers/intakes` and `/reports`, **disabled until approved**, authenticated and idempotent, with receipt verification.

Implement a **single server-side transition service** for state changes and audit events. No UI may directly set arbitrary status. All action APIs must validate role, input, supporting evidence, current state, approval order, concurrency, and idempotency. Outbox events should be transactionally written for notifications/integrations; retries must not duplicate registration numbers or payments.

### 5. Client-side screens

Build the smallest coherent end-to-end module using the repository's UI framework:

1. Applicant/representative dashboard, case tracking, correction requests.
2. New small-vessel registration form with conditional personal/company/proxy fields and dynamic required-document checklist.
3. Document uploads and officer feedback (file previews subject to authorization).
4. Review queue for registration officers and back-office center-paid case entry.
5. Fee breakdown, verified receipts and configurable payment state; no fake 'paid' data.
6. Inspection step with **manual post-inspection upload/handover as baseline**, electronic center integration behind feature flag.
7. Draft certificate preview and role-specific ordered signature queues.
8. Certificate release, download, copy archive and timeline/audit view.
9. Role-configurable admin policy panel only if existing architecture supports safe administration; otherwise seed data and document config.

Use **Arabic and English**, proper RTL switching, accessible layouts, mobile responsive applicant portal, readable statuses, and friendly validation. Applicant sees only their own permitted cases; staff see only authorized work queues. Screen actions map directly to state transitions.

### 6. Role model

- `APPLICANT`, `AUTHORIZED_REPRESENTATIVE`: own cases only and evidence submissions.
- `REGISTRATION_OFFICER`: intake, verification, requests for correction, draft generation, first signature, release.
- `SUPERVISING_OFFICIAL`: only own/assigned sequential approval tasks.
- `SHIP_REGISTRAR`: final signature when prerequisite signatures complete.
- `INSPECTION_CENTER`: only scoped intake/report integration if approved, otherwise no direct login permission.
- `SERVICE_ADMIN`: reference policy, workflow configuration, authorized corrections; not unrestricted bypass of audit/approvals.
- `AUDITOR`: read-only authorized audit and outcomes.

### 7. Tests / acceptance scenarios

Implement automated unit, integration and API permission tests, and targeted UI tests for:

- Exactly 150 and greater tonnage are rejected; 149.99 accepted only when unit policy permits.
- Person vs company vs proxy dynamic documents and required POA.
- Foreign-flag document condition.
- Incomplete document flow suspends and preserves versioned audit history; resubmission restores correct queue.
- Ministry route fees and external-center-paid route do not double-charge.
- Failed/pending payment cannot advance the ministry payment gate.
- Center integration disabled: applicant can return report to officer.
- Failed inspection does not produce certificate; reinspection available only when approved.
- Officer / successive officials / ship registrar approvals occur in order; rejected drafts return with comments and stale signature versions are invalidated.
- Repeated identical external webhook or concurrent submission cannot duplicate case, payment, receipt or registry number.
- Only authorized officer can release; downloaded copy is the approved immutable version.
- Exact audit trail of who did what, from which role, when and which document version.
- Non-owners cannot access personal documents; unauthorized center cannot post reports.
- Arabic RTL form, validation, and status tracking.
- SLA reports show published target, with exclusions configurable and not silently guessed.

### 8. Required outputs from Codex

A. First produce an implementation plan and list of client decisions needing approval; distinguish blocking questions from optional features.
B. Implement working migrations, server state machine, permission policy, APIs, basic frontend screens, document storage adapter, mocks for unavailable integrations, and tests incrementally.
C. Maintain a traceability table `ASIS/BR -> API -> DB -> UI -> tests` and keep the `.puml` diagrams in repository docs.
D. Provide `.env.example`, local run commands, migration/seed commands, test commands, and a changelog of implemented vs pending proposed features.
E. Do not claim the module is legally production-ready before financial, signature, identity and document-retention decisions are confirmed.

Deliver vertical slices in order: **Create/submit -> Document review -> Fees -> Inspection handoff -> Certificate approvals -> Release -> Audit/SLA -> Optional integrations**. Make each slice runnable and tested before continuing.
