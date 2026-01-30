/**
 * Scrapling Runner
 * Node.js interface to execute Scrapling page actions via the Python executor.
 * Used by hook automations for browser interactions.
 */
import { type ScraplingAction, type ScraplingActionResult } from './scrapling_actions.js';
export type ScraplingRunnerConfig = {
    url: string;
    actions: ScraplingAction[];
    method?: 'get' | 'fetch' | 'stealthy-fetch';
    headless?: boolean;
    timeout?: number;
    solveCloudflare?: boolean;
    realChrome?: boolean;
    networkIdle?: boolean;
    userDataDir?: string;
    outputDir?: string;
};
export type ScraplingRunnerResult = {
    url: string;
    finalUrl: string;
    status: number;
    method: string;
    actions: ScraplingActionResult[];
    error?: string;
};
/**
 * Execute Scrapling session with page actions
 */
export declare function runScrapling(config: ScraplingRunnerConfig): Promise<ScraplingRunnerResult>;
/**
 * Quick fetch with default settings
 */
export declare function quickFetch(url: string, actions?: ScraplingAction[]): Promise<ScraplingRunnerResult>;
/**
 * Explore a page - get screenshots and list elements
 */
export declare function explorePage(url: string): Promise<ScraplingRunnerResult>;
/**
 * Fill and submit a form
 */
export declare function fillForm(url: string, fields: Array<{
    selector: string;
    value: string;
}>, submitSelector?: string): Promise<ScraplingRunnerResult>;
export { SCRAPLING_ACTIONS, validateActions } from './scrapling_actions.js';
//# sourceMappingURL=scrapling_runner.d.ts.map