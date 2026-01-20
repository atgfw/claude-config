/**
 * Hook Framework Types
 * Defines the contract for all Claude Code hooks
 */
export type HookEventName = 'PreToolUse' | 'PostToolUse' | 'UserPromptSubmit' | 'Stop' | 'SessionStart';
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
export type HookInput = PreToolUseInput | PostToolUseInput | UserPromptSubmitInput | StopInput | SessionStartInput;
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
export type HookOutput = PreToolUseOutput | PostToolUseOutput | UserPromptSubmitOutput | StopOutput | SessionStartOutput;
export interface HookResult {
    decision: 'allow' | 'block' | 'warn';
    reason?: string;
    context?: Record<string, unknown>;
    suggestions?: string[];
}
export interface HookDefinition<TInput extends HookInput, TOutput extends HookOutput> {
    name: string;
    eventName: HookEventName;
    description: string;
    execute: (input: TInput) => Promise<TOutput>;
}
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
export type EscalationCategory = 'governance' | 'testing' | 'tooling' | 'pattern' | 'performance' | 'security' | 'documentation' | 'meta';
export type EscalationSeverity = 'low' | 'medium' | 'high' | 'critical';
export type EscalationStatus = 'pending' | 'acknowledged' | 'pattern-detected' | 'proposal-generated' | 'hook-implemented' | 'resolved' | 'rejected';
export interface EscalationEntry {
    id: string;
    symptomHash: string;
    timestamp: string;
    projectPath: string;
    projectName: string;
    symptom: string;
    context: string;
    proposedSolution: string;
    category: EscalationCategory;
    severity: EscalationSeverity;
    status: EscalationStatus;
    occurrenceCount: number;
    crossProjectCount: number;
    relatedProjects: string[];
    relatedCorrectionIds: string[];
    relatedHookNames: string[];
    generatedProposalPath?: string;
    implementedHookName?: string;
    lastEscalatedAt: string;
    cooldownUntil?: string;
    resolvedAt?: string;
    resolutionNote?: string;
    rejectionReason?: string;
}
export interface EscalationConfig {
    patternThreshold: number;
    crossProjectThreshold: number;
    cooldownMinutes: number;
    autoProposalEnabled: boolean;
    severityWeights: Record<EscalationSeverity, number>;
}
export interface EscalationRegistry {
    escalations: Record<string, EscalationEntry>;
    symptomIndex: Record<string, string[]>;
    projectIndex: Record<string, string[]>;
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
    isNovel: boolean;
    novelCount: number;
    escalation: EscalationEntry;
    patternDetected: boolean;
}
//# sourceMappingURL=types.d.ts.map