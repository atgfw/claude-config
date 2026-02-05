# Proposal: Block n8n Local Workflow Files

## Goal

Block n8n local workflow files - enforce cloud-only storage with node notes for documentation

- **WHO:** Claude Code sessions working with n8n workflows
- **WHAT:** Block writing/downloading n8n workflow JSON locally; enforce cloud as single source of truth
- **WHEN:** Before next n8n workflow modification session
- **WHERE:** Spinal Cord hooks (stale_workflow_json_detector, new n8n_download_blocker)
- **WHY:** Local workflow files cause dangerous confusion - Claude overwrites cloud with stale local code, creating ghost files
- **HOW:** Upgrade stale detector from WARN to BLOCK for writes, add download blocker for MCP get_workflow, auto-clean temp/ after push
- **WHICH:** stale_workflow_json_detector.ts (upgrade), n8n_download_blocker.ts (new), post-update cleanup hook (new)
- **LEST:** Continued drift between local and cloud state, data loss, workflow corruption
- **WITH:** Existing hook infrastructure, n8n MCP, temp directory pattern
- **MEASURED BY:** Zero persistent workflow JSON outside temp/, all documentation in n8n node notes

## Summary

Enforce cloud-only n8n workflow storage by blocking local workflow JSON files. Documentation lives in n8n node notes and a minimal CLAUDE.md per project folder.

## Problem Statement

**Issues:** #19, #33 (same root cause)

Local n8n workflow JSON files create dangerous confusion:
1. Claude overwrites cloud objects with stale local code
2. Downloaded workflows become stale and conflict with live cloud state
3. Ambiguity about source of truth (local vs cloud)
4. "Ghost files" that claim to represent cloud state but are wrong

Current state:
- `stale_workflow_json_detector.ts` - WARNS but allows (insufficient)
- `workflow-local-file-enforcer.yaml` - NOT_IMPLEMENTED, actually contradicts this direction (wanted local-first)

## Proposed Solution

### Core Principle

**Cloud is the ONLY source of truth for n8n workflows. Local folders are workspaces, not storage.**

### What Gets Blocked

| Action | Blocked | Reason |
|--------|---------|--------|
| Writing workflow JSON outside `temp/` | YES | Prevents persistent local copies |
| Downloading full workflows via `n8n_get_workflow` | YES | Prevents local clones |
| Reading workflow JSON outside `temp/` | WARN | Educational, not blocking |

### What's Allowed

| Item | Purpose |
|------|---------|
| `CLAUDE.md` | Project context, goals, conventions |
| `temp/*.json` | Transient editing workspace |
| Code node `.js` files in `temp/` | Local testing before push |
| Non-workflow JSON (package.json, etc.) | Normal config files |

### Documentation Strategy

Instead of local workflow documentation:
1. **n8n node notes** - Already enforced (20+ char, Display Note enabled)
2. **CLAUDE.md per project** - Goals, patterns, relationships between workflows
3. **No local workflow specs** - Cloud workflow is self-documenting via notes

### Project Folder Structure

```
projects/my-n8n-project/
    CLAUDE.md          # Project context only
    temp/              # Transient workspace (auto-cleaned)
        edit-buffer.json   # Temporary for editing
        my-code-node.js    # Local testing
```

## Implementation Approach

1. **Upgrade `stale_workflow_json_detector`** from WARN to BLOCK for Write operations
2. **Add `n8n_download_blocker`** to intercept `n8n_get_workflow` MCP calls
3. **Add post-update cleanup** to clear `temp/` after successful workflow push
4. **Deprecate** `workflow-local-file-enforcer.yaml` (contradicts this direction)

## Success Criteria

- [ ] Writing workflow JSON outside `temp/` is BLOCKED
- [ ] Downloading workflows via MCP is BLOCKED (with guidance to use web UI)
- [ ] `temp/` directory auto-cleans after successful workflow update
- [ ] CLAUDE.md is the only persistent local file per project
- [ ] Existing hooks pass validation

## Related Changes

- Obsoletes: `hooks/specs/workflow-local-file-enforcer.yaml`
- Enhances: `stale_workflow_json_detector.ts`
- New: `n8n_download_blocker.ts`, post-update cleanup hook

## Risks

| Risk | Mitigation |
|------|------------|
| Lose work if cloud update fails | Keep temp file until push succeeds |
| Can't see workflow locally | Use n8n web UI or query via MCP list/show |
| Migration pain for existing workflows | One-time cleanup, documented |
