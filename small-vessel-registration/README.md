# Kuwait Maritime: Small Vessel Registration (<150 tons)

Service: **A.4.1/1**. Source: three Arabic images supplied by the project owner (service profile, original manual flow and official service card).

## Files

- `01-small-vessel-registration-as-is.puml`: current nine-step paper procedure.
- `02-small-vessel-registration-to-be.puml`: proposed digital process with explicit source and proposal tags.
- `03-small-vessel-registration-status-model.puml`: proposed persisted case status transitions.
- `04-proposed-system-architecture.puml`: suggested module boundaries only.
- `CODEX_IMPLEMENTATION_PROMPT.md`: implementation instructions, constraints, entities, APIs, screens and tests.
- `ALL-DIAGRAMS.puml`: same four diagrams concatenated, useful for handing to an agent.

## Source traceability

| Source flow | Actual source behavior | Main digital counterpart |
| --- | --- | --- |
| ASIS-01 | Officer receives docs from owner/official representative | Applicant upload / officer review |
| ASIS-02 | Officer validates documents | Automated completeness check + officer review |
| ASIS-03 | Officer issues small vessel inspection form | Controlled form/referral generation |
| ASIS-04 | Officer collects service fee/surveyor charges/violations | Fee assessment; proposed digital payment |
| ASIS-05 | Applicant attends external inspection center | Physical inspection remains external |
| ASIS-06 | Applicant returns inspected paperwork | Manual return retained; center API only proposed |
| ASIS-07 | Officer, successive officials, ship registrar sign | Ordered review and signature chain |
| ASIS-08 | Signed certificate returns to officer | Certificate routed to officer |
| ASIS-09 | Officer delivers certificate and saves copy | Digital release and secure retained copy |

## Client decisions to confirm

1. Whether the 16-unit fixed fee is Kuwaiti dinars and how surveyor charges/violations are calculated and collected.
2. Which ownership proofs are alternatives vs mandatory for each vessel/owner type.
3. Insurance requirement timing (source says valid after registration procedures); whether it blocks release or is post-registration compliance.
4. Approved identity provider, legal validity and mechanism of digital signatures, and the number of sequential officials.
5. Whether external inspection centers support authenticated electronic intake, report exchange, fee receipt reconciliation or reinspection scheduling.
6. Whether the Coast Guard needs electronic registration notifications and legal basis for transfer.
7. SLA calendar, starting point, pause rules and holidays; source only publishes 2–3 working days and suspension on missing docs.
8. Document retention duration, authoritative registry-number generation and duplicate vessel rules.

**The architecture and state-machine diagrams are proposals, not statements of ministry-approved policy.**
