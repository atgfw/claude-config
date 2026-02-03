/**
 * Task Specification Validator Hook
 *
 * Enforces the Task Specification & Linting Framework v1.0.
 * Validates structural completeness, naming conventions, semantic consistency,
 * and detects anti-patterns in goal/task definitions.
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import type { TaskSpecification, MinimalTaskSpec, FocusDeclaration, WhatSection, LestSection, WithSection, MeasuredBySection, WhichSection } from '../schema/task_specification.js';
export type ValidationSeverity = 'error' | 'warning' | 'info';
export interface ValidationIssue {
    section: string;
    field?: string;
    severity: ValidationSeverity;
    message: string;
    suggestion?: string;
}
export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
    completeness_score: number;
}
export declare function validateStructuralCompleteness(spec: Partial<TaskSpecification>): ValidationIssue[];
export declare function validateFocus(focus?: FocusDeclaration): ValidationIssue[];
export declare function validateWhat(what?: WhatSection): ValidationIssue[];
export declare function validateWhich(which?: WhichSection): ValidationIssue[];
export declare function validateLest(lest?: LestSection): ValidationIssue[];
export declare function validateWith(withSection?: WithSection): ValidationIssue[];
export declare function validateMeasuredBy(measuredBy?: MeasuredBySection): ValidationIssue[];
export declare function detectAntiPatterns(spec: Partial<TaskSpecification>): ValidationIssue[];
export declare function validateTaskSpec(spec: Partial<TaskSpecification>): ValidationResult;
export declare function validateMinimalSpec(spec: Partial<MinimalTaskSpec>): ValidationResult;
export declare function formatValidationIssues(result: ValidationResult): string;
/**
 * PreToolUse hook that validates task specifications before goal-related operations.
 */
declare function taskSpecValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export { taskSpecValidatorHook };
export default taskSpecValidatorHook;
//# sourceMappingURL=task_spec_validator.d.ts.map