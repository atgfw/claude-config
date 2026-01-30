/**
 * Hook Compilation Validator
 *
 * Validates that compiled hooks (dist/) are up-to-date with source (src/).
 * Self-heals by running build if stale, blocks session if build fails.
 *
 * Severity: STRICT (blocks session on failure)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { SessionCheckResult } from '../types.js';
import { getHooksDir as getHooksDirectory, log } from '../utils.js';

/**
 * Get modification time of a file, or 0 if it doesn't exist
 */
function getMtime(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Find all TypeScript source files in src/
 */
function findSourceFiles(srcDirectory: string): string[] {
  const files: string[] = [];

  function scanDirectory(directory: string): void {
    if (!fs.existsSync(directory)) {
      return;
    }

    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  }

  scanDirectory(srcDirectory);

  return files;
}

/**
 * Check if any source file is newer than its compiled counterpart
 */
export function findStaleCompilations(hooksDirectoryPath?: string): {
  stale: Array<{ source: string; compiled: string; sourceMtime: number; compiledMtime: number }>;
  missing: string[];
} {
  const baseDirectory = hooksDirectoryPath ?? getHooksDirectory();
  const srcDirectory = path.join(baseDirectory, 'src');
  const distributionDirectory = path.join(baseDirectory, 'dist');

  const sourceFiles = findSourceFiles(srcDirectory);
  const stale: Array<{
    source: string;
    compiled: string;
    sourceMtime: number;
    compiledMtime: number;
  }> = [];
  const missing: string[] = [];

  for (const sourceFile of sourceFiles) {
    const relativePath = path.relative(srcDirectory, sourceFile);
    const compiledPath = path.join(distributionDirectory, relativePath.replace(/\.ts$/, '.js'));

    const sourceMtime = getMtime(sourceFile);
    const compiledMtime = getMtime(compiledPath);

    if (compiledMtime === 0) {
      missing.push(relativePath);
    } else if (sourceMtime > compiledMtime) {
      stale.push({
        source: relativePath,
        compiled: relativePath.replace(/\.ts$/, '.js'),
        sourceMtime,
        compiledMtime,
      });
    }
  }

  return { stale, missing };
}

/**
 * Attempt to rebuild hooks
 */
export function rebuildHooks(hooksDirectoryPath?: string): { success: boolean; error?: string } {
  const baseDirectory = hooksDirectoryPath ?? getHooksDirectory();

  try {
    log('[SELF-HEAL] Rebuilding hooks...');
    execSync('bun run build', {
      cwd: baseDirectory,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 60_000, // 60 second timeout
    });
    log('[SELF-HEAL] Rebuild successful');

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return { success: false, error: message };
  }
}

/**
 * Validate hook compilation and self-heal if needed
 */
export function validateHookCompilation(hooksDirectoryPath?: string): SessionCheckResult {
  const baseDirectory = hooksDirectoryPath ?? getHooksDirectory();
  const { stale, missing } = findStaleCompilations(baseDirectory);

  // Check if dist directory exists at all
  const distributionDirectory = path.join(baseDirectory, 'dist');

  if (!fs.existsSync(distributionDirectory)) {
    log('[WARN] dist/ directory missing - attempting rebuild');
    const rebuildResult = rebuildHooks(baseDirectory);

    if (!rebuildResult.success) {
      return {
        name: 'Hook Compilation',
        passed: false,
        severity: 'strict',
        message: 'dist/ directory missing and rebuild failed',
        details: [rebuildResult.error ?? 'Unknown build error'],
        selfHealed: false,
      };
    }

    return {
      name: 'Hook Compilation',
      passed: true,
      severity: 'strict',
      message: 'dist/ directory rebuilt successfully',
      selfHealed: true,
      selfHealAction: 'Created dist/ directory via bun run build',
    };
  }

  // Check for stale or missing compilations
  const totalIssues = stale.length + missing.length;

  if (totalIssues === 0) {
    return {
      name: 'Hook Compilation',
      passed: true,
      severity: 'strict',
      message: 'All hooks compiled and up-to-date',
    };
  }

  // Attempt self-heal
  const details: string[] = [];

  if (stale.length > 0) {
    details.push(`Stale compilations: ${stale.map((s) => s.source).join(', ')}`);
  }

  if (missing.length > 0) {
    details.push(`Missing compilations: ${missing.join(', ')}`);
  }

  log(`[WARN] Found ${totalIssues} compilation issue(s) - attempting rebuild`);
  const rebuildResult = rebuildHooks(baseDirectory);

  if (!rebuildResult.success) {
    return {
      name: 'Hook Compilation',
      passed: false,
      severity: 'strict',
      message: `${totalIssues} stale/missing compilations and rebuild failed`,
      details: [...details, rebuildResult.error ?? 'Unknown build error'],
      selfHealed: false,
    };
  }

  return {
    name: 'Hook Compilation',
    passed: true,
    severity: 'strict',
    message: `Rebuilt ${totalIssues} stale/missing compilation(s)`,
    details,
    selfHealed: true,
    selfHealAction: 'Ran bun run build',
  };
}

export default validateHookCompilation;
