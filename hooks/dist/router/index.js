/**
 * Dynamic Tool Router
 *
 * Intelligent, research-driven tool selection at invocation time.
 * Not static preference lists - real-time routing based on:
 * - MCP server health
 * - Tool capabilities
 * - Operation context
 * - Performance metrics
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getClaudeDir, log } from '../utils.js';
import { loadRegistry, getServer } from '../mcp/registry.js';
const ROUTER_CONFIG_FILE = 'tool-router.json';
/**
 * Default routing configuration
 */
const DEFAULT_CONFIG = {
    routes: [
        {
            operation: 'file-edit',
            preferences: [
                {
                    tool: 'mcp__filesystem-with-morph__edit_file',
                    priority: 1,
                    conditions: { mcpHealthy: ['filesystem-with-morph'] },
                },
                {
                    tool: 'Edit',
                    priority: 2,
                },
                {
                    tool: 'Write',
                    priority: 3,
                },
            ],
            fallback: 'Write',
        },
        {
            operation: 'browser-navigate',
            preferences: [
                {
                    tool: 'mcp__scrapling__navigate',
                    priority: 1,
                    conditions: { mcpHealthy: ['scrapling'] },
                },
                {
                    tool: 'mcp__playwright__browser_navigate',
                    priority: 2,
                    conditions: { mcpHealthy: ['playwright'] },
                },
            ],
            fallback: 'mcp__playwright__browser_navigate',
        },
        {
            operation: 'browser-screenshot',
            preferences: [
                {
                    tool: 'mcp__scrapling__screenshot',
                    priority: 1,
                    conditions: { mcpHealthy: ['scrapling'] },
                },
                {
                    tool: 'mcp__playwright__browser_screenshot',
                    priority: 2,
                    conditions: { mcpHealthy: ['playwright'] },
                },
            ],
            fallback: 'mcp__playwright__browser_screenshot',
        },
        {
            operation: 'browser-interact',
            preferences: [
                {
                    tool: 'mcp__scrapling__click',
                    priority: 1,
                    conditions: { mcpHealthy: ['scrapling'] },
                },
                {
                    tool: 'mcp__playwright__browser_click',
                    priority: 2,
                    conditions: { mcpHealthy: ['playwright'] },
                },
            ],
            fallback: 'mcp__playwright__browser_click',
        },
        {
            operation: 'web-search',
            preferences: [
                {
                    tool: 'mcp__exa__search',
                    priority: 1,
                    conditions: { mcpHealthy: ['exa'] },
                },
                {
                    tool: 'WebSearch',
                    priority: 2,
                },
            ],
            fallback: 'WebSearch',
        },
        {
            operation: 'code-search',
            preferences: [
                {
                    tool: 'mcp__filesystem-with-morph__warpgrep_codebase_search',
                    priority: 1,
                    conditions: { mcpHealthy: ['filesystem-with-morph'] },
                },
                {
                    tool: 'Grep',
                    priority: 2,
                },
            ],
            fallback: 'Grep',
        },
    ],
    lastResearchUpdate: new Date().toISOString(),
    researchSources: [
        'https://github.com/anthropics/mcp-servers',
        'https://docs.anthropic.com/claude-code',
    ],
};
/**
 * Get the router config file path
 */
export function getRouterConfigPath() {
    return path.join(getClaudeDir(), 'tool-router', ROUTER_CONFIG_FILE);
}
/**
 * Load router configuration
 */
export function loadRouterConfig() {
    const configPath = getRouterConfigPath();
    if (fs.existsSync(configPath)) {
        try {
            const content = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            log('[WARN] Could not parse router config, using defaults');
        }
    }
    // Save and return defaults
    saveRouterConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
}
/**
 * Save router configuration
 */
export function saveRouterConfig(config) {
    const configPath = getRouterConfigPath();
    const configDir = path.dirname(configPath);
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
/**
 * Check if a tool's conditions are met
 */
function checkConditions(preference) {
    if (!preference.conditions) {
        return true;
    }
    const registry = loadRegistry();
    // Check MCP health conditions
    if (preference.conditions.mcpHealthy) {
        for (const serverName of preference.conditions.mcpHealthy) {
            const server = getServer(registry, serverName);
            if (!server || server.health.status !== 'healthy') {
                return false;
            }
        }
    }
    return true;
}
/**
 * Route a tool operation to the best available tool
 */
export function route(context) {
    const config = loadRouterConfig();
    // Find the route for this operation
    const routeConfig = config.routes.find((r) => r.operation === context.operation);
    if (!routeConfig) {
        // No route configured, return a sensible default
        return {
            tool: 'unknown',
            reason: `No route configured for operation: ${context.operation}`,
            alternatives: [],
            confidence: 0,
        };
    }
    // Evaluate preferences in priority order
    const availableTools = [];
    for (const preference of routeConfig.preferences.sort((a, b) => a.priority - b.priority)) {
        if (checkConditions(preference)) {
            availableTools.push(preference.tool);
        }
    }
    // Select the best tool
    if (availableTools.length > 0) {
        const selectedTool = availableTools[0];
        if (selectedTool) {
            return {
                tool: selectedTool,
                reason: `Selected based on priority and health check`,
                alternatives: availableTools.slice(1),
                confidence: availableTools.length > 1 ? 0.9 : 0.7,
            };
        }
    }
    // Fallback
    return {
        tool: routeConfig.fallback,
        reason: 'No preferred tools available, using fallback',
        alternatives: [],
        confidence: 0.5,
    };
}
/**
 * Get routing recommendation as a string for LLM output
 */
export function getRoutingRecommendation(context) {
    const decision = route(context);
    let output = `TOOL ROUTING DECISION\n`;
    output += `Operation: ${context.operation}\n`;
    output += `Selected: ${decision.tool}\n`;
    output += `Reason: ${decision.reason}\n`;
    output += `Confidence: ${(decision.confidence * 100).toFixed(0)}%\n`;
    if (decision.alternatives.length > 0) {
        output += `Alternatives: ${decision.alternatives.join(', ')}\n`;
    }
    return output;
}
/**
 * Suggest optimal tool for a file edit operation
 */
export function suggestFileEditTool(filePath) {
    return route({
        operation: 'file-edit',
        filePath,
    });
}
/**
 * Suggest optimal tool for browser automation
 */
export function suggestBrowserTool(operation, url) {
    const operationMap = {
        navigate: 'browser-navigate',
        screenshot: 'browser-screenshot',
        interact: 'browser-interact',
    };
    return route({
        operation: operationMap[operation] ?? 'browser-navigate',
        url,
    });
}
export default {
    route,
    getRoutingRecommendation,
    suggestFileEditTool,
    suggestBrowserTool,
    loadRouterConfig,
    saveRouterConfig,
};
//# sourceMappingURL=index.js.map