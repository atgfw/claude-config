# Spec: n8n Naming Conventions

## ADDED Requirements

### Requirement: Tag Syntax Reservation (N1)

The system SHALL reserve bracket tag syntax `[TAG]` for systems without built-in tag features. n8n has native tags; bracket syntax is BLOCKED for n8n workflows.

#### Scenario: Block bracket tag in workflow name
- **GIVEN** a workflow create/update operation with name `[ST] Customer Sync`
- **WHEN** n8n naming validator executes
- **THEN** operation is BLOCKED with suggestion "Use 'ServiceTitan_customer_sync' instead of bracket tags"

#### Scenario: Allow bracket tag for tagless systems
- **GIVEN** a ServiceTitan custom field with name `[Phase] Status`
- **WHEN** naming validator executes for ServiceTitan objects
- **THEN** operation is ALLOWED (ServiceTitan lacks native tags)

---

### Requirement: System Name Prefix (N2)

The system SHALL require full system names as workflow prefixes instead of abbreviations.

**Mapping:**
- `[ST]` -> `ServiceTitan_`
- `[EL]` -> `ElevenLabs_`
- `[N8N]` -> No prefix needed (native n8n workflow)

#### Scenario: Block abbreviated prefix
- **GIVEN** a workflow create operation with name `[ST]_dispatch_sync`
- **WHEN** n8n naming validator executes
- **THEN** operation is BLOCKED with suggestion "Use 'ServiceTitan_dispatch_sync'"

#### Scenario: Allow full system prefix
- **GIVEN** a workflow create operation with name `ServiceTitan_dispatch_sync`
- **WHEN** n8n naming validator executes
- **THEN** operation is ALLOWED

---

### Requirement: DEV Tag for Development Workflows (N3)

The system SHALL auto-apply `[DEV]` tag to new workflows during development phase. This is the ONLY bracket tag allowed for n8n workflows.

#### Scenario: New workflow gets DEV tag
- **GIVEN** a workflow create operation without tags
- **WHEN** n8n naming validator executes
- **THEN** workflow is tagged with `[DEV]` and operation proceeds

#### Scenario: DEV tag preserved until evaluation gate
- **GIVEN** a workflow with `[DEV]` tag
- **WHEN** evaluation gate runs with <98% success rate
- **THEN** `[DEV]` tag is NOT removed

---

### Requirement: Version Number Ban (N4)

The system SHALL block version numbers in object names. This is a GLOBAL rule applying to all programming objects, not just n8n.

**Blocked patterns:** `v1`, `v2`, `v3`, `r1`, `r2`, `_1`, `_2` (trailing numerics indicating versions)

#### Scenario: Block versioned workflow name
- **GIVEN** a workflow create operation with name `ServiceTitan_sync_v2`
- **WHEN** naming validator executes
- **THEN** operation is BLOCKED with reason "Version numbers banned - use tags or create new workflow"

#### Scenario: Block versioned node name
- **GIVEN** a node with name `HTTP Request v2`
- **WHEN** naming validator executes
- **THEN** operation is BLOCKED with suggestion "Rename to descriptive name without version"

#### Scenario: Allow canonical numeric patterns
- **GIVEN** a reference to `base64` or `oauth2` (canonical library names)
- **WHEN** naming validator executes
- **THEN** operation is ALLOWED (canonical exception)

---

### Requirement: Snake Case for Node Names (N5)

The system SHALL enforce snake_case for n8n node names, consistent with file governance conventions.

#### Scenario: Block PascalCase node name
- **GIVEN** a node with name `GetCustomerData`
- **WHEN** naming validator executes
- **THEN** operation is BLOCKED with suggestion "Rename to 'get_customer_data'"

#### Scenario: Allow snake_case node name
- **GIVEN** a node with name `fetch_servicetitan_jobs`
- **WHEN** naming validator executes
- **THEN** operation is ALLOWED

#### Scenario: Allow Title Case for display-only labels
- **GIVEN** a node with displayName `Get Customer Data` and name `get_customer_data`
- **WHEN** naming validator executes
- **THEN** operation is ALLOWED (displayName exempt, name validated)

---

### Requirement: Integer Ban in Object Names (N6)

The system SHALL block integers in programming object names unless the integer is canonical for that library or system.

**Allowed exceptions:**
- `base64`, `utf8`, `sha256`, `oauth2`, `http2` (canonical protocol/encoding names)
- Platform-specific IDs when referencing external systems

#### Scenario: Block arbitrary integer in name
- **GIVEN** a function named `processData2`
- **WHEN** naming validator executes
- **THEN** operation is BLOCKED with reason "Integers banned in names - use descriptive suffix"

#### Scenario: Allow canonical integer
- **GIVEN** a reference to `sha256` algorithm
- **WHEN** naming validator executes
- **THEN** operation is ALLOWED (canonical exception)
