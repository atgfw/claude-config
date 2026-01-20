/**
 * Session-Start Hook
 * Self-managing MCP infrastructure: self-install, self-update, self-test, self-heal
 * Validates hooks, installs MCP servers, and prepares environment
 */
import type { SessionStartInput, SessionStartOutput } from '../types.js';
/**
 * Session-Start Hook Implementation
 *
 * Performs comprehensive session initialization:
 * 1. Environment setup (.env creation, variable loading)
 * 2. Prerequisites check (Node.js, npx, Claude CLI)
 * 3. MCP server health check and self-healing
 * 4. Subagent availability verification
 * 5. Session validation caching
 */
export declare function sessionStartHook(_input: SessionStartInput): Promise<SessionStartOutput>;
export default sessionStartHook;
//# sourceMappingURL=session_start.d.ts.map