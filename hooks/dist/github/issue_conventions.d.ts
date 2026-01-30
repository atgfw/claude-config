/**
 * Issue Convention Validator Hook
 * WARNS when gh issue create titles/bodies don't follow conventions
 * Enforcement: WARN (soft) - always allows, logs warnings
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Matches: [<system>] <type>(<scope>): <description>
 *      or: [<system>] <type>: <description>
 * Description must be lowercase start, no trailing period
 */
export declare const TITLE_REGEX: RegExp;
export declare const REQUIRED_BODY_SECTIONS: readonly ["## Problem", "## Solution", "## Acceptance Criteria", "## Source"];
/**
 * Validate an issue title against conventions
 */
export declare function validateTitle(title: string): {
    valid: boolean;
    warnings: string[];
};
/**
 * Validate an issue body for required sections
 */
export declare function validateBody(body: string): {
    valid: boolean;
    warnings: string[];
};
/**
 * Search for duplicate issues using gh CLI
 * Returns open issues with >80% keyword overlap
 */
export declare function findDuplicates(title: string): {
    number: number;
    title: string;
}[];
/**
 * Issue Convention Validator Hook
 */
export declare function issueConventionValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default issueConventionValidatorHook;
//# sourceMappingURL=issue_conventions.d.ts.map