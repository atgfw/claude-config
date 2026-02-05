# Capability: n8n Local File Blocking

## Goal

Block n8n local workflow files - enforce cloud-only storage with node notes for documentation

## Overview

Prevents local n8n workflow JSON files from accumulating outside temp directories. Cloud is the single source of truth; local folders are workspaces only.

---

## ADDED Requirements

### Requirement: Block workflow JSON writes outside temp directories

The system SHALL block Write and Edit operations targeting n8n workflow JSON files outside of `temp/`, `tmp/`, or `old/` directories.

#### Scenario: Block Write to project root

- **GIVEN** a Write operation targeting `projects/my-workflow/workflow.json`
- **AND** the content contains n8n workflow structure (nodes array, connections object)
- **WHEN** the stale workflow JSON detector executes
- **THEN** operation is BLOCKED with reason "Cannot write workflow JSON outside temp/ - cloud is source of truth"

#### Scenario: Allow Write to temp directory

- **GIVEN** a Write operation targeting `projects/my-workflow/temp/edit-buffer.json`
- **AND** the content contains n8n workflow structure
- **WHEN** the stale workflow JSON detector executes
- **THEN** operation is ALLOWED

#### Scenario: Allow non-workflow JSON

- **GIVEN** a Write operation targeting `projects/my-workflow/package.json`
- **WHEN** the stale workflow JSON detector executes
- **THEN** operation is ALLOWED (not a workflow file)

---

### Requirement: Block n8n workflow download via MCP

The system SHALL block `mcp__n8n-mcp__n8n_get_workflow` calls to prevent downloading full workflow JSON locally.

#### Scenario: Block get_workflow call

- **GIVEN** an MCP tool call to `mcp__n8n-mcp__n8n_get_workflow`
- **WHEN** the n8n download blocker executes
- **THEN** operation is BLOCKED with guidance to use n8n web UI or partial update tools

#### Scenario: Allow list_workflows call

- **GIVEN** an MCP tool call to `mcp__n8n-mcp__n8n_list_workflows`
- **WHEN** the n8n download blocker executes
- **THEN** operation is ALLOWED (listing, not downloading)

#### Scenario: Allow partial update call

- **GIVEN** an MCP tool call to `mcp__n8n-mcp__n8n_update_partial_workflow`
- **WHEN** the n8n download blocker executes
- **THEN** operation is ALLOWED (targeted edit, not full download)

---

### Requirement: Auto-cleanup temp directory after workflow push

The system SHALL clear `.json` files from the project's `temp/` directory after successful workflow create/update operations.

#### Scenario: Cleanup after successful update

- **GIVEN** a successful `mcp__n8n-mcp__n8n_update_full_workflow` operation
- **AND** `temp/edit-buffer.json` exists in the project directory
- **WHEN** the post-update cleanup hook executes
- **THEN** `temp/edit-buffer.json` is deleted
- **AND** cleanup is logged for visibility

#### Scenario: No cleanup on failed update

- **GIVEN** a failed `mcp__n8n-mcp__n8n_update_full_workflow` operation (error in result)
- **AND** `temp/edit-buffer.json` exists in the project directory
- **WHEN** the post-update cleanup hook executes
- **THEN** `temp/edit-buffer.json` is NOT deleted (preserve work)

#### Scenario: Cleanup after successful create

- **GIVEN** a successful `mcp__n8n-mcp__n8n_create_workflow` operation
- **AND** `temp/new-workflow.json` exists in the project directory
- **WHEN** the post-update cleanup hook executes
- **THEN** `temp/new-workflow.json` is deleted

---

## MODIFIED Requirements

### Requirement: Stale workflow JSON detection (upgraded severity)

The system SHALL warn on Read operations and BLOCK on Write/Edit operations for n8n workflow JSON outside temp directories.

**Previous behavior:** WARN on all operations (Read/Write/Edit)
**New behavior:** BLOCK on Write/Edit, WARN on Read

#### Scenario: Warn on Read of stale workflow

- **GIVEN** a Read operation targeting `projects/my-workflow/old-workflow.json`
- **AND** the file contains n8n workflow structure
- **WHEN** the stale workflow JSON detector executes
- **THEN** operation is ALLOWED with warning about cloud being source of truth

#### Scenario: Block on Edit of stale workflow

- **GIVEN** an Edit operation targeting `projects/my-workflow/old-workflow.json`
- **AND** the file contains n8n workflow structure
- **WHEN** the stale workflow JSON detector executes
- **THEN** operation is BLOCKED with guidance to edit via cloud

---

## REMOVED Requirements

### Requirement: Local workflow file requirement (deprecated)

The `workflow-local-file-enforcer.yaml` spec is deprecated and removed. It required local workflow JSON files before cloud deployment, which contradicts the cloud-only direction.

**Reason for removal:** Creates two sources of truth, causes ghost file confusion, issues #19/#33.
