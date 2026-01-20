# Proposal: Add Self-Escalation Mechanism

**Change ID:** `add-self-escalation-mechanism`
**Status:** Draft
**Created:** 2026-01-14

## Summary

Implement an automated self-escalation system that:
1. Provides a central registry for child projects to escalate systematic issues
2. Detects patterns when same issue reported across projects
3. Auto-generates OpenSpec proposals when threshold met
4. Integrates with correction ledger for bidirectional tracking
5. Reports pending escalations at session start

## Motivation

Current state:
- Corrections are tracked after human intervention
- No mechanism for proactive issue reporting from child projects
- Patterns must be manually recognized
- No automated proposal generation
- One-way communication: Global -> Child (via hooks)

Desired state:
- Child projects escalate issues automatically via hooks
- System detects org-wide patterns (same symptom, multiple projects)
- OpenSpec proposals auto-generated when threshold met
- Full lifecycle tracking: pending -> hook-implemented -> resolved
- Bidirectional communication: Child -> Global (via escalation)

## Architecture

```
Child Project A ──┐
Child Project B ──┼──> escalate() ──> escalation-registry.json
Child Project N ──┘        │
                           │
                    ┌──────▼──────┐
                    │   Pattern   │
                    │  Detection  │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
     ┌───────────┐  ┌───────────┐  ┌─────────────┐
     │ Session   │  │  Auto     │  │ Correction  │
     │ Start     │  │ Proposal  │  │   Ledger    │
     │ Reporter  │  │ Generator │  │ Integration │
     └───────────┘  └───────────┘  └─────────────┘
```

## Escalation Categories

| Category | Description | Example |
|----------|-------------|---------|
| governance | Rule enforcement gaps | Missing file naming check |
| testing | Test framework issues | Vitest migration needed |
| tooling | Tool routing/MCP issues | MCP server unreliable |
| pattern | Missing code pattern | Repeated boilerplate |
| performance | Performance bottlenecks | Slow hook execution |
| security | Security concerns | Exposed credentials |
| documentation | Missing/incorrect docs | Outdated CLAUDE.md |
| meta | Issues with escalation itself | Cooldown too aggressive |

## Escalation Lifecycle

```
[pending] ──> [acknowledged] ──> [pattern-detected] ──> [proposal-generated]
                                        │                       │
                                        │                       ▼
                                        │               [hook-implemented]
                                        │                       │
                                        └───────────────────────▼
                                                           [resolved]
```

## Files to Create/Modify

### New Files
- `src/ledger/escalation_registry.ts` - Core registry module
- `src/utils/escalate.ts` - Public escalation utility
- `src/escalation/pattern_detector.ts` - Pattern detection
- `src/escalation/proposal_generator.ts` - Auto-proposal scaffolding
- `src/escalation/reporter.ts` - Session-start formatting
- `src/hooks/escalation_trigger.ts` - PostToolUse hook
- `src/hooks/prompt_escalation_detector.ts` - UserPromptSubmit hook
- `ledger/escalation-registry.json` - Data store

### Modified Files
- `src/types.ts` - Add escalation types
- `src/hooks/session_start.ts` - Add Step 7 escalation reporting
- `src/ledger/correction_ledger.ts` - Cross-reference integration
- `settings.json` - Register new hooks

## Success Criteria

1. `escalate()` utility callable from any hook or child project
2. Same symptom across 2+ projects triggers pattern detection
3. 3+ occurrences generates OpenSpec proposal automatically
4. Session-start shows pending escalations needing attention
5. Corrections link bidirectionally to escalations
6. Meta-escalations work (system can escalate about itself)
7. Cooldown prevents spam (30-minute default)
8. High/critical severity bypasses cooldown
