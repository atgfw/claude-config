/**
 * API Key Writer
 * Saves API keys to both .env and MCP config files
 */
import { ServiceDefinition } from './registry.js';
/**
 * Save an API key to .env file
 */
export declare function saveToEnv(service: ServiceDefinition, key: string): void;
/**
 * Save an API key to MCP config files
 */
export declare function saveToMcpConfig(service: ServiceDefinition, key: string): void;
/**
 * Save an API key to both .env and MCP config
 */
export declare function saveKey(service: ServiceDefinition, key: string): void;
/**
 * Check if a key already exists in .env
 */
export declare function keyExistsInEnv(envVar: string): boolean;
/**
 * Get current key value from .env
 */
export declare function getKeyFromEnv(envVar: string): string | undefined;
//# sourceMappingURL=writer.d.ts.map