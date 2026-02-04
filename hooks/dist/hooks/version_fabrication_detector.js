/**
 * Version Fabrication Detector Hook
 *
 * GLOBAL rule: Never fabricate versioning systems or version numbers anywhere.
 *
 * Detects when Write/Edit/Bash operations introduce version-like patterns
 * that didn't exist before in the file or codebase context.
 *
 * Rules (see CLAUDE.md):
 * - If a project has no versioning, don't add one
 * - Don't append _v2, _new, _backup to files/functions/classes
 * - Version numbers only valid when:
 *   1. The project already uses semantic versioning
 *   2. The user explicitly requests versioning
 *   3. It's a canonical term (oauth2, base64, sha256)
 */
import { logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
import * as fs from 'node:fs';
// ============================================================================
// Canonical Exceptions
// ============================================================================
/**
 * Canonical names that contain integers/versions but are allowed.
 * These are industry-standard terms where the integer is part of the name.
 */
const CANONICAL_EXCEPTIONS = new Set([
    // Encoding/crypto
    'base64',
    'utf8',
    'utf16',
    'utf32',
    'sha256',
    'sha512',
    'sha384',
    'sha1',
    'md5',
    'aes128',
    'aes256',
    'rsa2048',
    'rsa4096',
    // Auth/protocols
    'oauth2',
    'http2',
    'http3',
    'web3',
    'ipv4',
    'ipv6',
    '2fa',
    'mfa',
    // ECMAScript versions
    'es5',
    'es6',
    'es2015',
    'es2020',
    'es2021',
    'es2022',
    'es2023',
    'es2024',
    // Media/graphics
    'mp3',
    'mp4',
    'h264',
    'h265',
    '3d',
    '2d',
    // Localization
    'i18n',
    'l10n',
    'g11n',
    // Common APIs/libs
    'd3',
    'vue3',
    'react18',
    'node18',
    'node20',
    'python3',
    // CSS/styling
    'css3',
    'html5',
    // Database
    'utf8mb4',
    // Compression
    'lz4',
    'zstd',
]);
/**
 * Patterns that indicate intentional versioning in a project.
 * If these exist, version numbers may be intentional.
 */
const EXISTING_VERSION_INDICATORS = [
    'package.json',
    'version.json',
    'VERSION',
    'CHANGELOG.md',
    '.semver',
    'pyproject.toml',
    'setup.py',
    'Cargo.toml',
    'pom.xml',
    'build.gradle',
];
// ============================================================================
// Detection Functions
// ============================================================================
/**
 * Version patterns that indicate fabricated versioning.
 * These are typically appended to names without semantic meaning.
 */
const FABRICATED_VERSION_PATTERNS = [
    // Explicit version suffixes
    /[_-]v(\d+)(?:\.\d+)*$/i, // _v1, -v2, _v1.0
    /[_-]ver(\d+)$/i, // _ver1, -ver2
    /[_-]version(\d+)$/i, // _version1
    /[_-]r(\d+)$/i, // _r1, -r2 (revision)
    /[_-]rev(\d+)$/i, // _rev1, -rev2
    // Backup/copy suffixes
    /[_-]new$/i, // _new
    /[_-]old$/i, // _old
    /[_-]backup$/i, // _backup
    /[_-]bak$/i, // _bak
    /[_-]copy$/i, // _copy
    /[_-]original$/i, // _original
    /[_-]temp$/i, // _temp
    /[_-]tmp$/i, // _tmp
    // Numeric suffixes (arbitrary)
    /[_-](\d+)$/, // _1, _2, -1, -2
    /(\d+)$/, // handler2, process3
    // Draft/WIP markers that suggest fabricated versions
    /[_-]draft$/i, // _draft
    /[_-]wip$/i, // _wip
    /[_-]final$/i, // _final (ironic)
];
/**
 * Check if a string contains fabricated version patterns.
 */
export function detectFabricatedVersions(text) {
    const result = {
        found: false,
        patterns: [],
        locations: [],
    };
    // Split into words/identifiers
    const identifiers = extractIdentifiers(text);
    for (const identifier of identifiers) {
        // Skip if matches canonical exception
        if (isCanonicalException(identifier)) {
            continue;
        }
        // Check against fabrication patterns
        for (const pattern of FABRICATED_VERSION_PATTERNS) {
            if (pattern.test(identifier)) {
                result.found = true;
                result.patterns.push(identifier);
                result.locations.push(`"${identifier}" matches fabrication pattern`);
                break;
            }
        }
    }
    // Dedupe
    result.patterns = [...new Set(result.patterns)];
    result.locations = [...new Set(result.locations)];
    return result;
}
/**
 * Extract identifiers (variable names, function names, filenames) from text.
 */
function extractIdentifiers(text) {
    const identifiers = [];
    // Match common identifier patterns
    const patterns = [
        // Function/method names: function foo_v2(), def bar_new():
        /(?:function|def|const|let|var|class)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
        // File paths: /path/to/file_v2.ts
        /[/\\]([a-zA-Z_][a-zA-Z0-9_-]*)\.[a-z]+/g,
        // Export names: export { foo_v2 }
        /export\s+(?:default\s+)?(?:function|class|const|let|var)?\s*([a-zA-Z_][a-zA-Z0-9_]*)/g,
        // Import names
        /import\s+(?:\{[^}]*\}|[a-zA-Z_][a-zA-Z0-9_]*)\s+from/g,
        // Object keys: { foo_v2: ... }
        /([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
        // Variable assignments
        /([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g,
    ];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            if (match[1]) {
                identifiers.push(match[1]);
            }
        }
    }
    return identifiers;
}
/**
 * Check a filename directly for version patterns.
 * This handles cases where the filename itself has versioning (e.g., handler_v2.ts)
 */
export function detectFilenameVersioning(filename) {
    const result = {
        found: false,
        patterns: [],
        locations: [],
    };
    // Skip if matches canonical exception
    if (isCanonicalException(filename)) {
        return result;
    }
    // Check against fabrication patterns
    for (const pattern of FABRICATED_VERSION_PATTERNS) {
        if (pattern.test(filename)) {
            result.found = true;
            result.patterns.push(filename);
            result.locations.push(`Filename "${filename}" matches fabrication pattern`);
            break;
        }
    }
    return result;
}
/**
 * Check if an identifier matches a canonical exception.
 */
function isCanonicalException(identifier) {
    const lower = identifier.toLowerCase();
    // Direct match
    if (CANONICAL_EXCEPTIONS.has(lower)) {
        return true;
    }
    // Check if any canonical exception is contained in the identifier
    for (const canonical of CANONICAL_EXCEPTIONS) {
        if (lower.includes(canonical)) {
            // Ensure the canonical term accounts for the version-like part
            const withoutCanonical = lower.replace(canonical, '');
            // If removing the canonical leaves no version patterns, it's OK
            if (!/\d+/.test(withoutCanonical)) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Check if a directory has existing version infrastructure.
 * Checks the specified directory, not cwd.
 */
function hasExistingVersioning(targetDir) {
    if (!targetDir) {
        return false;
    }
    for (const indicator of EXISTING_VERSION_INDICATORS) {
        try {
            const fullPath = `${targetDir}/${indicator}`;
            if (fs.existsSync(fullPath)) {
                return true;
            }
        }
        catch {
            // Ignore errors
        }
    }
    return false;
}
/**
 * Check if the original file content already contains version patterns.
 * If versioning already exists, don't block new version patterns.
 */
function contentAlreadyHasVersioning(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return false;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const detection = detectFabricatedVersions(content);
        return detection.found;
    }
    catch {
        return false;
    }
}
// ============================================================================
// Hook Implementation
// ============================================================================
/**
 * Main version fabrication detector hook.
 * Blocks Write/Edit operations that introduce fabricated versioning.
 */
export async function versionFabricationDetectorHook(input) {
    const toolName = input.tool_name ?? '';
    const toolInput = input.tool_input;
    // Only check Write, Edit, and relevant Bash commands
    const isWriteOp = toolName === 'Write';
    const isEditOp = toolName === 'Edit';
    const isBashOp = toolName === 'Bash';
    if (!isWriteOp && !isEditOp && !isBashOp) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
                permissionDecisionReason: 'Not a file operation',
            },
        };
    }
    // For Bash, only check echo/cat/printf that write files
    if (isBashOp) {
        const command = toolInput['command'] ?? '';
        const isFileWrite = /(?:echo|cat|printf).*>/.test(command);
        if (!isFileWrite) {
            return {
                hookSpecificOutput: {
                    hookEventName: 'PreToolUse',
                    permissionDecision: 'allow',
                    permissionDecisionReason: 'Not a file write operation',
                },
            };
        }
    }
    // Extract content to analyze
    let contentToCheck = '';
    let filePath = '';
    if (isWriteOp) {
        contentToCheck = toolInput['content'] ?? '';
        filePath = toolInput['file_path'] ?? '';
    }
    else if (isEditOp) {
        contentToCheck = toolInput['new_string'] ?? '';
        filePath = toolInput['file_path'] ?? '';
    }
    else if (isBashOp) {
        contentToCheck = toolInput['command'] ?? '';
        // Try to extract file path from command
        const pathMatch = contentToCheck.match(/>\s*["']?([^"'\s>]+)["']?/);
        filePath = pathMatch?.[1] ?? '';
    }
    // Detect fabricated versions in content
    const detection = detectFabricatedVersions(contentToCheck);
    // Also check the filename itself for version patterns
    const filename = filePath.split(/[/\\]/).pop() ?? '';
    const filenameWithoutExt = filename.replace(/\.[^.]+$/, '');
    const filenameDetection = detectFilenameVersioning(filenameWithoutExt);
    // Merge detections
    if (filenameDetection.found) {
        detection.found = true;
        detection.patterns.push(...filenameDetection.patterns);
        detection.locations.push(...filenameDetection.locations);
    }
    if (!detection.found) {
        logAllowed('No fabricated versioning detected');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
                permissionDecisionReason: 'No fabricated versioning detected',
            },
        };
    }
    // Check if versioning already exists in file
    if (filePath && contentAlreadyHasVersioning(filePath)) {
        logAllowed('File already contains versioning patterns');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
                permissionDecisionReason: 'File already contains versioning (consistent use allowed)',
            },
        };
    }
    // Check if project has versioning infrastructure (check target file's directory)
    const targetDir = filePath ? filePath.replace(/[/\\][^/\\]+$/, '') : '';
    if (targetDir && hasExistingVersioning(targetDir)) {
        logAllowed('Project has versioning infrastructure');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
                permissionDecisionReason: 'Project has existing version infrastructure',
            },
        };
    }
    // Block fabricated versioning
    const patternList = detection.patterns.slice(0, 3).join(', ');
    const detectedList = detection.patterns.map((p) => `  - ${p}`).join('\n');
    const message = `Fabricated versioning detected: ${patternList}. ` +
        'Never create version suffixes (_v2, _new, _backup) or version numbers ' +
        'unless the project already uses versioning or the user explicitly requests it.\n\n' +
        'DETECTED PATTERNS:\n' +
        detectedList +
        '\n\nALLOWED EXCEPTIONS:\n' +
        '- Canonical terms: oauth2, base64, sha256, es6, etc.\n' +
        '- Projects with existing versioning (package.json, CHANGELOG.md, etc.)\n' +
        '- User explicitly requests versioning\n\n' +
        'SUGGESTIONS:\n' +
        '- Use descriptive names instead of version suffixes\n' +
        '- If updating existing code, modify in place instead of creating copies\n' +
        '- For backups, use git branches instead of file copies';
    logBlocked(message, 'Version Fabrication Ban - see CLAUDE.md');
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: message,
        },
    };
}
// Register the hook
registerHook('version-fabrication-detector', 'PreToolUse', versionFabricationDetectorHook);
export default versionFabricationDetectorHook;
//# sourceMappingURL=version_fabrication_detector.js.map