/**
 * API Key Tester
 * Validates API keys by testing connectivity to service endpoints
 */
import { ServiceDefinition } from './registry.js';
export interface TestResult {
    valid: boolean;
    reason?: 'success' | 'unauthorized' | 'network' | 'timeout' | 'error';
    statusCode?: number;
}
/**
 * Test an API key by making a request to the service
 */
export declare function testKey(service: ServiceDefinition, key: string): Promise<TestResult>;
/**
 * Test multiple keys in parallel
 */
export declare function testKeys(keys: Array<{
    service: ServiceDefinition;
    value: string;
}>): Promise<Map<string, TestResult>>;
//# sourceMappingURL=tester.d.ts.map