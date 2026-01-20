/**
 * MCP Self-Healer
 *
 * Autonomous recovery system for MCP servers.
 * Implements self-install, self-update, self-test, and self-heal operations.
 */
import type { MCPServerEntry, MCPServerHealth } from '../types.js';
/**
 * Result of a healing operation
 */
export interface HealingResult {
    server: string;
    action: 'install' | 'update' | 'restart' | 'none';
    success: boolean;
    message: string;
}
/**
 * Perform health check on a single server
 */
export declare function checkServerHealth(server: MCPServerEntry): Promise<MCPServerHealth>;
/**
 * Attempt to heal a server
 */
export declare function healServer(server: MCPServerEntry): Promise<HealingResult>;
/**
 * Run health checks on all servers and attempt healing where needed
 */
export declare function runHealthCheckAndHeal(): Promise<{
    healthy: string[];
    healed: string[];
    failed: string[];
}>;
/**
 * Quick health check without healing (for pre-task validation)
 */
export declare function quickHealthCheck(): Promise<boolean>;
declare const _default: {
    checkServerHealth: typeof checkServerHealth;
    healServer: typeof healServer;
    runHealthCheckAndHeal: typeof runHealthCheckAndHeal;
    quickHealthCheck: typeof quickHealthCheck;
};
export default _default;
//# sourceMappingURL=healer.d.ts.map