/**
 * Project Cleanup
 *
 * Scans for and archives stale temporary files on session start.
 * Never deletes - always moves to old/YYYY-MM-DD/ directory.
 *
 * Severity: INFO (logs actions but doesn't block)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import type { SessionCheckResult } from '../types.js';
import { archiveToDateDir as archiveToDateDirectory, log } from '../utils.js';

/**
 * Cleanup rule definition
 */
type CleanupRule = {
  pattern: RegExp;
  description: string;
  maxAgeHours: number;
};

/**
 * Conservative cleanup rules - only target clearly temporary files
 */
const cleanupRules: CleanupRule[] = [
  { pattern: /\.tmp$/i, description: 'Temporary files', maxAgeHours: 24 },
  { pattern: /\.bak$/i, description: 'Backup files', maxAgeHours: 168 }, // 7 days
  { pattern: /\.log$/i, description: 'Log files', maxAgeHours: 72 }, // 3 days
  { pattern: /~$/, description: 'Editor backup files', maxAgeHours: 24 },
  { pattern: /\.swp$/i, description: 'Vim swap files', maxAgeHours: 24 },
];

/**
 * Directories to skip during scanning
 */
const skipDirectories = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'old',
  '.claude',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
]);

/**
 * Check if a file matches any cleanup rule and is old enough
 */
function matchesCleanupRule(
  filePath: string,
  stats: fs.Stats
): { matches: boolean; rule?: CleanupRule } {
  const fileName = path.basename(filePath);
  const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

  for (const rule of cleanupRules) {
    if (rule.pattern.test(fileName) && ageHours >= rule.maxAgeHours) {
      return { matches: true, rule };
    }
  }

  return { matches: false };
}

/**
 * Process a single file entry for staleness
 */
function processFileEntry(
  fullPath: string,
  staleFiles: Array<{ path: string; rule: CleanupRule; ageHours: number }>
): void {
  try {
    const stats = fs.statSync(fullPath);
    const { matches, rule } = matchesCleanupRule(fullPath, stats);

    if (matches && rule) {
      const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
      staleFiles.push({ path: fullPath, rule, ageHours });
    }
  } catch {
    // Skip files we can't stat
  }
}

/**
 * Scan directory for stale files matching cleanup rules
 */
function findStaleFiles(
  directory: string,
  maxDepth = 3,
  currentDepth = 0
): Array<{ path: string; rule: CleanupRule; ageHours: number }> {
  const staleFiles: Array<{ path: string; rule: CleanupRule; ageHours: number }> = [];

  if (currentDepth >= maxDepth) {
    return staleFiles;
  }

  try {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (!skipDirectories.has(entry.name) && !entry.name.startsWith('.')) {
          staleFiles.push(...findStaleFiles(fullPath, maxDepth, currentDepth + 1));
        }
      } else if (entry.isFile()) {
        processFileEntry(fullPath, staleFiles);
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return staleFiles;
}

/**
 * Archive stale files to dated directory
 */
function archiveStaleFiles(
  staleFiles: Array<{ path: string; rule: CleanupRule; ageHours: number }>,
  baseDirectory: string
): { archived: string[]; failed: string[] } {
  const archived: string[] = [];
  const failed: string[] = [];

  for (const file of staleFiles) {
    try {
      const archivePath = archiveToDateDirectory(file.path, baseDirectory);

      if (archivePath) {
        archived.push(file.path);
        log(`[ARCHIVED] ${path.relative(baseDirectory, file.path)} -> old/`);
      }
    } catch {
      failed.push(file.path);
    }
  }

  return { archived, failed };
}

/**
 * Clean up stale project files
 */
export function cleanupProject(projectDirectory?: string): SessionCheckResult {
  const directory = projectDirectory ?? process.cwd();

  log('[CHECK] Scanning for stale temporary files...');
  const staleFiles = findStaleFiles(directory);

  if (staleFiles.length === 0) {
    log('[OK] No stale files found');

    return {
      name: 'Project Cleanup',
      passed: true,
      severity: 'info',
      message: 'No stale temporary files found',
    };
  }

  log(`[INFO] Found ${staleFiles.length} stale file(s) to archive`);

  // Archive the files
  const { archived, failed } = archiveStaleFiles(staleFiles, directory);

  const details: string[] = [];

  if (archived.length > 0) {
    details.push(`Archived ${archived.length} file(s) to old/ directory`);
  }

  if (failed.length > 0) {
    details.push(`Failed to archive ${failed.length} file(s)`);
  }

  // Group by rule for summary
  const byRule = new Map<string, number>();

  for (const file of staleFiles) {
    const count = byRule.get(file.rule.description) ?? 0;
    byRule.set(file.rule.description, count + 1);
  }

  for (const [description, count] of byRule) {
    details.push(`${description}: ${count}`);
  }

  return {
    name: 'Project Cleanup',
    passed: true,
    severity: 'info',
    message: `Archived ${archived.length} stale file(s)`,
    details,
  };
}

export default cleanupProject;
