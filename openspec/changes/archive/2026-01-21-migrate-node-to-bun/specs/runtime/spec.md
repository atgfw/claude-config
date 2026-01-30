## ADDED Requirements

### Requirement: Bun Runtime Standard

The Spinal Cord MUST use Bun as the exclusive JavaScript/TypeScript runtime for all hooks, scripts, and utilities.

#### Scenario: Hook execution uses Bun
- **WHEN** any hook is invoked via settings.json
- **THEN** the command MUST use `bun` instead of `node`
- **AND** execution latency SHOULD be <100ms for simple hooks

#### Scenario: Package management uses Bun
- **WHEN** dependencies are installed or updated in hooks/
- **THEN** `bun install` MUST be used
- **AND** `bun.lockb` MUST be the lock file (not package-lock.json)

#### Scenario: Test execution uses Bun
- **WHEN** tests are run in the hooks package
- **THEN** Vitest MUST run under Bun runtime
- **AND** vitest.config.ts environment MUST be set to 'bun'

### Requirement: Bun Version Minimum

The Spinal Cord MUST enforce a minimum Bun version to ensure Windows compatibility and feature parity.

#### Scenario: Version check on setup
- **WHEN** setup.sh is executed
- **THEN** Bun version MUST be checked
- **AND** version MUST be >= 1.1.0
- **AND** user MUST be prompted to upgrade if version is insufficient

#### Scenario: Package.json declares Bun requirement
- **WHEN** package.json is read
- **THEN** engines field MUST specify `"bun": ">=1.1.0"`
- **AND** packageManager field SHOULD specify exact Bun version

### Requirement: Node.js Compatibility Preservation

The Spinal Cord MUST maintain compatibility with npm ecosystem for MCP server management.

#### Scenario: MCP recovery uses npm
- **WHEN** an MCP server fails health check
- **THEN** recovery procedures MAY use `npm` or `npx` commands
- **AND** Bun's npm compatibility layer MUST be sufficient

#### Scenario: No Bun-specific APIs required
- **WHEN** hook code is written or modified
- **THEN** code MUST remain compatible with Node.js semantics
- **AND** Bun-specific APIs MUST NOT be required (optional enhancement only)

### Requirement: Settings.json Hook Command Format

All hook commands in settings.json MUST follow the standardized Bun invocation pattern.

#### Scenario: PreToolUse hook format
- **WHEN** a PreToolUse hook is configured
- **THEN** command MUST follow pattern: `bun -e "process.argv.splice(1,0,'cli.js');require(require('path').join(require('os').homedir(),'.claude','hooks','dist','cli.js'))" <hook-name>`

#### Scenario: PostToolUse hook format
- **WHEN** a PostToolUse hook is configured
- **THEN** command MUST use same pattern with appropriate hook name

#### Scenario: SessionStart hook format
- **WHEN** SessionStart hook is configured
- **THEN** command MUST use same pattern with `session-start` hook name

### Requirement: Statusline Bun Execution

The statusline script MUST be executed via Bun runtime.

#### Scenario: Statusline command format
- **WHEN** statusLine is configured in settings.json
- **THEN** command MUST be `bun <path-to-statusline.js>`
- **AND** script MUST execute without errors under Bun
