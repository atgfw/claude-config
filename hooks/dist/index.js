/**
 * Claude Code Hooks - TypeScript Implementation
 *
 * Centralized hook system for deterministic enforcement across all projects.
 * Part of the Spinal Cord architecture.
 */
// Export types
export * from './types.js';
// Export task specification schema
export * from './schema/task_specification.js';
// Export utilities
export * from './utils.js';
// Export runner
export { registerHook, runHook, main } from './runner.js';
// Import hooks to register them
import './hooks/pre_bash.js';
import './hooks/pre_write.js';
import './hooks/pre_build_gate.js';
import './hooks/code_node_test_validator.js';
import './hooks/post_code_write.js';
import './hooks/post_tool_use.js';
import './hooks/pre_task_complete.js';
import './hooks/pre_task_start.js';
import './hooks/session_start.js';
import './hooks/api_key_detector.js';
import './hooks/primordial_pipeline_gate.js';
import './hooks/escalation_trigger.js';
import './hooks/prompt_escalation_detector.js';
import './hooks/plan_completeness_gate.js';
import './hooks/self_audit_enforcement.js';
import './hooks/hierarchical_testing_gate.js';
import './hooks/browser_automation_gate.js';
import './hooks/login_detection_escalator.js';
import './hooks/evaluation_gate_wrapper.js';
import './hooks/quality_check.js';
import './hooks/task_completion_gate.js';
// Export individual hooks for direct use/testing
export { preBashHook } from './hooks/pre_bash.js';
export { preWriteHook } from './hooks/pre_write.js';
export { preBuildGateHook } from './hooks/pre_build_gate.js';
export { codeNodeTestValidatorHook } from './hooks/code_node_test_validator.js';
export { postCodeWriteHook } from './hooks/post_code_write.js';
export { postToolUseHook } from './hooks/post_tool_use.js';
export { preTaskCompleteHook } from './hooks/pre_task_complete.js';
export { preTaskStartHook } from './hooks/pre_task_start.js';
export { sessionStartHook } from './hooks/session_start.js';
export { apiKeyDetectorHook } from './hooks/api_key_detector.js';
export { primordialPipelineGateHook } from './hooks/primordial_pipeline_gate.js';
export { escalationTriggerHook } from './hooks/escalation_trigger.js';
export { promptEscalationDetectorHook } from './hooks/prompt_escalation_detector.js';
export { planCompletenessGateHook } from './hooks/plan_completeness_gate.js';
export { selfAuditEnforcementHook } from './hooks/self_audit_enforcement.js';
export { hierarchicalTestingGateHook } from './hooks/hierarchical_testing_gate.js';
export { browserAutomationGateHook } from './hooks/browser_automation_gate.js';
export { loginDetectionEscalatorHook } from './hooks/login_detection_escalator.js';
export { evaluationGateWrapperHook } from './hooks/evaluation_gate_wrapper.js';
export { qualityCheckHook } from './hooks/quality_check.js';
export { evaluationGateHook, defaultEvaluationGateConfig, } from './hooks/evaluation_gate.js';
// Export MCP management
export * from './mcp/registry.js';
export * from './mcp/healer.js';
export * from './mcp/api_key_sync.js';
// Export tool router
export * from './router/index.js';
// Export correction ledger
export * from './ledger/correction_ledger.js';
// Export audit request registry (cross-session audits)
export { loadAuditRegistry, saveAuditRegistry, requestAudit, getPendingAudits, getAuditRequest, submitAuditReview, checkAuditStatus, formatAuditRequest, getProjectAudits, } from './ledger/audit_request_registry.js';
// Export escalation registry (renamed to avoid conflicts with mcp/registry.js and correction_ledger.js)
export { getRegistryPath as getEscalationRegistryPath, loadRegistry as loadEscalationRegistry, saveRegistry as saveEscalationRegistry, createEmptyRegistry as createEmptyEscalationRegistry, generateSymptomHash, createEscalation, updateStatus as updateEscalationStatus, incrementOccurrence, addRelatedProject, linkToCorrection, findBySymptomHash, findBySymptomHashAndProject, checkPatternThreshold, isInCooldown, calculatePriority, getByPriority, getPendingEscalations, getStats as getEscalationStats, getHighPriorityEscalations, getPatternDetectedEscalations, getActionableEscalations, } from './ledger/escalation_registry.js';
// Export escalation utilities
export * from './utils/escalate.js';
// Export escalation pattern detection
export * from './escalation/pattern_detector.js';
// Export escalation proposal generator
export * from './escalation/proposal_generator.js';
// Export escalation reporter
export * from './escalation/reporter.js';
// Export test run registry (primordial pipeline)
// Note: Renamed to avoid conflict with mcp/registry.js exports
export { loadRegistry as loadTestRunRegistry, saveRegistry as saveTestRunRegistry, generateInputHash, generateEntityId, generateRunId, getOrCreateEntity, registerChild, recordTestRun, markEntityStale, checkEntityHealth, buildHierarchy, getEntityByPath, getUnhealthyEntities, getTestingSummary, formatHealthReport, formatEntityProgress, } from './ledger/test_run_registry.js';
// Export enforcement
export * from './enforcement/child_project_detector.js';
// Export context detection
export * from './context/index.js';
// Export intent hooks
export * from './hooks/intent/index.js';
// Export governance
export { n8nWorkflowGovernanceHook } from './governance/n8n_workflow_governance.js';
export { elevenlabsAgentGovernanceHook } from './governance/elevenlabs_agent_governance.js';
export { n8nDualTriggerValidatorHook } from './governance/n8n_dual_trigger_validator.js';
export { n8nWebhookPathValidatorHook } from './governance/n8n_webhook_path_validator.js';
export { n8nEnvVarProvisionerHook } from './governance/n8n_env_var_provisioner.js';
export { childProjectOverrideDetectorHook } from './governance/child_project_override_detector.js';
export { ghostFileDetectorHook } from './governance/ghost_file_detector.js';
export { staleWorkflowJsonDetectorHook } from './governance/stale_workflow_json_detector.js';
export { specCompletenessValidatorHook } from './governance/spec_completeness_validator.js';
export { toolFilterHook } from './governance/tool_filter.js';
export { inlineScriptValidatorHook } from './hooks/inline_script_validator.js';
export { vitestMigrationEnforcerHook } from './hooks/vitest_migration_enforcer.js';
export { workflowPublishingGateHook } from './hooks/workflow_publishing_gate.js';
export { webhookMethodsValidatorHook } from './hooks/webhook_methods_validator.js';
export { evaluationGateExpanderHook } from './hooks/evaluation_gate_expander.js';
export { goalInjectorHook, goalInjectorPostToolUse, goalInjectorSessionStart, goalInjectorStop, getActiveGoalContext, } from './hooks/goal_injector.js';
export { sessionHydrator } from './hooks/session_hydrator.js';
export { artifactGoalInjector } from './hooks/artifact_goal_injector.js';
export { checklistReadHook, checklistWriteHook, parseFilePath, } from './hooks/checklist_sync_hooks.js';
export { taskCompletionGateHook } from './hooks/task_completion_gate.js';
export { taskGoalSync, getCurrentTaskGoal, isTaskCurrentFocus } from './hooks/task_goal_sync.js';
export { taskSpecValidatorHook, validateTaskSpec, validateMinimalSpec, formatValidationIssues, } from './hooks/task_spec_validator.js';
export { bunEnforcerHook, detectBlockedCommands } from './hooks/bun_enforcer.js';
export { cloudObjectCreationGateHook } from './governance/cloud_object_creation_gate.js';
export { llmModelValidatorHook } from './governance/llm_model_validator.js';
// Import governance hooks to register them
import './governance/n8n_workflow_governance.js';
import './governance/elevenlabs_agent_governance.js';
import './governance/n8n_dual_trigger_validator.js';
import './governance/n8n_webhook_path_validator.js';
import './governance/n8n_env_var_provisioner.js';
import './governance/child_project_override_detector.js';
import './governance/ghost_file_detector.js';
import './governance/stale_workflow_json_detector.js';
import './governance/spec_completeness_validator.js';
import './governance/tool_filter.js';
import './governance/cloud_object_creation_gate.js';
import './governance/llm_model_validator.js';
import './governance/n8n_node_reference_validator.js';
import './hooks/inline_script_validator.js';
import './hooks/vitest_migration_enforcer.js';
import './hooks/workflow_publishing_gate.js';
import './hooks/webhook_methods_validator.js';
import './hooks/evaluation_gate_expander.js';
// Unified hooks (lean and mean - consolidates multiple hooks)
import './hooks/unified_write_gate.js';
import './hooks/unified_post_tool.js';
import './hooks/unified_prompt_handler.js';
// Goal injector (sharp pointed goal every turn)
import './hooks/goal_injector.js';
// Session hydrator (auto-load linked artifacts on start)
import './hooks/session_hydrator.js';
// Artifact goal injector (suggest goals for artifacts)
import './hooks/artifact_goal_injector.js';
// Checklist sync hooks (reconcile on read/write)
import './hooks/checklist_sync_hooks.js';
// Task-goal synchronization (session-scoped goals from tasks)
import './hooks/task_goal_sync.js';
// Task specification validator (enforces 11-section schema)
import './hooks/task_spec_validator.js';
// Bun enforcer (blocks npm/node/npx, requires bun)
import './hooks/bun_enforcer.js';
// Context summary trigger (replaces auto-compact)
import './hooks/context-summary-trigger.js';
// Git hooks (GitHub framework)
import './git/secret_scanner.js';
import './git/commit_message_validator.js';
import './git/branch_naming_validator.js';
import './git/changelog_generator.js';
import './git/semantic_version_calculator.js';
// Export git hooks
export { secretScannerHook } from './git/secret_scanner.js';
export { commitMessageValidatorHook } from './git/commit_message_validator.js';
export { branchNamingValidatorHook } from './git/branch_naming_validator.js';
export { changelogGeneratorHook } from './git/changelog_generator.js';
export { semanticVersionCalculatorHook } from './git/semantic_version_calculator.js';
// GitHub issue tracking
export { loadTaxonomy, provisionLabels, getLabelsForTitle, getLabelsForSource, } from './github/label_taxonomy.js';
export { TITLE_REGEX, REQUIRED_BODY_SECTIONS, validateTitle, validateBody, findDuplicates, } from './github/issue_conventions.js';
export { createItem, renderToGitHubBody, renderToTaskCreate, renderToTasksMd, renderToPlanSteps, parseFromGitHubIssue, parseFromTasksMd, } from './github/unified_checklist.js';
export { buildKanbanContext, buildRows, renderKanban, extractLifecycle, extractPriority, priorityRank, } from './github/issue_kanban.js';
export { createIssue, closeIssue, createFromCorrection, createFromEscalation, createFromOpenSpec, computeKeywordOverlap, } from './github/issue_crud.js';
export { loadRegistry as loadIssueSyncRegistry, saveRegistry as saveIssueSyncRegistry, findEntry as findSyncEntry, upsertEntry as upsertSyncEntry, syncFromGitHub, onTaskComplete, linkTask, linkOpenSpec, } from './github/task_source_sync.js';
// Export lint plugin (spinal-quality ESLint rules)
export * as lint from './lint/index.js';
//# sourceMappingURL=index.js.map