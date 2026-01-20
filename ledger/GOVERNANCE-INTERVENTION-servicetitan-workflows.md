# GOVERNANCE INTERVENTION - ServiceTitan Workflows

**STOP ALL DEVELOPMENT**

## Issue Detected

You are continuing development on ServiceTitan workflows that were deployed **without governance compliance**. This violates the hierarchical development governance system.

## Deployed Workflows (Ungoverned)

These 3 workflows exist in n8n but were created WITHOUT required prerequisites:

1. **[ST] Auth Token Manager** (e8JlV1rxfR237HMu)
2. **[ST] Call Association v2** (fkTzuzjXYwxSGtlr)
3. **[ST] Job Reminder v2** (knB3ZyreIIQwZh9k)

## Missing Prerequisites (10 Violations)

❌ PROJECT-DIRECTIVE.md (project purpose, success criteria, constraints)
❌ Specification YAML files (inputs/outputs/logic/routes)
❌ Local workflow JSON files (version control, rollback capability)
❌ Test-run-registry entries (0/3 novel test runs completed)
❌ Hierarchical testing (SPEC→BUILD→MOCK→REAL→GATE)
❌ Code node local testing (Vitest tests)
❌ Design enforcer audit
❌ Dual trigger pattern validation (subworkflows)
❌ Workflow publishing verification
❌ n8n evaluations (0% vs required 98%+)

## Core Principle Violated

**UNTESTED WORK IS UNSUITABLE TO BUILD UPON**

You cannot:
- Continue mock testing
- Modify workflows
- Add functionality
- Request credentials

...until governance backfill is complete.

## Required Action: Governance Backfill

Execute these steps IN ORDER before any further development:

### Phase 1: Project Foundation (BLOCKING)

1. **Create PROJECT-DIRECTIVE.md**
   - Location: Project root (detect via .git, package.json, or create new)
   - Required sections:
     - Purpose: What is the ServiceTitan integration for?
     - Success Criteria: How do we know it works?
     - Constraints: API limits, rate limits, data privacy
     - Out of Scope: What this integration will NOT do

2. **Export Workflows to Local JSON Files**
   - Create directory: `workflows/servicetitan/` or similar
   - Export from n8n:
     - `auth-token-manager.json`
     - `call-association-v2.json`
     - `job-reminder-v2.json`
   - Use: `mcp__n8n-mcp__n8n_get_workflow` with mode: "full"
   - Save complete JSON (nodes, connections, settings)
   - Commit to git for version control

### Phase 2: Specification Files (BLOCKING)

Create YAML spec for EACH workflow in `openspec/servicetitan/` or `specs/servicetitan/`:

**Template for each workflow:**
```yaml
workflowName: "[ST] Auth Token Manager"
purpose: "Refresh ServiceTitan OAuth token every 14 minutes"

inputs:
  - name: timer_trigger
    type: schedule
    schedule: "*/14 * * * *"
    description: "Triggers every 14 minutes"

logic:
  nodes:
    - nodeId: http_oauth_request
      type: HTTP Request
      purpose: POST to ServiceTitan OAuth endpoint
      inputs: [ST_CLIENT_ID, ST_CLIENT_SECRET, ST_TENANT_ID]
      outputs: [access_token, expires_in]
    
    - nodeId: set_variable
      type: Set
      purpose: Store token in n8n variable ST_ACCESS_TOKEN
      inputs: [access_token]

outputs:
  - name: token_stored
    type: boolean
    description: "True if token successfully stored"

routes:
  success: Token refreshed and stored
  error: Log error, retry on next schedule

test_cases:
  - name: Valid credentials
    input: {client_id: "mock_id", client_secret: "mock_secret"}
    expected_output: {success: true, token_stored: true}
  
  - name: Invalid credentials
    input: {client_id: "invalid", client_secret: "invalid"}
    expected_output: {success: false, error: "401 Unauthorized"}
```

Repeat for all 3 workflows with COMPLETE node-level detail.

### Phase 3: Test-Run-Registry Setup (BLOCKING)


Register all 3 workflows in `~/.claude/ledger/test-run-registry.json`:

```json
{
  "entities": {
    "st-auth-token-manager": {
      "entityId": "st-auth-token-manager",
      "entityType": "n8n-workflow",
      "entityName": "[ST] Auth Token Manager",
      "workflowId": "e8JlV1rxfR237HMu",
      "status": "untested",
      "version": "1.0.0",
      "novelInputHashes": [],
      "testRuns": []
    },
    "st-call-association-v2": {
      "entityId": "st-call-association-v2",
      "entityType": "n8n-workflow",
      "entityName": "[ST] Call Association v2",
      "workflowId": "fkTzuzjXYwxSGtlr",
      "status": "untested",
      "version": "1.0.0",
      "novelInputHashes": [],
      "testRuns": []
    },
    "st-job-reminder-v2": {
      "entityId": "st-job-reminder-v2",
      "entityType": "n8n-workflow",
      "entityName": "[ST] Job Reminder v2",
      "workflowId": "knB3ZyreIIQwZh9k",
      "status": "untested",
      "version": "1.0.0",
      "novelInputHashes": [],
      "testRuns": []
    }
  }
}
```

### Phase 4: Primordial Pipeline Execution (BLOCKING)

Execute **3 test runs with NOVEL input data** for EACH workflow:

**Test Run Requirements:**
- Each run must use DIFFERENT input data (unique SHA-256 hash)
- Mock ServiceTitan API responses (no live credentials yet)
- Document results in test-run-registry.json
- Track: executionId, inputHash, passed/failed, timestamp

**Example for Call Association v2:**
```
Run 1: HVAC repair call (passed)
Run 2: Plumbing emergency (passed)
Run 3: Electrical consultation (passed)
```

All 3 runs must PASS before moving to next phase.

### Phase 5: Code Node Local Testing (if applicable)

If workflows contain Code nodes (JavaScript/Python):
- Extract code to local files
- Create Vitest tests in `tests/code-nodes/`
- Use fixture pattern: `mock-input.json` + `expected-output.json`
- Run locally: `npm test`
- ALL tests must pass

### Phase 6: Design Enforcer Audit

Invoke architect-reviewer subagent to validate specs against PROJECT-DIRECTIVE.md:
- Does spec align with project purpose?
- Are all inputs/outputs documented?
- Are error handling patterns complete?
- Are test cases comprehensive?

Mark enforcer audit checkboxes complete in spec files.

### Phase 7: Evaluation Gate

Execute evaluation runs and track success rate:
- Minimum 10 evaluation runs per workflow
- Target: 98%+ success rate
- Use mock data (ServiceTitan API mocks)
- Document results in evaluation report

---

## After Backfill Complete

**ONLY THEN** can you:
✅ Continue mock testing development
✅ Modify workflow logic
✅ Add new nodes/functionality
✅ Request production credentials (after proving perfection)

## User's Guidance

> "Those are live credentials that you **must earn through perfection**"

This means: Prove the workflows are perfect through complete governance compliance BEFORE getting production credentials.

## Why This Matters

**Current State:** 0% governance compliance, 0% confidence in correctness

**After Backfill:** 100% governance compliance, high confidence from:
- Clear project directive
- Comprehensive specs
- Local version control
- 3 novel test runs (statistical validation)
- 98%+ success rate
- Enforcer-reviewed design

## Governance Hooks That Should Have Blocked This

The following hooks FAILED to prevent this ungoverned deployment:

1. **cloud_object_creation_gate** - NOT YET IMPLEMENTED (P0-CRITICAL)
2. **workflow_local_file_enforcer** - NOT YET IMPLEMENTED (P0-CRITICAL)
3. **pre_build_gate** - Only catches Write|Edit, not MCP calls
4. **primordial_pipeline_gate** - Only catches Write|Edit, not MCP calls
5. **n8n_dual_trigger_validator** - Registered but may have failed silently

This incident (correction ledger entry `6367b84b1230db23`) exposed the architectural gap.

---

## Summary

**STOP** all ServiceTitan workflow development immediately.

**START** governance backfill following the 7 phases above.

**RESUME** development only after all phases complete and test-run-registry shows status: "healthy".

---

**Intervention Created:** 2026-01-15  
**Incident Reference:** servicetitan-workflow-violations-2026-01-15.md  
**Correction Ledger:** Entry 6367b84b1230db23  
**Status:** ACTIVE - Backfill Required Before Development
