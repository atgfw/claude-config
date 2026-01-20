/**
 * Code Node Test Validator Hook
 *
 * ENFORCES the mandated test pattern for Code node local testing:
 * 1. Must use .test.ts extension (not .js)
 * 2. Must have Vitest imports (describe, it, expect)
 * 3. Must have companion fixtures/ directory
 * 4. Must have *-input.json and *-expected.json fixture files
 *
 * This hook prevents ad-hoc console.log testing in favor of
 * structured Vitest + fixture-based testing.
 *
 * Part of the Spinal Cord - correction ledger entry j5g48i0h9k1l2345
 */
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
/**
 * Pattern to detect code-node test files
 */
const CODE_NODE_TEST_PATTERN = /[/\\]tests[/\\]code-nodes[/\\]/i;
/**
 * Pattern to detect Vitest imports (describe, it, or expect from 'vitest')
 */
const VITEST_COMBINED_PATTERN = /import\s*\{[^}]*(describe|it|expect)[^}]*\}\s*from\s*['"]vitest['"]/;
/**
 * Check if this is a code-node test file
 */
function isCodeNodeTestFile(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    return (CODE_NODE_TEST_PATTERN.test(normalized) &&
        (normalized.endsWith('.test.js') ||
            normalized.endsWith('.test.ts') ||
            normalized.endsWith('.spec.js') ||
            normalized.endsWith('.spec.ts')));
}
/**
 * Check if file uses wrong extension (.js instead of .ts)
 */
function hasWrongExtension(filePath) {
    return filePath.endsWith('.test.js') || filePath.endsWith('.spec.js');
}
/**
 * Check content for Vitest imports
 */
function hasVitestImports(content) {
    return VITEST_COMBINED_PATTERN.test(content);
}
/**
 * Check for console.log based testing (anti-pattern)
 */
function hasConsoleLogTesting(content) {
    // Patterns that indicate ad-hoc console.log testing
    const antiPatterns = [
        /console\.log\s*\(\s*['"`].*PASS/i,
        /console\.log\s*\(\s*['"`].*FAIL/i,
        /console\.log\s*\(\s*['"`].*TEST/i,
        /passed\s*\+\+/,
        /failed\s*\+\+/,
        /process\.exit\s*\(\s*[01]\s*\)/,
    ];
    return antiPatterns.some((pattern) => pattern.test(content));
}
/**
 * Check for fixture imports in test content
 */
function hasFixtureImports(content) {
    // Look for imports from fixtures directory or .json files
    const fixturePatterns = [
        /import\s+.*from\s*['"]\.\/fixtures\//,
        /import\s+.*from\s*['"]\.\.\/fixtures\//,
        /import\s+.*Input\s+from\s*['"].*\.json['"]/,
        /import\s+.*Expected\s+from\s*['"].*\.json['"]/,
        /require\s*\(\s*['"].*fixtures.*\.json['"]\s*\)/,
    ];
    return fixturePatterns.some((pattern) => pattern.test(content));
}
/**
 * Get the fixtures directory path for a test file
 */
function getFixturesDir(testFilePath) {
    const testDir = path.dirname(testFilePath);
    return path.join(testDir, 'fixtures');
}
/**
 * Check if fixtures directory exists and has required files
 */
function checkFixturesDirectory(testFilePath) {
    const fixturesDir = getFixturesDir(testFilePath);
    if (!fs.existsSync(fixturesDir)) {
        return { exists: false, hasInputs: false, hasExpected: false, files: [] };
    }
    try {
        const files = fs.readdirSync(fixturesDir);
        const hasInputs = files.some((f) => f.includes('input') && f.endsWith('.json'));
        const hasExpected = files.some((f) => f.includes('expected') && f.endsWith('.json'));
        return { exists: true, hasInputs, hasExpected, files };
    }
    catch {
        return { exists: false, hasInputs: false, hasExpected: false, files: [] };
    }
}
/**
 * Validate code node test file
 */
function validateCodeNodeTest(filePath, content) {
    const result = {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
    };
    // 1. Check extension
    if (hasWrongExtension(filePath)) {
        result.valid = false;
        result.errors.push('Code node tests must use .test.ts extension (not .js)');
        result.suggestions.push(`Rename to: ${filePath.replace(/\.test\.js$/, '.test.ts').replace(/\.spec\.js$/, '.spec.ts')}`);
    }
    // 2. Check for Vitest imports
    if (!hasVitestImports(content)) {
        result.valid = false;
        result.errors.push('Missing Vitest imports (describe, it, expect)');
        result.suggestions.push("Add: import { describe, it, expect } from 'vitest';");
    }
    // 3. Check for console.log anti-pattern
    if (hasConsoleLogTesting(content)) {
        result.valid = false;
        result.errors.push('Ad-hoc console.log testing detected - use Vitest assertions instead');
        result.suggestions.push('Replace console.log("TEST PASS") with expect(result).toBe(expected)');
        result.suggestions.push('Remove passed++/failed++ counters - Vitest handles test counting');
        result.suggestions.push('Remove process.exit() - Vitest handles exit codes');
    }
    // 4. Check for fixture imports (only if Vitest imports present)
    if (hasVitestImports(content) && !hasFixtureImports(content)) {
        result.warnings.push('No fixture imports detected - test data should be in external JSON files');
        result.suggestions.push('Create fixtures/ directory with *-input.json and *-expected.json files');
        result.suggestions.push("Import fixtures: import validInput from './fixtures/valid-input.json';");
    }
    // 5. Check fixtures directory exists (only for .ts files being created)
    if (filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts')) {
        const fixturesCheck = checkFixturesDirectory(filePath);
        if (!fixturesCheck.exists) {
            result.warnings.push('No fixtures/ directory found - create one with input/expected JSON files');
        }
        else {
            if (!fixturesCheck.hasInputs) {
                result.warnings.push('No *-input.json files in fixtures/ directory');
            }
            if (!fixturesCheck.hasExpected) {
                result.warnings.push('No *-expected.json files in fixtures/ directory');
            }
        }
    }
    return result;
}
/**
 * Extract file path and content from Write/Edit tool input
 */
function extractInput(input) {
    const toolInput = input.tool_input;
    if (!toolInput || typeof toolInput !== 'object') {
        return { filePath: null, content: null };
    }
    const filePath = toolInput['file_path'];
    const content = toolInput['content'] ?? toolInput['new_string'];
    return {
        filePath: typeof filePath === 'string' ? filePath : null,
        content: typeof content === 'string' ? content : null,
    };
}
/**
 * Generate the correct test template
 */
function generateCorrectTemplate(nodeName) {
    return `
// Correct Code Node Test Template:

import { describe, it, expect } from 'vitest';
import { ${nodeName} } from './${nodeName}.js';

// Import fixtures
import validInput from './fixtures/valid-input.json';
import validExpected from './fixtures/valid-expected.json';
import errorInput from './fixtures/error-input.json';

describe('${nodeName}', () => {
  it('processes valid input correctly', () => {
    const result = ${nodeName}(validInput);
    expect(result).toEqual(validExpected);
  });

  it('throws on invalid input', () => {
    expect(() => ${nodeName}(errorInput)).toThrow();
  });
});
`.trim();
}
/**
 * Code Node Test Validator Hook Implementation
 */
export async function codeNodeTestValidatorHook(input) {
    const { filePath, content } = extractInput(input);
    if (!filePath) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Only check code-node test files
    if (!isCodeNodeTestFile(filePath)) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    log(`[CODE NODE TEST] Validating: ${filePath}`);
    // If no content (e.g., file deletion), allow
    if (!content) {
        logAllowed('No content to validate');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Validate the test file
    const validation = validateCodeNodeTest(filePath, content);
    if (!validation.valid) {
        log('');
        log('[CODE NODE TEST BLOCKED]');
        log('');
        log('ERRORS:');
        for (const error of validation.errors) {
            log(`  - ${error}`);
        }
        if (validation.warnings.length > 0) {
            log('');
            log('WARNINGS:');
            for (const warning of validation.warnings) {
                log(`  - ${warning}`);
            }
        }
        log('');
        log('SUGGESTIONS:');
        for (const suggestion of validation.suggestions) {
            log(`  - ${suggestion}`);
        }
        // Extract node name for template
        const nodeNameMatch = filePath.match(/[/\\]([^/\\]+)\.test\.(js|ts)$/);
        const nodeName = nodeNameMatch && nodeNameMatch[1] ? nodeNameMatch[1].replace(/-/g, '') : 'nodeFunction';
        log('');
        log('CORRECT TEMPLATE:');
        log(generateCorrectTemplate(nodeName));
        logBlocked('Code node test does not follow mandated Vitest + fixtures pattern', 'Code nodes MUST be developed locally first with Vitest tests and external fixture files');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: `CODE NODE TEST BLOCKED: ${validation.errors.join('; ')}. Use Vitest with external fixture files.`,
            },
        };
    }
    // Valid but may have warnings
    if (validation.warnings.length > 0) {
        log('');
        log('[CODE NODE TEST WARNINGS]');
        for (const warning of validation.warnings) {
            log(`  - ${warning}`);
        }
        log('');
    }
    logAllowed('Code node test follows Vitest + fixtures pattern');
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
        },
    };
}
// Register the hook
registerHook('code-node-test-validator', 'PreToolUse', codeNodeTestValidatorHook);
export default codeNodeTestValidatorHook;
//# sourceMappingURL=code_node_test_validator.js.map