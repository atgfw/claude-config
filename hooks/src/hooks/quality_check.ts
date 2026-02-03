/**
 * Quality Check Hook
 * PostToolUse hook that runs TypeScript, ESLint (via XO), and Prettier checks
 * on edited files. Integrates bartolli/claude-code-typescript-hooks patterns.
 *
 * EXIT BEHAVIOR:
 *   - allow: All checks passed
 *   - block: Quality issues found that must be fixed
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { spawn, type SpawnOptions } from 'node:child_process';
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
import { registerHook } from '../runner.js';
import { log, getClaudeDir } from '../utils.js';

// ============================================================================
// Configuration Types
// ============================================================================

interface QualityCheckConfig {
  version: string;
  name: string;
  description: string;
  projectType: 'node-typescript' | 'react-app' | 'vscode-extension' | 'generic';
  typescript: {
    enabled: boolean;
    showDependencyErrors: boolean;
    jsxMode?: boolean;
  };
  xo: {
    enabled: boolean;
    autofix: boolean;
  };
  prettier: {
    enabled: boolean;
    autofix: boolean;
  };
  general: {
    autofixSilent: boolean;
    debug: boolean;
  };
  rules: {
    console?: {
      enabled: boolean;
      severity: 'error' | 'warning' | 'info';
      message: string;
      allowIn?: {
        paths?: string[];
        fileTypes?: string[];
        patterns?: string[];
      };
    };
    asAny?: {
      enabled: boolean;
      severity: 'error' | 'warning';
      message: string;
    };
    debugger?: {
      enabled: boolean;
      severity: 'error' | 'warning';
      message: string;
    };
    todos?: {
      enabled: boolean;
      severity: 'info' | 'warning';
      patterns: string[];
    };
  };
  ignore?: {
    paths?: string[];
  };
}

interface CheckResult {
  errors: string[];
  warnings: string[];
  autofixes: string[];
}

// ============================================================================
// TypeScript Config Cache
// ============================================================================

interface TsConfigCache {
  hashes: Record<string, string>;
  mappings: Record<string, { configPath: string; excludes: string[] }>;
}

class TypeScriptConfigCache {
  private cacheFile: string;
  private cache: TsConfigCache;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.cacheFile = path.join(getClaudeDir(), 'cache', 'tsconfig-cache.json');
    this.cache = { hashes: {}, mappings: {} };
    this.loadCache();
  }

  private getConfigHash(configPath: string): string | null {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  private findTsConfigFiles(): string[] {
    const configs: string[] = [];
    const commonConfigs = [
      'tsconfig.json',
      'tsconfig.build.json',
      'tsconfig.test.json',
      'tsconfig.node.json',
    ];

    for (const config of commonConfigs) {
      const configPath = path.join(this.projectRoot, config);
      if (fs.existsSync(configPath)) {
        configs.push(configPath);
      }
    }
    return configs;
  }

  private isValid(): boolean {
    const configFiles = this.findTsConfigFiles();
    if (Object.keys(this.cache.hashes).length !== configFiles.length) {
      return false;
    }

    for (const configPath of configFiles) {
      const currentHash = this.getConfigHash(configPath);
      if (currentHash !== this.cache.hashes[configPath]) {
        return false;
      }
    }
    return true;
  }

  private rebuild(): void {
    this.cache = { hashes: {}, mappings: {} };

    const configPriority = ['tsconfig.test.json', 'tsconfig.build.json', 'tsconfig.json'];

    for (const configName of configPriority) {
      const configPath = path.join(this.projectRoot, configName);
      if (!fs.existsSync(configPath)) {
        continue;
      }

      const hash = this.getConfigHash(configPath);
      if (hash) {
        this.cache.hashes[configPath] = hash;
      }

      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent) as {
          include?: string[];
          exclude?: string[];
        };

        if (config.include) {
          for (const pattern of config.include) {
            if (!this.cache.mappings[pattern]) {
              this.cache.mappings[pattern] = {
                configPath,
                excludes: config.exclude ?? [],
              };
            }
          }
        }
      } catch {
        // Skip invalid configs
      }
    }

    this.saveCache();
  }

  private loadCache(): void {
    try {
      const cacheDir = path.dirname(this.cacheFile);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      if (fs.existsSync(this.cacheFile)) {
        const content = fs.readFileSync(this.cacheFile, 'utf8');
        this.cache = JSON.parse(content) as TsConfigCache;
      }
    } catch {
      this.cache = { hashes: {}, mappings: {} };
    }
  }

  private saveCache(): void {
    try {
      const cacheDir = path.dirname(this.cacheFile);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
    } catch {
      // Ignore cache save errors
    }
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    if (pattern.endsWith('/**/*')) {
      const baseDir = pattern.slice(0, -5);
      return filePath.startsWith(baseDir);
    }

    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '__GLOBSTAR__')
      .replace(/\*/g, '[^/]*')
      .replace(/__GLOBSTAR__/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regexPattern}$`).test(filePath);
  }

  getTsConfigForFile(filePath: string): string {
    if (!this.isValid()) {
      this.rebuild();
    }

    const relativePath = path.relative(this.projectRoot, filePath);

    const sortedMappings = Object.entries(this.cache.mappings).sort(([a], [b]) => {
      const aSpecificity = a.split('/').length + (a.includes('**') ? 0 : 10);
      const bSpecificity = b.split('/').length + (b.includes('**') ? 0 : 10);
      return bSpecificity - aSpecificity;
    });

    for (const [pattern, mapping] of sortedMappings) {
      if (this.matchesPattern(relativePath, pattern)) {
        let isExcluded = false;
        for (const exclude of mapping.excludes) {
          if (this.matchesPattern(relativePath, exclude)) {
            isExcluded = true;
            break;
          }
        }
        if (!isExcluded) {
          return mapping.configPath;
        }
      }
    }

    // Test file heuristics
    if (
      relativePath.includes('/test/') ||
      relativePath.includes('.test.') ||
      relativePath.includes('.spec.')
    ) {
      const testConfig = path.join(this.projectRoot, 'tsconfig.test.json');
      if (fs.existsSync(testConfig)) {
        return testConfig;
      }
    }

    return path.join(this.projectRoot, 'tsconfig.json');
  }
}

// ============================================================================
// Quality Checker
// ============================================================================

class QualityChecker {
  private filePath: string;
  private projectRoot: string;
  private config: QualityCheckConfig;
  private tsConfigCache: TypeScriptConfigCache;
  private errors: string[] = [];
  private warnings: string[] = [];
  private autofixes: string[] = [];

  constructor(filePath: string, projectRoot: string, config: QualityCheckConfig) {
    this.filePath = filePath;
    this.projectRoot = projectRoot;
    this.config = config;
    this.tsConfigCache = new TypeScriptConfigCache(projectRoot);
  }

  private detectFileType(): string {
    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(this.filePath)) {
      return 'test';
    }
    if (/\/components\/.*\.(tsx|jsx)$/.test(this.filePath)) {
      return 'component';
    }
    if (/\/(client|server)\/(stdio|sse|websocket|http)/.test(this.filePath)) {
      return 'transport';
    }
    if (/\/cli\/|\/bin\/|index\.(ts|js)$/.test(this.filePath)) {
      return 'cli';
    }
    if (/\.(ts|tsx)$/.test(this.filePath)) {
      return 'typescript';
    }
    if (/\.(js|jsx)$/.test(this.filePath)) {
      return 'javascript';
    }
    return 'unknown';
  }

  private async runCommand(
    cmd: string,
    args: string[],
    cwd: string
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve) => {
      const options: SpawnOptions = {
        cwd,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '0' },
      };

      const proc = spawn(cmd, args, options);
      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({ stdout, stderr, code: code ?? 0 });
      });

      proc.on('error', (err) => {
        resolve({ stdout, stderr: err.message, code: 1 });
      });
    });
  }

  async checkTypeScript(): Promise<void> {
    if (!this.config.typescript.enabled) {
      return;
    }

    // Skip for JS files in hook directories
    if (this.filePath.endsWith('.js') && this.filePath.includes('.claude/hooks/')) {
      return;
    }

    const configPath = this.tsConfigCache.getTsConfigForFile(this.filePath);
    if (!fs.existsSync(configPath)) {
      return;
    }

    log('[quality-check] Running TypeScript check...');

    const result = await this.runCommand(
      'npx',
      ['tsc', '--noEmit', '--project', configPath],
      this.projectRoot
    );

    if (result.code !== 0) {
      // Filter to only show errors for the edited file
      const lines = (result.stdout + result.stderr).split('\n');
      const relevantErrors = lines.filter((line) => line.includes(path.basename(this.filePath)));

      if (relevantErrors.length > 0) {
        this.errors.push(
          `TypeScript errors in ${path.basename(this.filePath)}:\n  ${relevantErrors.join('\n  ')}`
        );
      }
    } else {
      log('[quality-check] TypeScript check passed');
    }
  }

  async checkXO(): Promise<void> {
    if (!this.config.xo.enabled) {
      return;
    }

    log('[quality-check] Running XO (ESLint) check...');

    // Use relative path from project root for XO
    const relativePath = path.relative(this.projectRoot, this.filePath);

    // Use local xo from node_modules to avoid npx cache issues
    const localXo = path.join(this.projectRoot, 'node_modules', '.bin', 'xo');
    const useLocalXo = fs.existsSync(localXo);

    const cmd = useLocalXo ? localXo : 'npx';
    const args = useLocalXo ? [relativePath] : ['xo', relativePath];
    if (this.config.xo.autofix) {
      args.push('--fix');
    }

    const result = await this.runCommand(cmd, args, this.projectRoot);

    if (result.code !== 0) {
      // Check for npx/glob cache issues - treat as warning not error
      const output = result.stdout + result.stderr;
      if (output.includes('NoFilesFoundError') || output.includes('glob was disabled')) {
        this.warnings.push('XO check skipped due to npx cache issue - run manually: npm run lint');
        return;
      }

      if (this.config.xo.autofix) {
        // Re-run to check if issues remain
        const recheckArgs = useLocalXo ? [relativePath] : ['xo', relativePath];
        const recheck = await this.runCommand(cmd, recheckArgs, this.projectRoot);
        if (recheck.code === 0) {
          if (this.config.general.autofixSilent) {
            this.autofixes.push('XO auto-fixed linting issues');
          } else {
            this.warnings.push('XO issues were auto-fixed - verify the changes');
          }
        } else {
          // Check for cache issues on recheck too
          if (
            recheck.stderr.includes('NoFilesFoundError') ||
            recheck.stderr.includes('glob was disabled')
          ) {
            this.warnings.push(
              'XO check skipped due to npx cache issue - run manually: npm run lint'
            );
            return;
          }
          const xoOutput = (recheck.stdout + recheck.stderr).trim();
          if (xoOutput) {
            this.errors.push(`XO found issues that could not be auto-fixed:\n${xoOutput}`);
          } else {
            this.warnings.push(
              'XO exited with errors but produced no output (possible dependency issue)'
            );
          }
        }
      } else {
        this.errors.push(`XO linting issues found:\n${result.stdout}`);
      }
    } else {
      log('[quality-check] XO check passed');
    }
  }

  async checkPrettier(): Promise<void> {
    if (!this.config.prettier.enabled) {
      return;
    }

    log('[quality-check] Running Prettier check...');

    const checkResult = await this.runCommand(
      'npx',
      ['prettier', '--check', this.filePath],
      this.projectRoot
    );

    if (checkResult.code !== 0) {
      if (this.config.prettier.autofix) {
        await this.runCommand('npx', ['prettier', '--write', this.filePath], this.projectRoot);
        if (this.config.general.autofixSilent) {
          this.autofixes.push('Prettier auto-formatted the file');
        } else {
          this.warnings.push('Prettier formatting was auto-applied - verify the changes');
        }
      } else {
        this.errors.push(`Prettier formatting issues in ${path.basename(this.filePath)}`);
      }
    } else {
      log('[quality-check] Prettier check passed');
    }
  }

  async checkCommonIssues(): Promise<void> {
    log('[quality-check] Checking common issues...');

    let content: string;
    try {
      content = fs.readFileSync(this.filePath, 'utf8');
    } catch {
      return;
    }

    const lines = content.split('\n');
    const fileType = this.detectFileType();

    // Check for 'as any'
    const asAnyRule = this.config.rules.asAny;
    if (asAnyRule?.enabled !== false && (fileType === 'typescript' || fileType === 'component')) {
      lines.forEach((line, index) => {
        if (line.includes('as any')) {
          const msg = `Found 'as any' at line ${index + 1}: ${asAnyRule?.message ?? 'Use proper types'}`;
          if (asAnyRule?.severity === 'error') {
            this.errors.push(msg);
          } else {
            this.warnings.push(msg);
          }
        }
      });
    }

    // Check for console statements
    const consoleRule = this.config.rules.console;
    if (consoleRule?.enabled !== false) {
      let allowConsole = false;

      if (consoleRule?.allowIn?.paths?.some((p) => this.filePath.includes(p))) {
        allowConsole = true;
      }
      if (consoleRule?.allowIn?.fileTypes?.includes(fileType)) {
        allowConsole = true;
      }

      if (!allowConsole) {
        lines.forEach((line, index) => {
          if (/console\./.test(line) && !line.trim().startsWith('//')) {
            const msg = `Console statement at line ${index + 1}: ${consoleRule?.message ?? 'Consider removing'}`;
            if (consoleRule?.severity === 'error') {
              this.errors.push(msg);
            } else {
              this.warnings.push(msg);
            }
          }
        });
      }
    }

    // Check for debugger statements
    const debuggerRule = this.config.rules.debugger;
    if (debuggerRule?.enabled !== false) {
      lines.forEach((line, index) => {
        if (/^\s*debugger\s*;?\s*$/.test(line)) {
          const msg = `Debugger statement at line ${index + 1}: ${debuggerRule?.message ?? 'Remove before commit'}`;
          if (debuggerRule?.severity === 'error') {
            this.errors.push(msg);
          } else {
            this.warnings.push(msg);
          }
        }
      });
    }

    // Check for TODOs
    const todosRule = this.config.rules.todos;
    if (todosRule?.enabled !== false) {
      const patterns = todosRule?.patterns ?? ['TODO', 'FIXME', 'HACK'];
      const pattern = new RegExp(`\\b(${patterns.join('|')})\\b`, 'i');

      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          this.warnings.push(`Found ${line.match(pattern)?.[0]} at line ${index + 1}`);
        }
      });
    }
  }

  async checkAll(): Promise<CheckResult> {
    const fileType = this.detectFileType();
    if (fileType === 'unknown') {
      log('[quality-check] Unknown file type, skipping checks');
      return { errors: [], warnings: [], autofixes: [] };
    }

    await Promise.all([
      this.checkTypeScript(),
      this.checkXO(),
      this.checkPrettier(),
      this.checkCommonIssues(),
    ]);

    return {
      errors: this.errors,
      warnings: this.warnings,
      autofixes: this.autofixes,
    };
  }
}

// ============================================================================
// Configuration Loading
// ============================================================================

function loadConfig(projectRoot: string): QualityCheckConfig {
  const defaultConfig: QualityCheckConfig = {
    version: '1.0.0',
    name: 'Quality Check',
    description: 'TypeScript, XO, and Prettier quality checks',
    projectType: 'generic',
    typescript: {
      enabled: true,
      showDependencyErrors: false,
    },
    xo: {
      enabled: true,
      autofix: true,
    },
    prettier: {
      enabled: true,
      autofix: true,
    },
    general: {
      autofixSilent: true,
      debug: false,
    },
    rules: {
      console: {
        enabled: true,
        severity: 'warning',
        message: 'Consider using a proper logger',
        allowIn: {
          fileTypes: ['cli', 'test'],
        },
      },
      asAny: {
        enabled: true,
        severity: 'warning',
        message: "Prefer proper types or 'as unknown'",
      },
      debugger: {
        enabled: true,
        severity: 'error',
        message: 'Remove debugger statements before commit',
      },
      todos: {
        enabled: true,
        severity: 'info',
        patterns: ['TODO', 'FIXME', 'HACK'],
      },
    },
  };

  // Try to load project-specific config
  const configPaths = [
    path.join(projectRoot, '.claude', 'hooks', 'quality-check.json'),
    path.join(projectRoot, '.claude', 'quality-check.json'),
    path.join(getClaudeDir(), 'hooks', 'quality-check.json'),
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const fileConfig = JSON.parse(
          fs.readFileSync(configPath, 'utf8')
        ) as Partial<QualityCheckConfig>;
        return { ...defaultConfig, ...fileConfig };
      } catch {
        // Use default
      }
    }
  }

  // Apply environment variable overrides
  if (process.env['CLAUDE_HOOKS_TYPESCRIPT_ENABLED'] === 'false') {
    defaultConfig.typescript.enabled = false;
  }
  if (process.env['CLAUDE_HOOKS_XO_ENABLED'] === 'false') {
    defaultConfig.xo.enabled = false;
  }
  if (process.env['CLAUDE_HOOKS_PRETTIER_ENABLED'] === 'false') {
    defaultConfig.prettier.enabled = false;
  }
  if (process.env['CLAUDE_HOOKS_DEBUG'] === 'true') {
    defaultConfig.general.debug = true;
  }

  return defaultConfig;
}

// ============================================================================
// Hook Implementation
// ============================================================================

function extractFilePath(input: PostToolUseInput): string | null {
  const toolInput = input.tool_input as Record<string, unknown>;

  // Handle various parameter names used by different tools
  const pathKeys = [
    'file_path', // Write, Edit, mcp__morph__edit_file
    'path', // mcp__desktop-commander__write_file, edit_block
    'notebook_path', // NotebookEdit
    'filePath', // Some tools use camelCase
    'filename', // Alternative naming
    'target', // Some MCP tools
    'destination', // Move operations (check destination for new file)
  ];

  for (const key of pathKeys) {
    const value = toolInput[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return null;
}

function isSourceFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath);
}

/**
 * List of tools that can modify local files
 * Includes built-in Claude Code tools and MCP tools
 */
const FILE_MODIFYING_TOOLS = new Set([
  // Built-in Claude Code tools
  'Write',
  'Edit',
  'MultiEdit',
  'NotebookEdit',

  // Desktop Commander MCP tools
  'mcp__desktop-commander__write_file',
  'mcp__desktop-commander__edit_block',
  'mcp__desktop-commander__move_file',

  // Morph MCP tools (filesystem-with-morph)
  'mcp__morph__edit_file',
  'mcp__morph__write_file',
  'mcp__filesystem-with-morph__edit_file',
  'mcp__filesystem-with-morph__write_file',

  // Generic filesystem MCP patterns
  'mcp__filesystem__write_file',
  'mcp__filesystem__edit_file',
]);

function isFileModifyingTool(toolName: string): boolean {
  // Direct match
  if (FILE_MODIFYING_TOOLS.has(toolName)) {
    return true;
  }

  // Pattern matching for MCP tools with various naming conventions
  const patterns = [
    /^mcp__.*__write_file$/,
    /^mcp__.*__edit_file$/,
    /^mcp__.*__edit_block$/,
    /^mcp__.*__create_file$/,
    /^mcp__.*__update_file$/,
    /^mcp__.*__save_file$/,
  ];

  return patterns.some((pattern) => pattern.test(toolName));
}

export async function qualityCheckHook(input: PostToolUseInput): Promise<PostToolUseOutput> {
  // Only run for file-modifying operations
  if (!isFileModifyingTool(input.tool_name)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
      },
    };
  }

  const filePath = extractFilePath(input);
  if (!filePath) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
      },
    };
  }

  // Only check source files
  if (!isSourceFile(filePath)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
      },
    };
  }

  // Skip if file doesn't exist
  if (!fs.existsSync(filePath)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
      },
    };
  }

  // Determine project root
  // For files in ~/.claude/hooks, always use hooks directory as project root
  const claudeHooksDir = path.join(getClaudeDir(), 'hooks');
  const projectRoot = filePath.startsWith(claudeHooksDir)
    ? claudeHooksDir
    : (process.env['CLAUDE_PROJECT_DIR'] ?? path.dirname(filePath));

  // Load configuration
  const config = loadConfig(projectRoot);

  log(`[quality-check] Checking ${path.basename(filePath)}`);

  // Run quality checks
  const checker = new QualityChecker(filePath, projectRoot, config);
  const result = await checker.checkAll();

  // Log results
  if (result.autofixes.length > 0) {
    log('[quality-check] Auto-fixes applied:');
    result.autofixes.forEach((fix) => log(`  - ${fix}`));
  }

  if (result.warnings.length > 0) {
    log('[quality-check] Warnings:');
    result.warnings.forEach((warn) => log(`  - ${warn}`));
  }

  if (result.errors.length > 0) {
    log('[quality-check] ERRORS (must be fixed):');
    result.errors.forEach((err) => log(`  - ${err}`));

    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        decision: 'block',
        reason: `Quality check failed: ${result.errors.length} error(s) found`,
        additionalContext: [
          'Quality Check Results:',
          '---------------------',
          ...result.errors.map((e) => `ERROR: ${e}`),
          ...result.warnings.map((w) => `WARN: ${w}`),
          '',
          'Fix all errors before continuing.',
        ].join('\n'),
      },
    };
  }

  log('[quality-check] All checks passed');

  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        result.warnings.length > 0
          ? `Quality check passed with ${result.warnings.length} warning(s)`
          : undefined,
    },
  };
}

// Register the hook
registerHook('quality-check', 'PostToolUse', qualityCheckHook);
