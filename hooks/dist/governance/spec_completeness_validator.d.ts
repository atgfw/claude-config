/**
 * Spec Completeness Validator
 *
 * ENFORCES that all specs are complete before build phase
 *
 * Critical Rules from CLAUDE.md:
 * - Every node/function/object MUST have detailed spec BEFORE building
 * - Spec must include: inputs, logic, outputs, routes, test cases
 * - Design Enforcer Audit required before approval
 *
 * Checks:
 * - Spec files have all required sections
 * - No PENDING or TODO markers in specs
 * - All checkboxes marked complete
 */
import { PreToolUseInput, PreToolUseOutput } from '../types.js';
export declare function specCompletenessValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
//# sourceMappingURL=spec_completeness_validator.d.ts.map