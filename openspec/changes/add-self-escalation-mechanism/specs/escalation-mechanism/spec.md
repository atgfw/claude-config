# Escalation Mechanism Specification

## ADDED Requirements

### Requirement: Escalation Registry Storage

The system SHALL maintain an escalation registry at `~/.claude/ledger/escalation-registry.json` that stores all escalation entries with their metadata, status, and cross-references.

#### Scenario: Create new escalation
- **WHEN** `escalate()` is called with symptom, context, proposedSolution, category, severity
- **THEN** a new entry is created with unique ID, symptomHash computed, status set to 'pending'

#### Scenario: Duplicate symptom detection
- **WHEN** `escalate()` is called with symptom matching existing symptomHash from same project
- **THEN** occurrenceCount is incremented, timestamp updated, no duplicate entry created

#### Scenario: Cross-project symptom detection
- **WHEN** `escalate()` is called with symptom matching existing symptomHash from different project
- **THEN** crossProjectCount is incremented, project added to relatedProjects array

### Requirement: Symptom Hash Generation

The system SHALL generate deterministic symptom hashes for deduplication using normalized text and SHA-256.

#### Scenario: Normalize and hash symptom
- **WHEN** `generateSymptomHash()` is called with a symptom string
- **THEN** the symptom is lowercased, punctuation removed, words sorted, and SHA-256 hash prefix returned

#### Scenario: Equivalent symptoms produce same hash
- **WHEN** two symptoms contain the same words in different order
- **THEN** both produce identical symptomHash values

### Requirement: Pattern Detection

The system SHALL detect patterns when the same symptom is reported multiple times or across multiple projects.

#### Scenario: Cross-project pattern detected
- **WHEN** same symptomHash reported from 2 or more different projects
- **THEN** crossProjectCount is updated, status transitions to 'pattern-detected' if threshold met

#### Scenario: Occurrence threshold met
- **WHEN** occurrenceCount reaches patternThreshold (default: 3)
- **THEN** status transitions to 'pattern-detected'

#### Scenario: Pattern threshold configurable
- **WHEN** config.patternThreshold is set to a custom value
- **THEN** that value is used for threshold checking instead of default

### Requirement: Auto-Proposal Generation

The system SHALL automatically generate OpenSpec proposals when pattern thresholds are met and autoProposalEnabled is true.

#### Scenario: Generate proposal from escalations
- **WHEN** escalation status is 'pattern-detected' and autoProposalEnabled is true
- **THEN** OpenSpec proposal scaffolded at `openspec/changes/auto-{slug}/` with proposal.md populated

#### Scenario: Mark proposal generated
- **WHEN** proposal successfully scaffolded
- **THEN** escalation status transitions to 'proposal-generated', generatedProposalPath is set

#### Scenario: Skip proposal for meta-escalations
- **WHEN** escalation category is 'meta'
- **THEN** auto-proposal is skipped, escalation flagged for human review

### Requirement: Cooldown Enforcement

The system SHALL enforce cooldown periods to prevent escalation spam.

#### Scenario: Same symptom within cooldown
- **WHEN** `escalate()` called for same symptomHash from same project within cooldownMinutes
- **THEN** escalation is deduplicated, occurrenceCount not incremented

#### Scenario: High severity bypasses cooldown
- **WHEN** `escalate()` called with severity 'high' or 'critical' during cooldown
- **THEN** escalation is recorded despite cooldown

#### Scenario: Cooldown period configurable
- **WHEN** config.cooldownMinutes is set to a custom value
- **THEN** that value is used for cooldown checking instead of default

### Requirement: Session-Start Escalation Reporting

The session-start hook SHALL report escalation status including pending count, high priority items, and patterns needing proposals.

#### Scenario: Report pending escalations
- **WHEN** session starts with pending escalations
- **THEN** output includes total count and top 3 by priority

#### Scenario: Report patterns needing proposals
- **WHEN** session starts with 'pattern-detected' escalations
- **THEN** output includes actionable items list with symptom summaries

#### Scenario: Report no escalations
- **WHEN** session starts with no pending escalations
- **THEN** output indicates "No pending escalations"

### Requirement: Correction Ledger Integration

The system SHALL bidirectionally link escalations and corrections.

#### Scenario: Link correction to escalation
- **WHEN** correction recorded with symptom matching existing escalation's symptomHash
- **THEN** correction.id added to escalation.relatedCorrectionIds

#### Scenario: Auto-resolve on hook implementation
- **WHEN** correction marked as hookImplemented with linked escalation
- **THEN** escalation status transitions to 'hook-implemented', implementedHookName is set

#### Scenario: Query escalations from correction
- **WHEN** correction has relatedEscalationIds
- **THEN** escalation registry can be queried for those IDs

### Requirement: Meta-Escalation Support

The escalation system SHALL be able to escalate issues about itself using category 'meta'.

#### Scenario: Meta-escalation recorded
- **WHEN** `escalate()` called with category 'meta'
- **THEN** escalation recorded with category 'meta', flagged for human review

#### Scenario: Meta-escalation skips auto-proposal
- **WHEN** meta-escalation reaches pattern threshold
- **THEN** status becomes 'pattern-detected' but auto-proposal is NOT triggered

### Requirement: Escalation Lifecycle Management

The system SHALL track escalation status through defined lifecycle states.

#### Scenario: Status transitions
- **WHEN** escalation is created
- **THEN** status is 'pending'
- **WHEN** pattern threshold met
- **THEN** status transitions to 'pattern-detected'
- **WHEN** proposal generated
- **THEN** status transitions to 'proposal-generated'
- **WHEN** hook implemented
- **THEN** status transitions to 'hook-implemented'
- **WHEN** manually resolved
- **THEN** status transitions to 'resolved'

#### Scenario: Rejection handling
- **WHEN** escalation is rejected as not actionable
- **THEN** status transitions to 'rejected', rejectionReason is set

### Requirement: Escalation Utility API

The system SHALL provide a public utility function for creating escalations.

#### Scenario: escalate() creates entry
- **WHEN** `escalate({ symptom, context, proposedSolution, category, severity })` is called
- **THEN** new escalation entry created with auto-detected projectPath

#### Scenario: escalateFromHook() includes hook context
- **WHEN** `escalateFromHook(hookName, params)` is called
- **THEN** new escalation entry created with hookName in relatedHookNames

#### Scenario: Return escalation result
- **WHEN** escalate() succeeds
- **THEN** return object includes: id, isNovel (new vs duplicate), escalation entry
