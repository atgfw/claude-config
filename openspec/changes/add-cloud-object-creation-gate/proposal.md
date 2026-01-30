# Proposal: Add Cloud Object Creation Gate

**Change ID:** `add-cloud-object-creation-gate`
**Priority:** P0-CRITICAL
**Issue:** #11

## Problem

Correction ledger entry `6367b84b1230db23`: Claude deployed 4 ServiceTitan n8n workflows directly to cloud via MCP tools (`mcp__n8n-mcp__n8n_create_workflow`) without PROJECT-DIRECTIVE.md, specs, local files, test-run-registry entries, or hierarchical testing. Complete governance bypass.

**Root cause:** Existing governance hooks only validate content of cloud operations (naming, notes, dual triggers). No hook enforces the _preconditions_ for cloud object creation -- that the hierarchical development pipeline was followed before deploying to cloud.

## Solution

A single `cloud_object_creation_gate.ts` PreToolUse hook that intercepts all cloud-creating MCP tools and blocks unless:

1. **PROJECT-DIRECTIVE.md** exists in the working directory (or a parent)
2. **Spec files** exist for the entity being created
3. **test-run-registry** has 3 novel runs for the entity (primordial pipeline)
4. **Local version-controlled files** exist (the cloud object was built locally first)

## Scope

- One new governance hook: `hooks/src/governance/cloud_object_creation_gate.ts`
- One test file: `hooks/tests/governance/cloud_object_creation_gate.test.ts`
- Registration in `settings.json`
- One spec delta

## Non-Goals

- Does not replace existing content-validation hooks (naming, notes, linting)
- Does not add new MCP matchers beyond what's in the issue
- Does not modify the test-run-registry format
