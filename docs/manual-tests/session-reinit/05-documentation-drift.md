# Test 05: Documentation Drift

## Goal

Verify that session start warns when workflow JSON filename differs from workflow name inside the file.

## Feature Under Test

- **File:** `hooks/src/session/documentation_drift_checker.ts`
- **Function:** `checkDocumentationDrift()`
- **Severity:** WARN (non-blocking)

## Prerequisites

- Project with workflow JSON files (n8n workflows)
- Workflow registry or local workflow files

## Setup Command

```bash
bun run scripts/test-setup/session-reinit/setup-drift.ts
```

The setup script will:
1. Create a workflow JSON file with mismatched name
2. Example: `customer_sync.json` containing `{"name": "Customer Synchronization Workflow"}`

## Test Steps

1. Run the setup script to create drift condition
2. Start a new Claude Code session
3. Observe drift warning

## Expected Output

```
[!] Documentation Drift Detected

Workflow name mismatches:
  - File: customer_sync.json
    Name in file: "Customer Synchronization Workflow"
    Expected: "customer_sync" or similar

Consider renaming the file or updating the workflow name for consistency.
```

## Verification Checklist

- [ ] Warning appears during session start
- [ ] File name and internal name are both shown
- [ ] Warning is non-blocking (session continues)
- [ ] Multiple mismatches are all listed
- [ ] Matching files are NOT flagged

## Cleanup Command

```bash
bun run scripts/test-setup/session-reinit/cleanup-all.ts
```

Or manually:
```bash
rm temp/*.json
```

## Edge Cases to Test

1. **Multiple mismatches**: Create several mismatched workflow files
   - Expected: All listed in single warning

2. **Partial match**: `customer_sync.json` with name `customer sync`
   - Expected: May or may not flag (depends on normalization)

3. **No workflows**: Project without any workflow JSON
   - Expected: No warning, silent pass

4. **Workflow in subdirectory**: `workflows/customer_sync.json`
   - Expected: Scanned and checked

## Drift Detection Logic

The drift checker compares:
1. JSON filename (without extension)
2. `name` field inside the workflow JSON

Normalization may apply (snake_case vs spaces, etc.) depending on implementation.

## Why This Matters

Mismatched names cause confusion when:
- Searching for workflows by name
- Referencing workflows in documentation
- Debugging workflow execution logs
