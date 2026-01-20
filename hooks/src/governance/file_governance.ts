/**
 * File Governance Configuration
 * Rules for filename and content standards (WARN-first approach)
 */

export const EXEMPT_FILENAMES = new Set([
  'Dockerfile',
  'Makefile',
  'package.json',
  'tsconfig.json',
  '.gitignore',
  '.env',
  'README.md',
  'LICENSE',
  'CLAUDE.md',
  'AGENTS.md',
]);

export const GENERIC_PATTERNS = [
  /^script\.[a-z]+$/i,
  /^utils?\.[a-z]+$/i,
  /^helpers?\.[a-z]+$/i,
  /^data\.[a-z]+$/i,
  /^config\.[a-z]+$/i,
  /^test\.[a-z]+$/i,
  /^temp/i,
  /^tmp/i,
  /^new[_-]?/i,
  /^old[_-]?/i,
  /^v\d+/i,
];

export const SNAKE_CASE_EXTENSIONS = new Set(['.ts', '.js', '.json', '.yaml', '.py']);
export const PASCAL_CASE_EXTENSIONS = new Set(['.tsx', '.jsx', '.vue', '.svelte']);
export const SHELL_EXTENSIONS = new Set(['.sh', '.bash', '.ps1', '.bat']);
export const MAX_SHELL_LINES = 20;
export const MIN_FILENAME_LENGTH = 8;
export const MIN_CODE_LINES = 3;

export interface GovernanceWarning {
  rule: string;
  message: string;
  suggestion?: string;
}

function getBasename(filepath: string): string {
  const normalized = filepath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || filepath;
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(idx) : '';
}

function getNameWithoutExt(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(0, idx) : filename;
}

export function isGenericFilename(filepath: string): GovernanceWarning | null {
  const basename = getBasename(filepath);
  for (const pattern of GENERIC_PATTERNS) {
    if (pattern.test(basename)) {
      return { rule: 'G1', message: 'Generic filename: ' + basename };
    }
  }
  return null;
}

export function isValidNamingConvention(filepath: string): GovernanceWarning | null {
  const basename = getBasename(filepath);
  const ext = getExtension(basename);
  const name = getNameWithoutExt(basename);
  if (EXEMPT_FILENAMES.has(basename)) return null;
  if (PASCAL_CASE_EXTENSIONS.has(ext)) {
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      return { rule: 'G2', message: 'Component should use PascalCase: ' + basename };
    }
    return null;
  }
  if (SNAKE_CASE_EXTENSIONS.has(ext)) {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      return { rule: 'G2', message: 'Backend file should use snake_case: ' + basename };
    }
  }
  return null;
}

export function isDescriptiveFilename(filepath: string): GovernanceWarning | null {
  const basename = getBasename(filepath);
  const name = getNameWithoutExt(basename);
  if (EXEMPT_FILENAMES.has(basename)) return null;
  if (name.length < MIN_FILENAME_LENGTH) {
    return { rule: 'G3', message: 'Filename too short: ' + basename };
  }
  return null;
}

export function isOversizedShellScript(
  filepath: string,
  content: string
): GovernanceWarning | null {
  const ext = getExtension(getBasename(filepath));
  if (!SHELL_EXTENSIONS.has(ext)) return null;
  const lines = content.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
  if (lines.length > MAX_SHELL_LINES) {
    return { rule: 'T1', message: 'Shell script too long (' + lines.length + ' lines)' };
  }
  return null;
}

export function isStubFile(content: string): GovernanceWarning | null {
  const lines = content.split('\n').filter((l) => {
    const t = l.trim();
    return (
      t && !t.startsWith('//') && !t.startsWith('/*') && !t.startsWith('*') && !t.startsWith('#')
    );
  });
  if (lines.length < MIN_CODE_LINES) {
    return { rule: 'C2', message: 'Stub file (' + lines.length + ' code lines)' };
  }
  return null;
}

export function shouldBeTypeScript(filepath: string): GovernanceWarning | null {
  const ext = getExtension(getBasename(filepath));
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
    return { rule: 'T2', message: 'Consider TypeScript instead of JavaScript' };
  }
  return null;
}

export function checkFileGovernance(filepath: string, content: string): GovernanceWarning[] {
  const warnings: GovernanceWarning[] = [];
  const checks = [
    isGenericFilename(filepath),
    isValidNamingConvention(filepath),
    isDescriptiveFilename(filepath),
    isOversizedShellScript(filepath, content),
    isStubFile(content),
    shouldBeTypeScript(filepath),
  ];
  for (const result of checks) {
    if (result) warnings.push(result);
  }
  return warnings;
}
