# Change: Enforce n8n Object Governance

## Why

Current n8n governance lacks comprehensive naming conventions, node documentation requirements, and code node development standards. This leads to:
- Inconsistent workflow naming (mixing `[ST]` tags with full names like `ServiceTitan`)
- Version numbers in names violating object governance (`v2`, `r3`)
- Missing or shallow node notes reducing workflow comprehension
- Inline logic scattered across nodes instead of centralized in code nodes
- Code node JavaScript not benefiting from local development and linting

## What Changes

**Naming Conventions:**
- Reserve `[tag]` syntax ONLY for systems without built-in tag features
- Use full system names as prefixes (e.g., `ServiceTitan_` not `[ST]`)
- Workflows auto-tagged as `[DEV]` during development
- **BREAKING**: Ban version numbers in object names (`v1`, `v2`, `r1` patterns)
- Enforce snake_case for n8n node names (aligns with file governance)
- Ban integers in programming object names globally (unless canonical for a library)

**Node Documentation:**
- Require substantial, meaningful notes on ALL n8n nodes
- Mandate "Display Note in Flow?" enabled for all nodes

**Code Node Development:**
- Maximize workflow logic into JavaScript code nodes
- Minimize inline logic, mustaching, and expressions in other node types
- Code node JavaScript developed/tested locally with mock data first
- Standard JavaScript/TypeScript linting applies to code node content
- No special treatment for code node JS - same quality standards

**Tool Preference Hierarchy:**
- Define cloud object modification preference chain
- Define local object modification preference chain
- Define ad-hoc code execution preference chain (avoid Python, avoid full scripts)

## Impact

- **Affected specs**: file-governance (extends integer ban globally), n8n-workflow-governance (naming rules)
- **Affected code**:
  - `hooks/src/governance/n8n_workflow_governance.ts` - naming validation
  - `hooks/src/hooks/code_node_test_validator.ts` - local testing enforcement
  - `tool-router/tool-router.json` - new preference hierarchies
- **New hooks needed**:
  - `n8n_naming_validator` - enforce naming conventions
  - `n8n_node_note_validator` - enforce node documentation
  - `code_node_linting_gate` - enforce JS linting on code node content
