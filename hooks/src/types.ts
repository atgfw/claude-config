/**
 * Hook Framework Types
 * Defines the contract for all Claude Code hooks
 */

// ============================================================================
// Hook Event Types
// ============================================================================

export type HookEventName =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'UserPromptSubmit'
  | 'Stop'
  | 'SessionStart';

// ============================================================================
// Hook Input Types
// ============================================================================

export interface PreToolUseInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface PostToolUseInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output?: unknown;
}

export interface UserPromptSubmitInput {
  prompt: string;
  session_id?: string;
}

export interface StopInput {
  reason?: string;
  session_id?: string;
}

export interface SessionStartInput {
  session_id?: string;
  working_directory?: string;
}

export type HookInput =
  | PreToolUseInput
  | PostToolUseInput
  | UserPromptSubmitInput
  | StopInput
  | SessionStartInput;

// ============================================================================
// Hook Output Types
// ============================================================================

export type PermissionDecision = 'allow' | 'deny' | 'ask';
export type StopDecision = 'approve' | 'block';

export interface PreToolUseOutput {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse';
    permissionDecision: PermissionDecision;
    permissionDecisionReason?: string;
  };
}

export interface PostToolUseOutput {
  hookSpecificOutput: {
    hookEventName: 'PostToolUse';
    decision?: 'block';
    reason?: string;
    additionalContext?: string;
  };
}

export interface UserPromptSubmitOutput {
  hookEventName: 'UserPromptSubmit';
  additionalContext?: string;
}

export interface StopOutput {
  decision: StopDecision;
  reason?: string;
}

export interface SessionStartOutput {
  hookEventName: 'SessionStart';
  additionalContext?: string;
}

export type HookOutput =
  | PreToolUseOutput
  | PostToolUseOutput
  | UserPromptSubmitOutput
  | StopOutput
  | SessionStartOutput;

// ============================================================================
// Hook Result (Internal)
// ============================================================================

export interface HookResult {
  decision: 'allow' | 'block' | 'warn';
  reason?: string;
  context?: Record<string, unknown>;
  suggestions?: string[];
}

// ============================================================================
// Hook Definition
// ============================================================================

export interface HookDefinition<TInput extends HookInput, TOutput extends HookOutput> {
  name: string;
  eventName: HookEventName;
  description: string;
  execute: (input: TInput) => Promise<TOutput>;
}

// ============================================================================
// Correction Ledger Types
// ============================================================================

export interface CorrectionEntry {
  id: string;
  timestamp: string;
  symptom: string;
  rootCause: string;
  hookToPrevent: string;
  hookImplemented: boolean;
  recurrenceCount: number;
  lastRecurrence?: string;
}

export interface CorrectionLedger {
  entries: CorrectionEntry[];
  lastUpdated: string;
}

// ============================================================================
// Session Check Types
// ============================================================================

export interface SessionCheckResult {
  name: string;
  passed: boolean;
  severity: 'strict' | 'warning' | 'warn' | 'info';
  message: string;
  details?: string[];
  selfHealed?: boolean;
  selfHealAction?: string;
}

// ============================================================================
// MCP Server Registry Types
// ============================================================================

export interface MCPServerHealth {
  status: 'healthy' | 'degraded' | 'failed' | 'unknown';
  lastCheck: string;
  latencyMs?: number;
  errorMessage?: string;
}

export interface MCPServerEntry {
  name: string;
  package: string;
  version?: string;
  healthCheck: string;
  recoveryProcedure: string;
  health: MCPServerHealth;
  failureHistory: Array<{
    timestamp: string;
    error: string;
    recovered: boolean;
  }>;
}

export interface MCPServerRegistry {
  servers: MCPServerEntry[];
  lastUpdated: string;
}

// ============================================================================
// Tool Router Types
// ============================================================================

export interface ToolPreference {
  tool: string;
  priority: number;
  conditions?: {
    mcpHealthy?: string[];
    fileTypes?: string[];
    operations?: string[];
  };
}

export interface ToolRoute {
  operation: string;
  preferences: ToolPreference[];
  fallback: string;
}

export interface ToolRouterConfig {
  routes: ToolRoute[];
  lastResearchUpdate: string;
  researchSources: string[];
}

// ============================================================================
// Escalation Registry Types
// ============================================================================

export type EscalationCategory =
  | 'governance' // Rule enforcement gaps
  | 'testing' // Test framework issues
  | 'tooling' // Tool routing/MCP issues
  | 'pattern' // Missing code pattern enforcement
  | 'performance' // Performance bottlenecks
  | 'security' // Security concerns
  | 'documentation' // Missing/incorrect docs
  | 'meta'; // Issues with escalation system itself

export type EscalationSeverity =
  | 'low' // Minor inconvenience
  | 'medium' // Recurring friction
  | 'high' // Blocks workflow
  | 'critical'; // System integrity at risk

export type EscalationStatus =
  | 'pending' // New escalation
  | 'acknowledged' // Human/system noticed it
  | 'pattern-detected' // Threshold met across projects
  | 'proposal-generated' // OpenSpec proposal created
  | 'hook-implemented' // Hook now prevents this
  | 'resolved' // Issue addressed
  | 'rejected'; // Not actionable / by design

export interface EscalationEntry {
  id: string; // SHA-256 prefix (16 chars)
  symptomHash: string; // Hash of normalized symptom for deduplication
  timestamp: string; // ISO timestamp
  projectPath: string; // Child project path
  projectName: string; // Human-readable project name

  // Core escalation data
  symptom: string; // What went wrong
  context: string; // Surrounding circumstances
  proposedSolution: string; // What should happen

  // Classification
  category: EscalationCategory;
  severity: EscalationSeverity;
  status: EscalationStatus;

  // Tracking
  occurrenceCount: number; // Times in THIS project
  crossProjectCount: number; // Different projects reporting
  relatedProjects: string[]; // Project paths with same symptom

  // Linkage
  relatedCorrectionIds: string[]; // Links to correction ledger
  relatedHookNames: string[]; // Hooks that partially address this
  generatedProposalPath?: string; // OpenSpec proposal if generated
  implementedHookName?: string; // Hook that resolved this

  // Cooldown
  lastEscalatedAt: string;
  cooldownUntil?: string;

  // Resolution
  resolvedAt?: string;
  resolutionNote?: string;
  rejectionReason?: string;
}

export interface EscalationConfig {
  patternThreshold: number; // Occurrences to trigger proposal (default: 3)
  crossProjectThreshold: number; // Different projects to trigger (default: 2)
  cooldownMinutes: number; // Minutes between same escalation (default: 30)
  autoProposalEnabled: boolean; // Generate OpenSpec proposals automatically
  severityWeights: Record<EscalationSeverity, number>; // For prioritization
}

export interface EscalationRegistry {
  escalations: Record<string, EscalationEntry>; // Keyed by id
  symptomIndex: Record<string, string[]>; // symptomHash -> escalation ids
  projectIndex: Record<string, string[]>; // projectPath -> escalation ids
  config: EscalationConfig;
  lastUpdated: string;
}

export interface EscalateParams {
  symptom: string;
  context: string;
  proposedSolution: string;
  category: EscalationCategory;
  severity: EscalationSeverity;
  relatedHooks?: string[];
}

export interface EscalationResult {
  id: string;
  isNovel: boolean; // True if new escalation, false if duplicate
  novelCount: number; // Count of unique escalations with this symptomHash
  escalation: EscalationEntry;
  patternDetected: boolean; // True if pattern threshold met
}

// ============================================================================
// Context-Optimized Output Types
// ============================================================================

/**
 * Verbosity levels for hook output
 * Controls how much context is consumed by hook messages
 */
export type VerbosityLevel = 'silent' | 'terse' | 'normal' | 'verbose';

/**
 * Output optimization configuration
 */
export interface OutputConfig {
  verbosity: VerbosityLevel;
  batchThreshold: number; // Items before batching output
  maxContextChars: number; // Max chars for additionalContext
  suppressSuccessLogs: boolean; // Skip [OK] messages in terse mode
}
