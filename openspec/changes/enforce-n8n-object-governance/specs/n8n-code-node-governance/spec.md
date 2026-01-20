# Spec: n8n Code Node Governance

## ADDED Requirements

### Requirement: Logic Centralization in Code Nodes (C1)

The system SHALL encourage maximizing workflow logic into JavaScript code nodes to minimize inline expressions and mustaching in other node types.

**Rationale:** Code nodes can be locally tested, linted, and version-controlled. Inline expressions cannot.

#### Scenario: Warn on complex inline expression
- **GIVEN** a non-code node with expression containing more than 2 operations (e.g., `{{ $json.data.filter(x => x.active).map(x => x.id).join(',') }}`)
- **WHEN** code node governance validator executes
- **THEN** operation is ALLOWED with warning "Consider moving complex logic to code node for testability"

#### Scenario: Allow simple field mapping
- **GIVEN** a Set node with expression `{{ $json.customer.name }}`
- **WHEN** code node governance validator executes
- **THEN** operation is ALLOWED without warning (simple field access)

---

### Requirement: Local Development for Code Nodes (C2)

The system SHALL require code node JavaScript to be developed and tested locally with mock data before uploading to n8n.

**Process:**
1. Create JavaScript in temp directory locally
2. Test with mock input data
3. Verify output matches expectations
4. Upload to n8n code node

#### Scenario: Block untested code node
- **GIVEN** a code node create/update operation
- **WHEN** no corresponding local test recorded in test-run-registry
- **THEN** operation is BLOCKED with reason "Code node JavaScript must be tested locally first"

#### Scenario: Allow tested code node
- **GIVEN** a code node create/update operation
- **WHEN** test-run-registry shows 3 novel test runs with passing results
- **THEN** operation is ALLOWED per primordial pipeline

---

### Requirement: Standard Linting for Code Node Content (C3)

The system SHALL apply standard JavaScript/TypeScript linting rules to code node content. No special treatment unless there is an n8n-specific limitation.

**Applied rules:**
- ESLint with project configuration
- Same quality standards as regular JavaScript files
- n8n-specific exceptions documented in hook configuration

#### Scenario: Block code node with linting errors
- **GIVEN** a code node with JavaScript containing `var x = 1;` (var keyword banned)
- **WHEN** code node linting gate executes
- **THEN** operation is BLOCKED with linting errors displayed

#### Scenario: Allow clean code node
- **GIVEN** a code node with JavaScript passing all lint rules
- **WHEN** code node linting gate executes
- **THEN** operation is ALLOWED

#### Scenario: Allow n8n-specific pattern
- **GIVEN** a code node using `$input.all()` (n8n-specific global)
- **WHEN** code node linting gate executes
- **THEN** operation is ALLOWED (documented n8n exception)

---

### Requirement: Auto-Apply Linting Updates (C4)

The system SHALL automatically apply new JavaScript linting rules to code node content validation.

#### Scenario: New lint rule applies to code nodes
- **GIVEN** a new ESLint rule added to project configuration
- **WHEN** code node linting gate executes on subsequent code node operations
- **THEN** new rule is enforced without manual hook update

---

### Requirement: No Script Retention Requirement (C5)

The system SHALL NOT require organizing or retaining local JavaScript files used for code node development. Temp directory usage is acceptable.

#### Scenario: Temp file development allowed
- **GIVEN** code node JavaScript developed in system temp directory
- **WHEN** tests pass and code uploaded to n8n
- **THEN** temp files may be deleted (no retention governance)
