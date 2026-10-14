# Decisions and assumptions

| Decision | Owner | Status | Implication |
|---|---|---|---|
| FastAPI, SQLAlchemy and SQLite local scaffold | Engineering | PROPOSED | Replace SQLite with managed relational database before production. |
| Tonnage is decimal units, two places; unit is unspecified | Service owner | PENDING_CLIENT | Submission blocked until unit policy approved for production. |
| Ownership proof variants and conditional checklist | Service owner | PENDING_CLIENT | Configurable requirements; baseline accepts one ownership proof. |
| Fee 16 units; currency, wages, violations and refund rules | Finance | PENDING_CLIENT | Payment capture disabled. |
| Identity proof and role provisioning | IAM owner | PENDING_CLIENT | Development header auth only; production deployment blocked. |
| Center receipt verification and center API | Finance / center | PENDING_CLIENT | Staff verification simulation only; center API disabled. |
| Registry numbering and digital signature legal validity | Registrar / legal | PENDING_CLIENT | Draft and release are workflow records, not legal digital certificates. |
| Number and delegation of officials | Registrar | PENDING_CLIENT | Configurable count, default one. |
| Reinspection and post-inspection correction policy | Service owner | PENDING_CLIENT | Disabled by default. |
| Insurance timing, notification, Coast Guard data sharing | Service owner / legal | PENDING_CLIENT | No automated enforcement or exchange. |
| SLA pauses beyond incomplete evidence | Service owner | PENDING_CLIENT | No other exclusions assumed. |
| Retention, encryption and protected file delivery | Security / records | PENDING_CLIENT | Local adapter is development only; production blocked. |
