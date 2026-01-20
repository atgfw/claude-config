# File Governance Audit Report
**Date:** 2026-01-12
**Auditor:** Claude Code (Opus 4.5)

## Executive Summary

This audit retroactively applies the file governance framework to all files in the `~/.claude` Spinal Cord project. The framework enforces naming conventions, file size limits, and code quality standards.

| Category | Files Audited | Violations | Compliance Rate |
|----------|---------------|------------|-----------------|
| TypeScript Hooks | 28 | 16 | 43% |
| JavaScript Files | 4 | 4 | 0% |
| Shell Scripts | 11 | 11 | 0% |
| Agent Definitions | 67 | 67 | 0% |
| Root Config | 8 | 3 | 63% |
| **Total** | **118** | **101** | **14%** |

---

## Governance Rules Reference

| Rule | Description | Enforcement |
|------|-------------|-------------|
| G1 | No generic filenames (script.*, utils.*, temp*, etc.) | BLOCK |
| G2 | snake_case for backend (.ts/.js), PascalCase for components (.tsx/.jsx) | BLOCK |
| G3 | Minimum 8 characters (excluding extension) | WARN |
| C2 | Minimum 3 lines of actual code | BLOCK |
| T1 | Shell scripts max 20 lines | BLOCK |
| T2 | Prefer TypeScript over JavaScript | WARN |
| S1 | Archive before overwrite | BLOCK |

---

## Critical Violations (BLOCK-level)

### T1: Shell Script Size Violations

All shell scripts exceed the 20-line bootstrap limit:

| File | Lines | Status |
|------|-------|--------|
| session-start-hooks-validation.sh | 246 | **VIOLATION** |
| session-start.sh | 186 | **VIOLATION** |
| integration-test.sh | 125 | **VIOLATION** |
| pre-task-start.sh | 118 | **VIOLATION** |
| post-tool-use.sh | 88 | **VIOLATION** |
| pre-write.sh | 84 | **VIOLATION** |
| setup.sh | 79 | **VIOLATION** |
| session-start-global-mcp.sh | 72 | **VIOLATION** |
| pre-bash.sh | 69 | **VIOLATION** |
| n8n-workflow-validation.sh | 65 | **VIOLATION** |
| post-code-write.sh | 56 | **VIOLATION** |
| pre-task-complete.sh | 45 | **VIOLATION** |

**Remediation:** Shell scripts in claude-config/hooks/ are legacy and have been superseded by TypeScript in hooks/src/. Move to old/ directory.

### G2: Naming Convention Violations

**TypeScript files using kebab-case instead of snake_case:**

| Current Name | Required Name |
|--------------|---------------|
| pre-bash.ts | pre_bash.ts |
| post-tool-use.ts | post_tool_use.ts |
| pre-task-start.ts | pre_task_start.ts |
| pre-task-complete.ts | pre_task_complete.ts |
| post-code-write.ts | post_code_write.ts |
| pre-write.ts | pre_write.ts |
| session-start.ts | session_start.ts |
| workflow-intent.ts | workflow_intent.ts |
| api-key-sync.ts | api_key_sync.ts |
| api-key-detector.ts | api_key_detector.ts |
| child-project-detector.ts | child_project_detector.ts |
| project-detector.ts | project_detector.ts |
| correction-ledger.ts | correction_ledger.ts |
| file_governance.ts | **COMPLIANT** |

### C2: Stub File Violations

| File | Lines of Code | Status |
|------|---------------|--------|
| hooks/fix-utils.js | 1 | **VIOLATION** (stub) |

---

## Warning-Level Violations

### G3: Short Filename Violations (< 8 chars)

| File | Characters | Suggestion |
|------|------------|------------|
| cli.ts | 3 | command_line_interface.ts |
| types.ts | 5 | hook_types.ts |
| utils.ts | 5 | hook_utilities.ts |
| runner.ts | 6 | hook_runner.ts |
| index.ts | 5 | **EXEMPT** (standard) |

### T2: JavaScript Files (Should Be TypeScript)

| File | Lines | Recommendation |
|------|-------|----------------|
| patch-hooks.cjs | 16 | Convert to TypeScript or move to old/ |
| patch2.cjs | 16 | Convert to TypeScript or move to old/ |
| hooks/fix-utils.js | 1 | Delete (stub file) |
| hooks/patch-hooks.js | 16 | Duplicate of patch-hooks.cjs, move to old/ |

---

## Agent Definition Naming

All 67 agent files use kebab-case .md naming. While markdown files are not explicitly governed, consistency suggests adopting snake_case for documentation files.

| Current Pattern | Count | Recommendation |
|-----------------|-------|----------------|
| kebab-case.md | 67 | Consider snake_case.md for consistency |

**Examples:**
- code-reviewer.md -> code_reviewer.md
- typescript-expert.md -> typescript_expert.md
- n8n-mcp-tester.md -> n8n_mcp_tester.md

---

## Compliant Files

### Fully Compliant TypeScript Files

| File | Status |
|------|--------|
| file_governance.ts | **COMPLIANT** |
| registry.ts | **COMPLIANT** |
| healer.ts | **COMPLIANT** |
| detector.ts | **COMPLIANT** |
| tester.ts | **COMPLIANT** |
| writer.ts | **COMPLIANT** |

### Exempt Files (Industry Standards)

| File | Reason |
|------|--------|
| package.json | npm standard |
| tsconfig.json | TypeScript standard |
| README.md | Documentation standard |
| CLAUDE.md | Claude Code standard |
| AGENTS.md | Claude Code standard |
| .gitignore | Git standard |
| .env | Environment standard |

---

## Recommended Actions

### Immediate (BLOCK-level fixes)

1. **Archive legacy shell hooks:**
   mv claude-config/hooks/*.sh old/shell-hooks-legacy-20260112/

2. **Delete stub file:**
   mv hooks/fix-utils.js old/

3. **Archive duplicate patch files:**
   mv patch-hooks.cjs patch2.cjs hooks/patch-hooks.js old/

### Short-term (Naming convention fixes)

4. **Rename TypeScript files to snake_case:**
   In hooks/src/hooks/:
   git mv pre-bash.ts pre_bash.ts
   git mv post-tool-use.ts post_tool_use.ts
   git mv pre-task-start.ts pre_task_start.ts
   etc.

5. **Update imports in affected files after renaming**

### Long-term (Consistency improvements)

6. **Consider renaming short files:**
   - cli.ts -> command_line_interface.ts
   - utils.ts -> hook_utilities.ts
   - runner.ts -> hook_runner.ts

7. **Evaluate agent markdown naming convention:**
   - Decide whether to migrate 67 agents to snake_case
   - Create migration script if proceeding

---

## Governance Framework Status

| Component | Implemented | Enforced |
|-----------|-------------|----------|
| Generic filename blocking (G1) | Yes | Runtime |
| Snake case enforcement (G2) | Yes | Runtime |
| Descriptive filename (G3) | Yes | Warn only |
| Stub file blocking (C2) | Yes | Runtime |
| Shell script size (T1) | Yes | Runtime |
| TypeScript preference (T2) | Yes | Warn only |
| Archive before replace (S1) | Partial | Not enforced |

---

## Conclusion

The Spinal Cord project has significant governance debt that accumulated before the framework was implemented. The TypeScript hook system is modern and follows most conventions, but:

1. **Legacy shell scripts** need archival (11 files)
2. **Naming conventions** need migration (16 TypeScript files)
3. **Orphan utility files** need cleanup (4 JavaScript files)

Estimated effort: 2-3 hours for full compliance.

---

*Report generated by Claude Code governance audit system*
