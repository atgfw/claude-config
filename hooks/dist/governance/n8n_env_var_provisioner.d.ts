/**
 * n8n Environment Variable Provisioner Hook
 *
 * AUTO-DETECTS environment variable references in workflows and:
 * 1. Writes them to ~/.claude/.env for local tracking
 * 2. Warns about $vars usage (requires n8n license)
 * 3. Logs Docker compose env configuration
 *
 * Detects:
 * - $vars['VAR_NAME'] references (WARNS - requires license)
 * - $env.VAR_NAME references (preferred - reads from server env)
 * - {{$env.VAR_NAME}} in expressions
 *
 * Part of the Spinal Cord governance system.
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * n8n Environment Variable Provisioner Hook Implementation
 */
export declare function n8nEnvVarProvisionerHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default n8nEnvVarProvisionerHook;
//# sourceMappingURL=n8n_env_var_provisioner.d.ts.map