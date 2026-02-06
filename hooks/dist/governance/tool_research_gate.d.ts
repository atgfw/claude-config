/**
 * Tool Research Gate Hook
 *
 * BLOCKS creation of automation wrapper files when no research document exists.
 * Enforces pre-implementation research to prevent reinventing the wheel.
 *
 * Detection:
 * - Path patterns: wrappers/, integrations/, automation/, clients/, adapters/, connectors/
 * - Requires TOOL-RESEARCH.md in same directory with valid sections
 *
 * See hooks/docs/tool-routing.md "Tool Selection Protocol" section.
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
export type ResearchValidationResult = {
    valid: boolean;
    errors: string[];
    warnings: string[];
    toolsEvaluated: Array<{
        name: string;
        stars?: number;
        decision: 'ACCEPTED' | 'REJECTED';
        reason?: string;
    }>;
    finalDecision?: 'BUILD' | 'USE';
    rationale?: string;
};
export type ToolResearchEntry = {
    id: string;
    timestamp: string;
    problemDomain: string;
    projectPath: string;
    researchDocumentPath: string;
    toolsEvaluated: Array<{
        name: string;
        url?: string;
        stars?: number;
        weeklyDownloads?: number;
        decision: 'ACCEPTED' | 'REJECTED';
        reason?: string;
    }>;
    finalDecision: 'BUILD' | 'USE';
    chosenTool?: string;
    rationale: string;
    warnings: string[];
};
export type ToolResearchRegistry = {
    version: string;
    lastUpdated: string;
    entries: ToolResearchEntry[];
};
/**
 * Check if a file path is in a wrapper directory
 */
export declare function isWrapperPath(filePath: string): boolean;
/**
 * Check if a file is a code file (not config/docs)
 */
export declare function isCodeFile(filePath: string): boolean;
/**
 * Get the research document path for a wrapper file
 */
export declare function getResearchDocumentPath(wrapperFilePath: string): string;
/**
 * Check if research document exists
 */
export declare function researchDocumentExists(wrapperFilePath: string): boolean;
/**
 * Validate the contents of a research document
 */
export declare function validateResearchDocument(content: string): ResearchValidationResult;
/**
 * Get the registry file path
 */
export declare function getRegistryPath(): string;
/**
 * Load the registry
 */
export declare function loadRegistry(): ToolResearchRegistry;
/**
 * Save the registry
 */
export declare function saveRegistry(registry: ToolResearchRegistry): void;
/**
 * Record a research decision in the registry
 */
export declare function recordResearchDecision(problemDomain: string, projectPath: string, researchDocumentPath: string, validation: ResearchValidationResult): ToolResearchEntry;
/**
 * Main tool research gate hook
 */
export declare function toolResearchGateHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default toolResearchGateHook;
//# sourceMappingURL=tool_research_gate.d.ts.map