# Design: Block n8n Local Workflow Files

## Goal

Block n8n local workflow files - enforce cloud-only storage with node notes for documentation

## Architecture Decision

### Current State

```
[Claude] --writes--> local/*.json --stale--> [Conflict with cloud]
                         |
                         v
              stale_workflow_json_detector (WARN only)
```

### Target State

```
[Claude] --blocked--> local/*.json (outside temp/)
    |
    +--allowed--> temp/*.json --push--> [n8n Cloud] --cleanup--> temp/ cleared
    |
    +--blocked--> mcp__n8n__get_workflow (full download)
```

## Hook Changes

### 1. Upgrade: stale_workflow_json_detector.ts

**Current:** WARN on Read/Write/Edit of workflow JSON outside temp/
**Target:** BLOCK on Write/Edit, WARN on Read

```typescript
// Decision matrix
if (isWorkflowJson && !isInExcludedDir(filePath)) {
  if (input.tool_name === 'Write' || input.tool_name === 'Edit') {
    return block('Cannot write workflow JSON outside temp/ - use n8n cloud');
  }
  if (input.tool_name === 'Read') {
    return warnAndAllow('Reading stale workflow JSON - cloud is source of truth');
  }
}
```

### 2. New: n8n_download_blocker.ts

**Purpose:** Block `mcp__n8n-mcp__n8n_get_workflow` calls that would download full workflow JSON

**Logic:**
- Intercept `n8n_get_workflow` MCP tool calls
- BLOCK with guidance: "Use n8n web UI to view workflows. Cloud is source of truth."
- Exception: Allow if destination is explicitly `temp/` directory

```typescript
const BLOCKED_TOOLS = ['mcp__n8n-mcp__n8n_get_workflow'];

export async function n8nDownloadBlockerHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  if (!BLOCKED_TOOLS.includes(input.tool_name)) return allow();

  return block(
    'Downloading workflow JSON is blocked. ' +
    'Cloud is the single source of truth. ' +
    'To view workflow: use n8n web UI or mcp__n8n-mcp__n8n_list_workflows. ' +
    'To edit: use mcp__n8n-mcp__n8n_update_partial_workflow for targeted changes.'
  );
}
```

### 3. New: n8n_post_update_cleanup.ts (PostToolUse)

**Purpose:** Clear temp/ after successful workflow push

**Logic:**
- Trigger on successful `mcp__n8n-mcp__n8n_update_*` operations
- Find and remove any `.json` files in project's `temp/` directory
- Log cleanup for visibility

```typescript
const UPDATE_TOOLS = [
  'mcp__n8n-mcp__n8n_update_full_workflow',
  'mcp__n8n-mcp__n8n_update_partial_workflow',
  'mcp__n8n-mcp__n8n_create_workflow'
];

export async function n8nPostUpdateCleanupHook(input: PostToolUseInput): Promise<void> {
  if (!UPDATE_TOOLS.includes(input.tool_name)) return;
  if (input.tool_result?.error) return; // Don't clean on failure

  const tempDir = findProjectTempDir();
  if (tempDir) {
    const jsonFiles = glob.sync('*.json', { cwd: tempDir });
    for (const file of jsonFiles) {
      fs.unlinkSync(path.join(tempDir, file));
      log(`[+] Cleaned temp file: ${file}`);
    }
  }
}
```

## Documentation Strategy

### n8n Node Notes (existing enforcement)

Already enforced by `n8n_node_note_validator.ts`:
- Minimum 20 characters
- Must describe purpose, not repeat name
- Display Note enabled

This IS the documentation for workflows - no local docs needed.

### CLAUDE.md per Project Folder

Minimal project context file containing:
- Project goal and scope
- Related workflow IDs (reference, not definition)
- Conventions specific to this workflow set
- NO workflow JSON, NO node definitions

Example:
```markdown
# LLM Data Extraction Project

## Workflows
- Main: `8ZN0l9BHo1zBKDnl` (LLM Data Extraction Pipeline)
- Subworkflow: `abc123` (Category Processor)

## Conventions
- All code nodes use strict mode
- Error handling via try/catch with structured error objects
```

## Migration Path

### One-Time Cleanup

1. Identify existing local workflow JSON files
2. Verify cloud versions are current
3. Move local files to `old/YYYY-MM-DD/`
4. Update CLAUDE.md files to reference-only format

### Ongoing Enforcement

Hooks will prevent new violations automatically.

## Trade-offs

| Decision | Pro | Con |
|----------|-----|-----|
| Block downloads | Prevents ghost files | Can't diff locally |
| WARN on reads | Educational | Doesn't prevent all access |
| Auto-cleanup temp/ | Prevents accumulation | Could lose work if push fails silently |

## Rejected Alternatives

### Local-First Pattern (workflow-local-file-enforcer.yaml)

Rejected because:
- Requires maintaining two sources of truth
- Git history doesn't help if cloud is authoritative
- n8n web UI has built-in versioning

### WARN-Only for Writes

Rejected because:
- Warnings are ignored
- Same mistakes repeat
- Issues #19/#33 demonstrate this approach failed
