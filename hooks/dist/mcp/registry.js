/**
 * MCP Server Registry
 *
 * Maintains state and health information for all MCP servers.
 * Supports self-install, self-update, self-test, and self-heal operations.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getClaudeDir, log } from '../utils.js';
const REGISTRY_FILE = 'mcp-registry.json';
/**
 * Default MCP server configurations
 */
const DEFAULT_SERVERS = [
    {
        name: 'filesystem-with-morph',
        package: '@anthropics/mcp-server-filesystem-with-morph',
        healthCheck: 'npm list @anthropics/mcp-server-filesystem-with-morph',
        recoveryProcedure: 'npm install -g @anthropics/mcp-server-filesystem-with-morph',
    },
    {
        name: 'scrapling',
        package: 'scrapling-mcp',
        healthCheck: 'npm list scrapling-mcp',
        recoveryProcedure: 'npm install -g scrapling-mcp',
    },
    {
        name: 'playwright',
        package: '@anthropics/mcp-server-playwright',
        healthCheck: 'npm list @anthropics/mcp-server-playwright',
        recoveryProcedure: 'npm install -g @anthropics/mcp-server-playwright',
    },
    {
        name: 'exa',
        package: 'exa-mcp-server',
        healthCheck: 'npm list exa-mcp-server',
        recoveryProcedure: 'npm install -g exa-mcp-server',
    },
    {
        name: 'memory',
        package: '@anthropics/mcp-server-memory',
        healthCheck: 'npm list @anthropics/mcp-server-memory',
        recoveryProcedure: 'npm install -g @anthropics/mcp-server-memory',
    },
    {
        name: 'supabase',
        package: 'supabase-mcp',
        healthCheck: 'npm list supabase-mcp',
        recoveryProcedure: 'npm install -g supabase-mcp',
    },
];
/**
 * Get the registry file path
 */
export function getRegistryPath() {
    return path.join(getClaudeDir(), 'mcp', REGISTRY_FILE);
}
/**
 * Load the MCP server registry
 */
export function loadRegistry() {
    const registryPath = getRegistryPath();
    if (fs.existsSync(registryPath)) {
        try {
            const content = fs.readFileSync(registryPath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            log('[WARN] Could not parse MCP registry, creating fresh');
        }
    }
    // Create default registry
    return createDefaultRegistry();
}
/**
 * Save the MCP server registry
 */
export function saveRegistry(registry) {
    const registryPath = getRegistryPath();
    const registryDir = path.dirname(registryPath);
    fs.mkdirSync(registryDir, { recursive: true });
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}
/**
 * Create default registry with all known servers
 */
function createDefaultRegistry() {
    const defaultHealth = {
        status: 'unknown',
        lastCheck: new Date().toISOString(),
    };
    const servers = DEFAULT_SERVERS.map((server) => ({
        ...server,
        health: { ...defaultHealth },
        failureHistory: [],
    }));
    return {
        servers,
        lastUpdated: new Date().toISOString(),
    };
}
/**
 * Get a server from the registry by name
 */
export function getServer(registry, name) {
    return registry.servers.find((s) => s.name === name);
}
/**
 * Update server health status
 */
export function updateServerHealth(registry, name, health) {
    const server = getServer(registry, name);
    if (server) {
        server.health = health;
        registry.lastUpdated = new Date().toISOString();
    }
}
/**
 * Record a server failure
 */
export function recordFailure(registry, name, error) {
    const server = getServer(registry, name);
    if (server) {
        server.failureHistory.push({
            timestamp: new Date().toISOString(),
            error,
            recovered: false,
        });
        // Keep only last 10 failures
        if (server.failureHistory.length > 10) {
            server.failureHistory = server.failureHistory.slice(-10);
        }
        server.health = {
            status: 'failed',
            lastCheck: new Date().toISOString(),
            errorMessage: error,
        };
        registry.lastUpdated = new Date().toISOString();
    }
}
/**
 * Mark a failure as recovered
 */
export function markRecovered(registry, name) {
    const server = getServer(registry, name);
    if (server && server.failureHistory.length > 0) {
        const lastFailure = server.failureHistory[server.failureHistory.length - 1];
        if (lastFailure) {
            lastFailure.recovered = true;
        }
        server.health = {
            status: 'healthy',
            lastCheck: new Date().toISOString(),
        };
        registry.lastUpdated = new Date().toISOString();
    }
}
/**
 * Get servers that need attention (failed or unknown status)
 */
export function getServersNeedingAttention(registry) {
    return registry.servers.filter((s) => s.health.status === 'failed' || s.health.status === 'unknown');
}
/**
 * Get healthy servers
 */
export function getHealthyServers(registry) {
    return registry.servers.filter((s) => s.health.status === 'healthy');
}
export default {
    loadRegistry,
    saveRegistry,
    getServer,
    updateServerHealth,
    recordFailure,
    markRecovered,
    getServersNeedingAttention,
    getHealthyServers,
};
//# sourceMappingURL=registry.js.map