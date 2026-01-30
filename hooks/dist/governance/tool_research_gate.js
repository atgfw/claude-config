/**
 * Tool Research Gate Hook
 *
 * BLOCKS creation of automation wrapper files when no research document exists.
 * Enforces pre-implementation research to prevent reinventing the wheel.
 *
 * Detection:
 * - Path patterns: wrappers/, integrations/, automation/, clients/, adapters/, connectors/
 * - Requires TOOL-RESEARCH.md in same directory with valid sections
 *
 * See CLAUDE.md "Tool Selection Protocol" section.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { log, logBlocked, logAllowed, getClaudeDir as getClaudeDirectory } from '../utils.js';
import { registerHook } from '../runner.js';
// ============================================================================
// Path Patterns
// ============================================================================
/**
 * Path patterns that indicate wrapper/integration directories
 */
const wrapperPathPatterns = [
    /[/\\]wrappers[/\\]/i,
    /[/\\]integrations[/\\]/i,
    /[/\\]automation[/\\]/i,
    /[/\\]clients[/\\]/i,
    /[/\\]adapters[/\\]/i,
    /[/\\]connectors[/\\]/i,
];
/**
 * File extensions that are code files (not config/docs)
 */
const codeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs']);
/**
 * Star threshold for warning when rejecting high-star tools
 */
const highStarThreshold = 5000;
// ============================================================================
// Detection Functions
// ============================================================================
/**
 * Check if a file path is in a wrapper directory
 */
export function isWrapperPath(filePath) {
    return wrapperPathPatterns.some((pattern) => pattern.test(filePath));
}
/**
 * Check if a file is a code file (not config/docs)
 */
export function isCodeFile(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return codeExtensions.has(extension);
}
/**
 * Get the research document path for a wrapper file
 */
export function getResearchDocumentPath(wrapperFilePath) {
    const directory = path.dirname(wrapperFilePath);
    return path.join(directory, 'TOOL-RESEARCH.md');
}
/**
 * Check if research document exists
 */
export function researchDocumentExists(wrapperFilePath) {
    const researchPath = getResearchDocumentPath(wrapperFilePath);
    return fs.existsSync(researchPath);
}
// ============================================================================
// Research Document Validation
// ============================================================================
/**
 * Required sections in a research document
 */
const requiredSections = [
    { pattern: /^#+\s*problem statement/im, name: 'Problem Statement' },
    { pattern: /^#+\s*search queries/im, name: 'Search Queries Executed' },
    { pattern: /^#+\s*candidates found/im, name: 'Candidates Found' },
    { pattern: /^#+\s*final decision/im, name: 'Final Decision' },
];
/**
 * Validate the contents of a research document
 */
export function validateResearchDocument(content) {
    const result = {
        valid: true,
        errors: [],
        warnings: [],
        toolsEvaluated: [],
    };
    // Check required sections
    for (const section of requiredSections) {
        if (!section.pattern.test(content)) {
            result.valid = false;
            result.errors.push(`Missing required section: ${section.name}`);
        }
    }
    // Extract evaluated tools - first find each tool section, then parse details
    const toolSectionPattern = /###\s+([^\n]+)\n([\s\S]*?)(?=###|## final decision|$)/gi;
    const toolSections = content.matchAll(toolSectionPattern);
    for (const sectionMatch of toolSections) {
        const name = sectionMatch[1]?.trim() ?? '';
        const sectionContent = sectionMatch[2] ?? '';
        // Skip sections that don't have a decision (not a tool evaluation)
        const decisionMatch = /\*\*decision:\*\*\s*(accepted|rejected)/i.exec(sectionContent);
        if (!decisionMatch) {
            continue;
        }
        const decision = (decisionMatch[1]?.toUpperCase() ?? 'REJECTED');
        // Extract stars if present
        const starsMatch = /\*\*stars:\*\*\s*([,\d]+)/i.exec(sectionContent);
        const starsString = starsMatch?.[1]?.replace(/,/g, '');
        const stars = starsString ? Number.parseInt(starsString, 10) : undefined;
        result.toolsEvaluated.push({ name, stars, decision });
        // Warn if rejecting high-star tool
        if (decision === 'REJECTED' && stars && stars >= highStarThreshold) {
            result.warnings.push(`Rejected tool "${name}" with ${stars.toLocaleString()} stars - ensure rationale is documented`);
        }
    }
    // Check for at least one tool evaluated
    if (result.toolsEvaluated.length === 0) {
        result.valid = false;
        result.errors.push('No tools evaluated - research document must evaluate at least one existing tool');
    }
    // Extract final decision
    const decisionPattern = /\*\*choice:\*\*\s*(build|use)/i;
    const decisionMatch = decisionPattern.exec(content);
    if (decisionMatch) {
        result.finalDecision = decisionMatch[1]?.toUpperCase();
    }
    else {
        result.valid = false;
        result.errors.push('Missing final decision - must specify BUILD or USE');
    }
    // Extract rationale
    const rationalePattern = /\*\*rationale:\*\*\s*\n([^\n]+(?:\n(?![*#]).*)*)/i;
    const rationaleMatch = rationalePattern.exec(content);
    if (rationaleMatch) {
        result.rationale = rationaleMatch[1]?.trim();
    }
    return result;
}
// ============================================================================
// Registry Management
// ============================================================================
/**
 * Get the registry file path
 */
export function getRegistryPath() {
    return path.join(getClaudeDirectory(), 'ledger', 'tool-research-registry.json');
}
/**
 * Load the registry
 */
export function loadRegistry() {
    const registryPath = getRegistryPath();
    if (!fs.existsSync(registryPath)) {
        return {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            entries: [],
        };
    }
    try {
        const content = fs.readFileSync(registryPath, 'utf8');
        return JSON.parse(content);
    }
    catch {
        return {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            entries: [],
        };
    }
}
/**
 * Save the registry
 */
export function saveRegistry(registry) {
    const registryPath = getRegistryPath();
    registry.lastUpdated = new Date().toISOString();
    fs.writeFileSync(registryPath, JSON.stringify(registry, undefined, 2));
}
/**
 * Generate entry ID
 */
function generateEntryId(problemDomain, projectPath) {
    const hash = crypto.createHash('sha256');
    hash.update(`${problemDomain}:${projectPath}:${Date.now()}`);
    return hash.digest('hex').slice(0, 16);
}
/**
 * Record a research decision in the registry
 */
export function recordResearchDecision(problemDomain, projectPath, researchDocumentPath, validation) {
    const registry = loadRegistry();
    const entry = {
        id: generateEntryId(problemDomain, projectPath),
        timestamp: new Date().toISOString(),
        problemDomain,
        projectPath,
        researchDocumentPath,
        toolsEvaluated: validation.toolsEvaluated,
        finalDecision: validation.finalDecision ?? 'BUILD',
        rationale: validation.rationale ?? '',
        warnings: validation.warnings,
    };
    registry.entries.push(entry);
    saveRegistry(registry);
    return entry;
}
// ============================================================================
// Hook Implementation
// ============================================================================
/**
 * Main tool research gate hook
 */
export async function toolResearchGateHook(input) {
    const toolName = input.tool_name ?? '';
    const toolInput = input.tool_input;
    // Only check Write and Edit operations
    if (toolName !== 'Write' && toolName !== 'Edit') {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Get file path
    const filePath = toolInput.file_path ?? '';
    if (!filePath) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    log(`[RESEARCH-GATE] Checking: ${filePath}`);
    // Skip if not a wrapper path
    if (!isWrapperPath(filePath)) {
        logAllowed('Not a wrapper path');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Skip if not a code file
    if (!isCodeFile(filePath)) {
        logAllowed('Not a code file');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Skip if this IS the research document
    if (filePath.endsWith('TOOL-RESEARCH.md')) {
        logAllowed('This is the research document itself');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    log(`[RESEARCH-GATE] Detected wrapper file: ${filePath}`);
    // Check if research document exists
    const researchPath = getResearchDocumentPath(filePath);
    if (!fs.existsSync(researchPath)) {
        logBlocked(`No research document found at ${researchPath}`, 'Tool Selection Protocol - research required before creating wrappers');
        const templatePath = path.join(getClaudeDirectory(), 'templates', 'TOOL-RESEARCH.template.md');
        const templateNote = fs.existsSync(templatePath)
            ? `\n\nTemplate available at: ${templatePath}`
            : '';
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: `RESEARCH REQUIRED: Cannot create wrapper file without research document.\n\nCreate ${researchPath} first with:\n- Problem Statement\n- Search Queries Executed\n- Candidates Found (evaluate existing tools)\n- Final Decision (BUILD or USE)${templateNote}`,
            },
        };
    }
    // Validate research document content
    const content = fs.readFileSync(researchPath, 'utf8');
    const validation = validateResearchDocument(content);
    if (!validation.valid) {
        const errorSummary = validation.errors.join('\n  - ');
        logBlocked(`Research document incomplete: ${validation.errors[0]}`, 'Tool Selection Protocol');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: `RESEARCH INCOMPLETE: ${researchPath} is missing required sections:\n  - ${errorSummary}\n\nComplete all required sections before creating wrapper files.`,
            },
        };
    }
    // Log warnings but allow
    if (validation.warnings.length > 0) {
        log('[RESEARCH-GATE] Warnings:');
        for (const warning of validation.warnings) {
            log(`  - ${warning}`);
        }
    }
    // Record the decision
    const directory = path.dirname(filePath);
    const problemDomain = path.basename(directory);
    recordResearchDecision(problemDomain, directory, researchPath, validation);
    const warningNote = validation.warnings.length > 0
        ? `\n\nWarnings:\n${validation.warnings.map((w) => `  - ${w}`).join('\n')}`
        : '';
    logAllowed(`Research validated - ${validation.finalDecision} decision with ${validation.toolsEvaluated.length} tools evaluated`);
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
            permissionDecisionReason: `Research validated: ${validation.finalDecision} decision, ${validation.toolsEvaluated.length} tools evaluated${warningNote}`,
        },
    };
}
// Register the hook
registerHook('tool-research-gate', 'PreToolUse', toolResearchGateHook);
export default toolResearchGateHook;
//# sourceMappingURL=tool_research_gate.js.map