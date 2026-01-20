# PROJECT-DIRECTIVE.md

## Project Name
Claude Code Spinal Cord

## Purpose
Centralized hook system and infrastructure for deterministic enforcement across all Claude Code projects.

## Scope
- Hook system (TypeScript)
- MCP server management
- Tool routing
- Ledger tracking
- Governance enforcement

## Current Phase
Maintenance and Enhancement

## Key Files
- `settings.json` - Global hook configuration
- `hooks/src/` - TypeScript hook implementations
- `hooks/dist/` - Compiled JavaScript
- `statusline.js` - Context usage monitoring
- `mcp/` - MCP server registry

## Build Commands
```bash
cd hooks && npm run build
cd hooks && npm test
```

## Testing Requirements
- All hooks must have Vitest tests
- TDD approach required for new hooks
