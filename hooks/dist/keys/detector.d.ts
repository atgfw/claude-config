/**
 * API Key Detector
 * Scans text for API key patterns and classifies them
 */
import { ServiceDefinition } from './registry.js';
export interface DetectedKey {
    service: ServiceDefinition;
    value: string;
    masked: string;
}
/**
 * Detect API keys in text
 * Returns array of detected keys with their service classification
 */
export declare function detectApiKeys(text: string): DetectedKey[];
/**
 * Check if text contains any API key patterns
 */
export declare function containsApiKey(text: string): boolean;
/**
 * Extract env var assignments from text
 * Looks for patterns like: ANTHROPIC_API_KEY=sk-ant-...
 */
export declare function extractEnvAssignments(text: string): Map<string, string>;
//# sourceMappingURL=detector.d.ts.map