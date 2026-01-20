/**
 * File Governance Configuration
 * Rules for filename and content standards (WARN-first approach)
 */
export declare const EXEMPT_FILENAMES: Set<string>;
export declare const GENERIC_PATTERNS: RegExp[];
export declare const SNAKE_CASE_EXTENSIONS: Set<string>;
export declare const PASCAL_CASE_EXTENSIONS: Set<string>;
export declare const SHELL_EXTENSIONS: Set<string>;
export declare const MAX_SHELL_LINES = 20;
export declare const MIN_FILENAME_LENGTH = 8;
export declare const MIN_CODE_LINES = 3;
export interface GovernanceWarning {
    rule: string;
    message: string;
    suggestion?: string;
}
export declare function isGenericFilename(filepath: string): GovernanceWarning | null;
export declare function isValidNamingConvention(filepath: string): GovernanceWarning | null;
export declare function isDescriptiveFilename(filepath: string): GovernanceWarning | null;
export declare function isOversizedShellScript(filepath: string, content: string): GovernanceWarning | null;
export declare function isStubFile(content: string): GovernanceWarning | null;
export declare function shouldBeTypeScript(filepath: string): GovernanceWarning | null;
export declare function checkFileGovernance(filepath: string, content: string): GovernanceWarning[];
//# sourceMappingURL=file_governance.d.ts.map