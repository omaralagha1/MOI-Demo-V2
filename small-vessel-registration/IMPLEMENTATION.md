# A.4.1/1 implementation status

The original FastAPI/SQLite scaffold for this specification has been removed. The active application is the Next.js and Prisma/MySQL implementation in `src/` and `prisma/`. The PlantUML diagrams and other files in this directory remain process and policy references.

For the current service:

- `docs/ARCHITECTURE.md` describes the modules and operating limits.
- `docs/WORKFLOW_MAPPING.md` maps the nine-step diagram to the implemented demo actions.
- `docs/DEMO_FLOW_TEST.md` explains how to test the ministry-first and direct-center routes.
- `docs/API_DOCUMENTATION.md` lists the API actions.
- `docs/DEPLOYMENT.md` gives current local setup commands.

The two root SQLite files are retained as legacy data pending any approved import. They are not used by the running application. Payment, physical inspection, and legally valid signatures still require external authorized services.
