/**
 * Scrapling Page Action Schema
 * Codified mapping of all Scrapling CLI page actions for programmatic use.
 *
 * Usage: Import this schema for hook automations, validation, and code generation.
 */
export type ScraplingActionType = 'screenshot' | 'click' | 'fill' | 'type' | 'hover' | 'press' | 'select' | 'check' | 'uncheck' | 'wait' | 'wait_selector' | 'wait_url' | 'get_text' | 'get_attribute' | 'get_value' | 'get_title' | 'get_url' | 'list_elements' | 'evaluate' | 'go_back' | 'go_forward' | 'reload' | 'scroll' | 'focus' | 'blur' | 'drag' | 'upload_file';
export type ScraplingAction = {
    action: ScraplingActionType;
    selector?: string;
    value?: string;
    filename?: string;
    attribute?: string;
    timeout?: number;
    position?: {
        x: number;
        y: number;
    };
    options?: Record<string, unknown>;
};
export type ScraplingActionResult = {
    step: number;
    action: ScraplingActionType;
    status: 'ok' | 'error';
    selector?: string;
    value?: unknown;
    error?: string;
    path?: string;
    text?: string;
    count?: number;
    texts?: string[];
};
export type ScraplingFetchOptions = {
    url: string;
    method?: 'get' | 'fetch' | 'stealthy-fetch';
    headless?: boolean;
    timeout?: number;
    solveCloudflare?: boolean;
    realChrome?: boolean;
    networkIdle?: boolean;
    userDataDir?: string;
    proxy?: string;
};
export type ScraplingSession = {
    options: ScraplingFetchOptions;
    actions: ScraplingAction[];
    results: ScraplingActionResult[];
};
/**
 * Complete mapping of Scrapling page actions with Playwright equivalents
 */
export declare const SCRAPLING_ACTIONS: Record<ScraplingActionType, {
    description: string;
    playwrightMethod: string;
    requiredParams: string[];
    optionalParams: string[];
    example: ScraplingAction;
    pythonTemplate: string;
}>;
/**
 * Validate a Scrapling action
 */
export declare function validateAction(action: ScraplingAction): {
    valid: boolean;
    errors: string[];
};
/**
 * Validate a sequence of actions
 */
export declare function validateActions(actions: ScraplingAction[]): {
    valid: boolean;
    errors: Array<{
        step: number;
        errors: string[];
    }>;
};
/**
 * Generate Python page_action function from action sequence
 */
export declare function generatePythonPageAction(actions: ScraplingAction[], functionName?: string): string;
/**
 * Generate full Scrapling fetch script
 */
export declare function generateScraplingScript(options: ScraplingFetchOptions, actions: ScraplingAction[]): string;
/**
 * JSON Schema for Scrapling actions (for validation in other systems)
 */
export declare const SCRAPLING_ACTION_JSON_SCHEMA: {
    $schema: string;
    title: string;
    type: string;
    required: string[];
    properties: {
        action: {
            type: string;
            enum: string[];
        };
        selector: {
            type: string;
            description: string;
        };
        value: {
            type: string;
            description: string;
        };
        filename: {
            type: string;
            description: string;
        };
        attribute: {
            type: string;
            description: string;
        };
        timeout: {
            type: string;
            description: string;
        };
    };
};
export default SCRAPLING_ACTIONS;
//# sourceMappingURL=scrapling_actions.d.ts.map