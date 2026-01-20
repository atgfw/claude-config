/**
 * Project Context Detection System
 * Detects project type and configuration from working directory
 */
export type ProjectType = 'n8n' | 'elevenlabs' | 'generic';
export interface ProjectContext {
    projectType: ProjectType;
    projectRoot: string;
    hasLocalClaudeDir: boolean;
    hasGovernanceFile: boolean;
    hasWorkflowsDir: boolean;
    governancePath: string | null;
    registryPath: string | null;
    n8nApiUrl: string | null;
}
export declare function detectProjectContext(workingDirectory?: string): ProjectContext;
export declare function isN8nProject(context?: ProjectContext): boolean;
export declare function isElevenLabsProject(context?: ProjectContext): boolean;
export declare function hasGovernance(context?: ProjectContext): boolean;
//# sourceMappingURL=project_detector.d.ts.map