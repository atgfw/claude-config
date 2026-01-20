/**
 * Primordial Pipeline Gate Hook
 *
 * ENFORCES the 3-novel-test-run requirement before allowing build:
 * 1. Every entity must pass 3 complete end-to-end test runs
 * 2. Each run must use NOVEL input data (unique hash)
 * 3. Parent entities require ALL children to be healthy
 * 4. No weak links - single unhealthy child blocks parent
 *
 * This hook checks the test run registry before allowing:
 * - Implementation code writes
 * - Parent entity creation when children unhealthy
 * - Building upon untested/undertested entities
 *
 * Part of the Spinal Cord governance system.
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
export declare function primordialPipelineGateHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default primordialPipelineGateHook;
//# sourceMappingURL=primordial_pipeline_gate.d.ts.map