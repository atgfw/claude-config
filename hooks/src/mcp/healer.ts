/**
 * MCP Self-Healer
 *
 * Autonomous recovery system for MCP servers.
 * Implements self-install, self-update, self-test, and self-heal operations.
 */

import { execSync, exec } from 'node:child_process';
import { log, logSeparator } from '../utils.js';
import type { MCPServerEntry, MCPServerHealth } from '../types.js';
import {
  loadRegistry,
  saveRegistry,
  updateServerHealth,
  recordFailure,
  markRecovered,
  getServersNeedingAttention,
} from './registry.js';

/**
 * Result of a healing operation
 */
export interface HealingResult {
  server: string;
  action: 'install' | 'update' | 'restart' | 'none';
  success: boolean;
  message: string;
}

/**
 * Perform health check on a single server
 */
export async function checkServerHealth(server: MCPServerEntry): Promise<MCPServerHealth> {
  const startTime = Date.now();

  try {
    // Execute health check command
    execSync(server.healthCheck, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10000, // 10 second timeout
    });

    const latencyMs = Date.now() - startTime;

    return {
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      latencyMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      status: 'failed',
      lastCheck: new Date().toISOString(),
      errorMessage,
    };
  }
}

/**
 * Attempt to heal a server
 */
export async function healServer(server: MCPServerEntry): Promise<HealingResult> {
  log(`Attempting to heal ${server.name}...`);

  // Strategy 1: Reinstall/Update the package
  try {
    log(`  Running: ${server.recoveryProcedure}`);

    await new Promise<void>((resolve, reject) => {
      exec(server.recoveryProcedure, { timeout: 120000 }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    // Verify the fix worked
    const health = await checkServerHealth(server);

    if (health.status === 'healthy') {
      log(`  [SUCCESS] ${server.name} healed successfully`);
      return {
        server: server.name,
        action: 'install',
        success: true,
        message: 'Server reinstalled and verified healthy',
      };
    } else {
      log(`  [PARTIAL] Reinstall completed but verification failed`);
      return {
        server: server.name,
        action: 'install',
        success: false,
        message: `Reinstall completed but verification failed: ${health.errorMessage ?? 'Unknown'}`,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`  [FAILED] Recovery failed: ${errorMessage}`);

    return {
      server: server.name,
      action: 'install',
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Run health checks on all servers and attempt healing where needed
 */
export async function runHealthCheckAndHeal(): Promise<{
  healthy: string[];
  healed: string[];
  failed: string[];
}> {
  logSeparator('MCP SELF-HEALING SYSTEM');
  log('');

  const registry = loadRegistry();
  const results = {
    healthy: [] as string[],
    healed: [] as string[],
    failed: [] as string[],
  };

  // Phase 1: Check all servers
  log('Phase 1: Health Check');
  log('-'.repeat(30));

  for (const server of registry.servers) {
    const health = await checkServerHealth(server);
    updateServerHealth(registry, server.name, health);

    if (health.status === 'healthy') {
      log(`[OK] ${server.name} (${health.latencyMs ?? 0}ms)`);
      results.healthy.push(server.name);
    } else {
      log(`[FAIL] ${server.name}: ${health.errorMessage ?? 'Unknown error'}`);
      recordFailure(registry, server.name, health.errorMessage ?? 'Unknown error');
    }
  }

  log('');

  // Phase 2: Attempt healing for failed servers
  const needsHealing = getServersNeedingAttention(registry);

  if (needsHealing.length > 0) {
    log('Phase 2: Self-Healing');
    log('-'.repeat(30));

    for (const server of needsHealing) {
      const result = await healServer(server);

      if (result.success) {
        markRecovered(registry, server.name);
        results.healed.push(server.name);
      } else {
        results.failed.push(server.name);
      }
    }

    log('');
  } else {
    log('Phase 2: No healing needed');
    log('');
  }

  // Save updated registry
  saveRegistry(registry);

  // Summary
  log('Summary');
  log('-'.repeat(30));
  log(`Healthy: ${results.healthy.length}`);
  log(`Healed: ${results.healed.length}`);
  log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    log('');
    log('Failed servers requiring manual intervention:');
    for (const name of results.failed) {
      log(`  - ${name}`);
    }
  }

  return results;
}

/**
 * Quick health check without healing (for pre-task validation)
 */
export async function quickHealthCheck(): Promise<boolean> {
  const registry = loadRegistry();
  let allHealthy = true;

  for (const server of registry.servers) {
    // Only check critical servers for quick check
    if (server.name === 'filesystem-with-morph' || server.name === 'scrapling') {
      const health = await checkServerHealth(server);
      if (health.status !== 'healthy') {
        allHealthy = false;
        log(`[WARN] ${server.name} is not healthy`);
      }
    }
  }

  return allHealthy;
}

export default {
  checkServerHealth,
  healServer,
  runHealthCheckAndHeal,
  quickHealthCheck,
};
