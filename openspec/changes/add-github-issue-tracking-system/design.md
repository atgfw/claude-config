# Design: GitHub Issue Tracking and Unified Task Synchronization

**Change ID:** `add-github-issue-tracking-system`

## System Overview

Four independent task sources must converge into one coherent state:

```
Claude Code Tasks ──┐
GitHub Issues ──────┤
OpenSpec tasks.md ──┼──> Unified Checklist Format ──> issue-sync-registry.json
Claude Code Plans ──┘
```

## 1. Issue Naming Convention

### Title Format

```
[<system>] <type>(<scope>): <description>
```

| Component | Required | Values |
|-----------|----------|--------|
| `[system]` | Yes | `[hooks]`, `[n8n]`, `[elevenlabs]`, `[servicetitan]`, `[mcp]`, `[governance]`, `[infra]` |
| `type` | Yes | Same as Conventional Commits: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test` |
| `scope` | No | Subsystem name in kebab-case |
| `description` | Yes | Imperative, lowercase, no period, max 72 chars |

### Examples

| Good | Bad |
|------|-----|
| `[hooks] feat(session-start): add auto-push on startup` | `Add auto push feature` |
| `[n8n] fix(webhook): correct auth header validation` | `Webhook bug` |
| `[governance] chore: clean up scrapling-test directory` | `chore: clean up scrapling-test directory` |

### Body Format

```markdown
## Problem
<1-3 sentences describing the problem>

## Solution
<1-3 sentences describing the approach>

## Acceptance Criteria
- [ ] <verifiable criterion>
- [ ] <verifiable criterion>

## Source
- Correction ledger: <entry ID or N/A>
- Escalation: <entry ID or N/A>
- OpenSpec: <change-id or N/A>
```

## 2. Label Taxonomy

### Label Groups

Labels use a `group/value` naming convention with group-specific colors:

| Group | Color Family | Purpose |
|-------|-------------|---------|
| `priority/` | Red spectrum | Urgency classification |
| `system/` | Blue spectrum | System/domain classification |
| `type/` | Green spectrum | Work type (mirrors commit types) |
| `lifecycle/` | Yellow spectrum | Workflow state |
| `source/` | Purple spectrum | Origin of the issue |

### Label Definitions

**Priority:**
| Label | Color | Description |
|-------|-------|-------------|
| `priority/p0-critical` | `#b60205` | Blocks all work, immediate fix |
| `priority/p1-high` | `#d93f0b` | Important, next session |
| `priority/p2-medium` | `#e99695` | Normal backlog |
| `priority/p3-low` | `#f9d0c4` | Nice to have |

**System:**
| Label | Color | Description |
|-------|-------|-------------|
| `system/hooks` | `#0052cc` | Hook infrastructure |
| `system/n8n` | `#006b75` | n8n workflows |
| `system/elevenlabs` | `#1d76db` | ElevenLabs agents |
| `system/servicetitan` | `#0e8a16` | ServiceTitan integration |
| `system/mcp` | `#5319e7` | MCP servers |
| `system/governance` | `#bfd4f2` | Governance rules |
| `system/infra` | `#c2e0c6` | Infrastructure/CI/CD |

**Type:**
| Label | Color | Description |
|-------|-------|-------------|
| `type/feat` | `#0e8a16` | New feature |
| `type/fix` | `#d73a4a` | Bug fix |
| `type/chore` | `#fef2c0` | Maintenance |
| `type/docs` | `#0075ca` | Documentation |
| `type/refactor` | `#e6e6e6` | Code restructuring |
| `type/perf` | `#fbca04` | Performance |
| `type/test` | `#bfdadc` | Testing |

**Lifecycle:**
| Label | Color | Description |
|-------|-------|-------------|
| `lifecycle/triage` | `#f9e076` | Needs classification |
| `lifecycle/specced` | `#c5def5` | Has OpenSpec proposal |
| `lifecycle/in-progress` | `#1d76db` | Actively worked |
| `lifecycle/blocked` | `#b60205` | Waiting on dependency |
| `lifecycle/needs-review` | `#fbca04` | Awaiting review |

**Source:**
| Label | Color | Description |
|-------|-------|-------------|
| `source/correction-ledger` | `#d4c5f9` | Created from human correction |
| `source/escalation` | `#c5b3e6` | Created from escalation detection |
| `source/openspec` | `#b899d4` | Created from OpenSpec proposal |
| `source/manual` | `#a07fc2` | Manually created |

### Auto-Assignment Rules

When creating an issue, labels are auto-assigned by parsing the title:
- `[system]` prefix maps to `system/*` label
- `type(scope):` maps to `type/*` label
- New issues get `lifecycle/triage` by default
- Issues from corrections get `source/correction-ledger`
- Issues from escalations get `source/escalation`

## 3. Unified Checklist Format

All four task sources produce and consume this format:

```json
{
  "id": "unified-<uuid>",
  "title": "Imperative description",
  "status": "pending | in_progress | completed | blocked",
  "priority": "p0 | p1 | p2 | p3",
  "system": "hooks | n8n | elevenlabs | servicetitan | mcp | governance | infra",
  "type": "feat | fix | chore | docs | refactor | perf | test",
  "sources": {
    "github_issue": 24,
    "claude_task": "task-abc123",
    "openspec_change": "add-github-issue-tracking-system",
    "plan_step": null
  },
  "acceptance_criteria": [
    { "text": "Hook created with TDD", "done": false },
    { "text": "Registered in settings.json", "done": true }
  ],
  "created": "2026-01-30T00:00:00Z",
  "updated": "2026-01-30T00:00:00Z"
}
```

### Rendering to Each Source

| Source | Rendered As |
|--------|------------|
| GitHub Issue | Body with `## Acceptance Criteria` checkboxes |
| Claude Code Task | `TaskCreate` with description containing criteria |
| OpenSpec tasks.md | `- [ ]` / `- [x]` markdown checklist |
| Claude Code Plan | Plan file with numbered steps |

## 4. Sync Architecture

### GitHub-Authoritative Model

GitHub issues are the source of truth. Other sources reflect GitHub state.

```
Session Start:
  1. gh issue list --json → local cache
  2. Diff against issue-sync-registry.json
  3. Create/update Claude Code tasks to match
  4. Update OpenSpec tasks.md checkboxes

During Session:
  5. TaskUpdate(completed) → gh issue close
  6. gh issue create → register in sync ledger
  7. OpenSpec archive → gh issue close linked issues

Session End / Next Start:
  8. git add ledger/ → commit → push
```

### Sync Registry Schema

```json
{
  "version": 1,
  "entries": [
    {
      "unified_id": "unified-abc123",
      "github_issue": 24,
      "claude_task_id": null,
      "openspec_change_id": "add-github-issue-tracking-system",
      "plan_step": null,
      "last_synced": "2026-01-30T00:00:00Z",
      "sync_hash": "sha256-of-state"
    }
  ]
}
```

### Conflict Resolution

| Scenario | Resolution |
|----------|-----------|
| Both modified | GitHub wins (authoritative) |
| Local only | Push to GitHub |
| Remote only | Pull to local |
| Both closed | Mark completed everywhere |

## 5. Session Start Auto-Push

Added as the final step in `session_start.ts`:

```
Step 9: Auto-commit and push
  1. cd ~/.claude
  2. git add ledger/ openspec/ hooks/dist/
  3. git diff --cached --quiet || git commit -m "chore(sync): session state sync"
  4. git pull --rebase origin main
  5. git push origin main
  6. On failure: log warning, do not block session
```

**Non-blocking:** Push failures warn but never block session startup. The hook logs `[!] Push failed: <reason>` and continues.

## 6. Issue CRUD Automation

### Auto-Create Triggers

| Event | Creates Issue | Labels |
|-------|--------------|--------|
| Correction ledger entry added | Yes | `source/correction-ledger`, `priority/p1-high` |
| Escalation detected (severity >= high) | Yes | `source/escalation`, `priority/<from-severity>` |
| OpenSpec proposal created | Yes | `source/openspec`, `lifecycle/specced` |
| Hook failure (3+ consecutive) | Yes | `source/escalation`, `priority/p0-critical` |

### Auto-Close Triggers

| Event | Closes Issue | Condition |
|-------|-------------|-----------|
| Claude task completed | Yes | Linked in sync registry |
| OpenSpec archived | Yes | Linked in sync registry |
| All acceptance criteria checked | Yes | GitHub checkbox state |

### Duplicate Detection

Before creating, search existing issues:
```bash
gh issue list --search "<title keywords>" --json number,title,state
```
If >80% title similarity to an open issue, skip creation and log `[!] Duplicate: #<number>`.
