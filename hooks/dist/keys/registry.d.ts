/**
 * API Key Registry
 * Defines known services, their key patterns, and test endpoints
 */
export interface ServiceDefinition {
    name: string;
    envVar: string;
    pattern: RegExp;
    testEndpoint: string;
    testMethod: 'GET' | 'POST';
    testHeaders: (key: string) => Record<string, string>;
    testBody?: object;
    mcpServerNames: string[];
    maskPrefix: number;
}
export declare const SERVICES: ServiceDefinition[];
/**
 * Find service by name
 */
export declare function getService(name: string): ServiceDefinition | undefined;
/**
 * Find service by env var
 */
export declare function getServiceByEnvVar(envVar: string): ServiceDefinition | undefined;
/**
 * Mask an API key for safe logging
 */
export declare function maskKey(key: string, service: ServiceDefinition): string;
//# sourceMappingURL=registry.d.ts.map