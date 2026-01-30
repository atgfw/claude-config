/**
 * LLM Model Validator Hook
 *
 * BLOCKS Write/Edit operations that contain banned LLM model strings.
 * Enforces use of approved models only across all project files.
 *
 * Approved: gpt-5.2, gemini-3-flash-preview
 * Banned: gpt-4o, gpt-4.1, gpt-3.5, claude-2, claude-instant
 *
 * Exception: files in old/ directories (archived content).
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
export declare function llmModelValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default llmModelValidatorHook;
//# sourceMappingURL=llm_model_validator.d.ts.map