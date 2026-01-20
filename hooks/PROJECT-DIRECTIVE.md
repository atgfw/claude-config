# PROJECT-DIRECTIVE.md

## Project Name
Claude Code Hooks System

## Purpose
TypeScript-based hook implementations for the Spinal Cord enforcement system.

## Scope
- PreToolUse hooks (pre_bash, pre_write, gates)
- PostToolUse hooks (escalation, validation)
- UserPromptSubmit hooks (context triggers, intent detection)
- SessionStart hooks (MCP health, environment setup)
- Governance hooks (n8n, ElevenLabs, ServiceTitan)

## Current Phase
Active Development

## Build Commands
```bash
npm run build    # Compile TypeScript to dist/
npm test         # Run Vitest tests
npm run lint     # Lint TypeScript
```

## Testing Requirements
- All hooks must have Vitest tests in tests/ directory
- TDD approach: write tests before implementation
