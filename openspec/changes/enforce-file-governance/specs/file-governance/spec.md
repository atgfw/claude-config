# Spec: File Governance

## ADDED Requirements

### Requirement: Generic Filename Blocking (G1)

The system SHALL block creation of files with generic names.

**Blocked patterns:**
- `script.*`, `utils.*`, `test.*`, `data.*`, `config.*` (without prefix)
- `temp*`, `tmp*`, `new*`, `old*`, `final*`
- `v1*`, `v2*`, `r1*`, `r2*` (versioned names)

#### Scenario: Block generic script file
- GIVEN a Write operation to `script.js`
- WHEN pre-write hook executes
- THEN operation is BLOCKED with reason "Generic filename banned - use descriptive name"

#### Scenario: Allow descriptive script file
- GIVEN a Write operation to `user_import_script.js`
- WHEN pre-write hook executes
- THEN operation is ALLOWED

---

### Requirement: Snake Case Enforcement (G2)

The system SHALL enforce snake_case for backend files.

**Exempt from snake_case:**
- Tier 1 standards: `Dockerfile`, `Makefile`, `package.json`, `.gitignore`, `.env`, `README.md`, `LICENSE`, `CHANGELOG.md`
- React/Vue components: `*.tsx`, `*.jsx` with PascalCase

**Enforced snake_case:**
- All `.ts`, `.js`, `.json`, `.yaml`, `.yml` backend files
- Pattern: `[a-z0-9_]+\.[a-z]+`

#### Scenario: Block camelCase backend file
- GIVEN a Write operation to `userService.ts`
- WHEN pre-write hook executes
- THEN operation is BLOCKED with suggestion "Rename to user_service.ts"

#### Scenario: Allow PascalCase React component
- GIVEN a Write operation to `UserProfile.tsx`
- WHEN pre-write hook executes
- THEN operation is ALLOWED (exempt as component)

---

### Requirement: Descriptive Filename (G3)

The system SHALL require descriptive filenames with minimum verbosity.

**Rules:**
- Minimum 2 words separated by underscore (or PascalCase words for components)
- Minimum 12 characters (excluding extension)
- Single-word exceptions: industry standards only

#### Scenario: Block short filename
- GIVEN a Write operation to `auth.ts`
- WHEN pre-write hook executes
- THEN operation is BLOCKED with suggestion "Use descriptive name like authentication_service.ts"

---

### Requirement: Empty File Blocking (C2)

The system SHALL block creation of stub/empty files.

**Rules:**
- Minimum 3 lines of actual code (excluding comments, blank lines, imports-only)

#### Scenario: Block stub file
- GIVEN a Write operation with content `export {}`
- WHEN pre-write hook executes
- THEN operation is BLOCKED with reason "Empty/stub files banned"

---

### Requirement: Shell Script Size Limit (T1)

The system SHALL limit shell scripts to bootstrap purposes only.

**Rules:**
- Maximum 20 lines for `.sh`, `.ps1`, `.bash`, `.zsh` files
- Business logic must be in TypeScript

#### Scenario: Block oversized shell script
- GIVEN a Write operation to `deploy.sh` with 50 lines
- WHEN pre-write hook executes
- THEN operation is BLOCKED with reason "Shell scripts limited to 20 lines - move logic to TypeScript"

---

### Requirement: Archive Before Replace (S1)

The system SHALL require archiving before overwriting existing files.

**Rules:**
- Check if target file exists
- If exists, require move to `/old/` directory first
- Archive format: `{filename}_archived_{YYYY_MM_DD}.{ext}`

#### Scenario: Block overwrite without archive
- GIVEN an existing file `user_service.ts`
- AND a Write operation to `user_service.ts`
- WHEN pre-write hook executes
- THEN operation is BLOCKED with reason "Archive existing file first: mv user_service.ts old/user_service_archived_2026_01_12.ts"

---

## MODIFIED Requirements

### Requirement: Pre-Write Hook Extension

The existing pre-write hook SHALL be extended to include:
1. Generic filename check (G1)
2. Snake case validation (G2)
3. Descriptive name validation (G3)
4. Empty file check (C2)
5. Shell script size check (T1)
6. Archive enforcement (S1)

**Validation order:**
1. Emoji check (existing)
2. Morph MCP check (existing)
3. Filename governance (new)
4. Content governance (new)
5. Supersession check (new)
