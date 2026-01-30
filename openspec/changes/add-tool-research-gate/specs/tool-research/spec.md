## ADDED Requirements

### Requirement: Tool Research Gate

The system SHALL block creation of automation wrapper files when no research document exists in the same directory.

#### Scenario: Wrapper creation without research document

- **WHEN** a Write operation targets a file matching wrapper path patterns (wrappers/, integrations/, automation/, clients/, adapters/, connectors/)
- **AND** no TOOL-RESEARCH.md file exists in the same directory
- **THEN** the operation SHALL be blocked with a clear error message explaining the research requirement

#### Scenario: Wrapper creation with valid research document

- **WHEN** a Write operation targets a file matching wrapper path patterns
- **AND** a valid TOOL-RESEARCH.md file exists in the same directory
- **AND** the research document contains all required sections (Problem Statement, Search Queries, Candidates, Decision)
- **THEN** the operation SHALL be allowed to proceed

#### Scenario: Research document missing required sections

- **WHEN** a Write operation targets a file matching wrapper path patterns
- **AND** a TOOL-RESEARCH.md file exists but is missing required sections
- **THEN** the operation SHALL be blocked with a message indicating which sections are missing

### Requirement: High-Star Tool Warning

The system SHALL warn when a research document rejects a tool with more than 5,000 GitHub stars.

#### Scenario: Rejecting well-established tool

- **WHEN** a research document marks a tool as REJECTED
- **AND** that tool has more than 5,000 GitHub stars
- **THEN** the system SHALL log a warning to the correction ledger
- **AND** the operation SHALL still be allowed (warning only, not blocking)

#### Scenario: Accepting well-established tool

- **WHEN** a research document marks a tool as ACCEPTED
- **AND** that tool has more than 5,000 GitHub stars
- **THEN** no warning SHALL be logged

### Requirement: Research Registry Tracking

The system SHALL track all research decisions in a centralized registry for audit purposes.

#### Scenario: New research document created

- **WHEN** a valid TOOL-RESEARCH.md document is created or updated
- **THEN** the system SHALL record the decision in tool-research-registry.json
- **AND** the record SHALL include: timestamp, problem domain, tools evaluated, final decision, rationale

#### Scenario: Research registry query

- **WHEN** a query is made to the research registry
- **THEN** the system SHALL return all matching research decisions
- **AND** results SHALL be filterable by date range, decision type, and tool name

### Requirement: Automated Tool Discovery

The system SHALL provide automated discovery of existing tools via GitHub and npm search.

#### Scenario: GitHub search execution

- **WHEN** research is initiated for a problem domain
- **AND** the gh CLI is available and authenticated
- **THEN** the system SHALL execute `gh search repos "<domain>" --sort stars --limit 10`
- **AND** the system SHALL return tool names, star counts, and URLs

#### Scenario: npm search execution

- **WHEN** research is initiated for a problem domain
- **AND** npm CLI is available
- **THEN** the system SHALL execute `npm search <domain>`
- **AND** the system SHALL return package names, weekly downloads, and descriptions

#### Scenario: CLI unavailable graceful degradation

- **WHEN** research is initiated for a problem domain
- **AND** gh or npm CLI is unavailable
- **THEN** the system SHALL log a warning
- **AND** the system SHALL allow manual research documentation without automated discovery

### Requirement: Research Document Template

The system SHALL provide a standardized template for research documentation.

#### Scenario: Template generation

- **WHEN** a new research document is needed
- **THEN** the system SHALL generate TOOL-RESEARCH.template.md with all required sections
- **AND** the template SHALL include placeholder text explaining each section

#### Scenario: Template sections validation

- **WHEN** validating a research document
- **THEN** the system SHALL check for presence of:
  - Problem Statement section
  - Search Queries Executed section with at least one query
  - Candidates Found section with at least one evaluated tool
  - Final Decision section with BUILD or USE choice and rationale
