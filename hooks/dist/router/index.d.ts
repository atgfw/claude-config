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
import type { ToolRouterConfig } from '../types.js';
/**
 * Operation types that can be routed
 */
export type OperationType = 'file-edit' | 'file-create' | 'file-read' | 'browser-navigate' | 'browser-screenshot' | 'browser-interact' | 'web-search' | 'code-search';
/**
 * Context for routing decisions
 */
export interface RoutingContext {
    operation: OperationType;
    filePath?: string;
    url?: string;
    query?: string;
    preferSpeed?: boolean;
    preferReliability?: boolean;
}
/**
 * Routing decision
 */
export interface RoutingDecision {
    tool: string;
    reason: string;
    alternatives: string[];
    confidence: number;
}
/**
 * Get the router config file path
 */
export declare function getRouterConfigPath(): string;
/**
 * Load router configuration
 */
export declare function loadRouterConfig(): ToolRouterConfig;
/**
 * Save router configuration
 */
export declare function saveRouterConfig(config: ToolRouterConfig): void;
/**
 * Route a tool operation to the best available tool
 */
export declare function route(context: RoutingContext): RoutingDecision;
/**
 * Get routing recommendation as a string for LLM output
 */
export declare function getRoutingRecommendation(context: RoutingContext): string;
/**
 * Suggest optimal tool for a file edit operation
 */
export declare function suggestFileEditTool(filePath: string): RoutingDecision;
/**
 * Suggest optimal tool for browser automation
 */
export declare function suggestBrowserTool(operation: 'navigate' | 'screenshot' | 'interact', url?: string): RoutingDecision;
declare const _default: {
    route: typeof route;
    getRoutingRecommendation: typeof getRoutingRecommendation;
    suggestFileEditTool: typeof suggestFileEditTool;
    suggestBrowserTool: typeof suggestBrowserTool;
    loadRouterConfig: typeof loadRouterConfig;
    saveRouterConfig: typeof saveRouterConfig;
};
export default _default;
//# sourceMappingURL=index.d.ts.map