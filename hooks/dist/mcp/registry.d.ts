/**
 * MCP Server Registry
 *
 * Maintains state and health information for all MCP servers.
 * Supports self-install, self-update, self-test, and self-heal operations.
 */
import type { MCPServerEntry, MCPServerRegistry, MCPServerHealth } from '../types.js';
/**
 * Get the registry file path
 */
export declare function getRegistryPath(): string;
/**
 * Load the MCP server registry
 */
export declare function loadRegistry(): MCPServerRegistry;
/**
 * Save the MCP server registry
 */
export declare function saveRegistry(registry: MCPServerRegistry): void;
/**
 * Get a server from the registry by name
 */
export declare function getServer(registry: MCPServerRegistry, name: string): MCPServerEntry | undefined;
/**
 * Update server health status
 */
export declare function updateServerHealth(registry: MCPServerRegistry, name: string, health: MCPServerHealth): void;
/**
 * Record a server failure
 */
export declare function recordFailure(registry: MCPServerRegistry, name: string, error: string): void;
/**
 * Mark a failure as recovered
 */
export declare function markRecovered(registry: MCPServerRegistry, name: string): void;
/**
 * Get servers that need attention (failed or unknown status)
 */
export declare function getServersNeedingAttention(registry: MCPServerRegistry): MCPServerEntry[];
/**
 * Get healthy servers
 */
export declare function getHealthyServers(registry: MCPServerRegistry): MCPServerEntry[];
declare const _default: {
    loadRegistry: typeof loadRegistry;
    saveRegistry: typeof saveRegistry;
    getServer: typeof getServer;
    updateServerHealth: typeof updateServerHealth;
    recordFailure: typeof recordFailure;
    markRecovered: typeof markRecovered;
    getServersNeedingAttention: typeof getServersNeedingAttention;
    getHealthyServers: typeof getHealthyServers;
};
export default _default;
//# sourceMappingURL=registry.d.ts.map