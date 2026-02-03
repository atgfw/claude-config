/**
 * Goal Auto-Derivation Hook
 *
 * Automatically derives the active goal from work context sources.
 * No manual goal setting required - focus is determined by what you're working on.
 *
 * Priority cascade:
 * 1. Git branch issue reference (feature/issue-123 → hydrate from GitHub issue)
 * 2. OpenSpec linkedArtifacts in active-goal.json
 * 3. Active Claude Code task (in_progress status)
 * 4. Most recent commit message intent
 * 5. Fallback: soft prompt to define
 *
 * Runs at: SessionStart, UserPromptSubmit (to detect context changes)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { registerHook } from '../runner.js';
import { getClaudeDir, log } from '../utils.js';
import { getSessionId, loadGoalStack, saveGoalStack, pushGoal, createDefaultFields, extractFieldsFromDescription, } from '../session/goal_stack.js';
// ============================================================================
// Context Source Queries
// ============================================================================
/**
 * Parse git branch for issue reference.
 * Patterns: feature/issue-123, bugfix/123-description, fix-123, etc.
 */
function parseGitBranch(workingDir) {
    try {
        const branch = execSync('git branch --show-current', {
            cwd: workingDir,
            encoding: 'utf-8',
            timeout: 5000,
        }).trim();
        if (!branch || branch === 'main' || branch === 'master') {
            return { branch };
        }
        // Extract issue number from branch name
        // Patterns: feature/123, feature/issue-123, bugfix/123-fix-login, 123-description
        const patterns = [
            /^(?:feature|bugfix|hotfix|chore|docs|fix)\/(?:issue-)?(\d+)/i,
            /^(?:feature|bugfix|hotfix|chore|docs|fix)\/(\d+)-/i,
            /^(\d+)-/,
            /-(\d+)$/,
        ];
        for (const pattern of patterns) {
            const match = branch.match(pattern);
            if (match?.[1]) {
                const issueNumber = Number.parseInt(match[1], 10);
                const typeMatch = branch.match(/^(feature|bugfix|hotfix|chore|docs|fix)\//i);
                return {
                    branch,
                    issueNumber,
                    issueType: typeMatch?.[1]?.toLowerCase() ?? 'feature',
                };
            }
        }
        return { branch };
    }
    catch {
        return null;
    }
}
/**
 * Fetch GitHub issue details using gh CLI.
 */
function fetchGitHubIssue(issueNumber, workingDir) {
    try {
        const result = execSync(`gh issue view ${issueNumber} --json title,body,labels`, {
            cwd: workingDir,
            encoding: 'utf-8',
            timeout: 10000,
        });
        const data = JSON.parse(result);
        return {
            title: data.title ?? `Issue #${issueNumber}`,
            body: data.body ?? '',
            labels: (data.labels ?? []).map((l) => l.name),
        };
    }
    catch {
        return null;
    }
}
/**
 * Load active-goal.json for linked artifacts.
 */
function loadActiveGoalFile() {
    const goalPath = path.join(getClaudeDir(), 'ledger', 'active-goal.json');
    try {
        const raw = fs.readFileSync(goalPath, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
/**
 * Load OpenSpec proposal by change ID.
 */
function loadOpenSpecProposal(changeId) {
    const proposalPath = path.join(getClaudeDir(), 'openspec', 'changes', changeId, 'proposal.md');
    try {
        const content = fs.readFileSync(proposalPath, 'utf-8');
        // Extract title from first # heading
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch?.[1] ?? changeId;
        // Check for status markers
        let status = 'draft';
        if (content.includes('[x] Implementation complete') || content.includes('Status: completed')) {
            status = 'completed';
        }
        else if (content.includes('[x] Design approved') || content.includes('Status: in-progress')) {
            status = 'in-progress';
        }
        // Check if archived
        if (proposalPath.includes('/archive/')) {
            status = 'archived';
        }
        return {
            changeId,
            title,
            description: content.substring(0, 500),
            status,
        };
    }
    catch {
        return null;
    }
}
/**
 * Get most recent commit message for intent detection.
 */
function getRecentCommitIntent(workingDir) {
    try {
        const message = execSync('git log -1 --format=%s', {
            cwd: workingDir,
            encoding: 'utf-8',
            timeout: 5000,
        }).trim();
        return message || null;
    }
    catch {
        return null;
    }
}
/**
 * Parse GitHub issue body into structured sections.
 */
function parseIssueSections(body) {
    const sections = {};
    // Extract ## Goal section
    const goalMatch = body.match(/##\s*Goal\s*\n([\s\S]*?)(?=\n##|\n$|$)/i);
    if (goalMatch?.[1]) {
        sections.goal = goalMatch[1].trim();
    }
    // Extract ## Problem section
    const problemMatch = body.match(/##\s*Problem\s*\n([\s\S]*?)(?=\n##|\n$|$)/i);
    if (problemMatch?.[1]) {
        sections.problem = problemMatch[1].trim();
    }
    // Extract ## Solution / ## Proposed Solution / ## Proposed Rule
    const solutionMatch = body.match(/##\s*(?:Proposed\s+)?(?:Solution|Rule|Behavior)\s*\n([\s\S]*?)(?=\n##|\n$|$)/i);
    if (solutionMatch?.[1]) {
        sections.solution = solutionMatch[1].trim();
    }
    // Extract ## Acceptance Criteria as checklist items
    const criteriaMatch = body.match(/##\s*Acceptance\s*Criteria\s*\n([\s\S]*?)(?=\n##|\n$|$)/i);
    if (criteriaMatch?.[1]) {
        const items = criteriaMatch[1].match(/- \[[ x]\]\s*(.+)/g);
        if (items) {
            sections.acceptanceCriteria = items.map((item) => item.replace(/- \[[ x]\]\s*/, '').trim());
        }
    }
    // Extract ## Implementation / ## Tasks as checklist items
    const implMatch = body.match(/##\s*(?:Implementation|Tasks)\s*\n([\s\S]*?)(?=\n##|\n$|$)/i);
    if (implMatch?.[1]) {
        const items = implMatch[1].match(/- \[[ x]\]\s*(.+)/g);
        if (items) {
            sections.implementation = items.map((item) => item.replace(/- \[[ x]\]\s*/, '').trim());
        }
    }
    // Extract ## Context / ## Description
    const contextMatch = body.match(/##\s*(?:Context|Description)\s*\n([\s\S]*?)(?=\n##|\n$|$)/i);
    if (contextMatch?.[1]) {
        sections.context = contextMatch[1].trim();
    }
    // Extract ## Impact
    const impactMatch = body.match(/##\s*Impact\s*\n([\s\S]*?)(?=\n##|\n$|$)/i);
    if (impactMatch?.[1]) {
        sections.impact = impactMatch[1].trim();
    }
    // Extract ## Priority
    const priorityMatch = body.match(/##\s*Priority\s*\n([\s\S]*?)(?=\n##|\n$|$)/i);
    if (priorityMatch?.[1]) {
        sections.priority = priorityMatch[1].trim();
    }
    return sections;
}
/**
 * Extract Task Specification v1.0 fields from GitHub issue intelligently.
 * Maps issue sections to WHO/WHAT/WHEN/WHERE/WHY/HOW/WHICH/LEST/WITH/MEASURED BY.
 */
function extractFieldsFromGitHubIssue(issueNumber, title, body, labels) {
    // First try explicit field extraction (if issue uses WHO/WHAT format)
    const explicitFields = extractFieldsFromDescription(body);
    const hasExplicitFields = Object.values(explicitFields).some((v) => v !== 'unknown' && !v.includes('not specified') && !v.includes('not defined'));
    console.error(`[extractFieldsFromGitHubIssue] hasExplicitFields=${hasExplicitFields}, explicitWhat=${explicitFields.what}`);
    if (hasExplicitFields) {
        // Fill in any remaining unknowns from parsed sections
        const sections = parseIssueSections(body);
        console.error(`[extractFieldsFromGitHubIssue] using enrichFieldsFromSections path`);
        return enrichFieldsFromSections(explicitFields, sections, issueNumber, title, labels);
    }
    // Parse structured sections
    const sections = parseIssueSections(body);
    console.error(`[extractFieldsFromGitHubIssue] using fresh derive path`);
    // Build fields from sections intelligently
    const fields = {
        // WHO: Derive from context or labels
        who: deriveWho(sections, labels, issueNumber),
        // WHAT: Use goal section, solution, or title
        what: deriveWhat(sections, title),
        // WHEN: Derive from priority or default to "current session"
        when: deriveWhen(sections, labels),
        // WHERE: List affected files/systems from implementation tasks
        where: deriveWhere(sections, issueNumber),
        // WHY: Use problem statement
        why: sections.problem ?? sections.impact ?? `Addresses issue #${issueNumber}`,
        // HOW: Use solution or implementation approach
        how: deriveHow(sections),
        // WHICH: Target objects from implementation tasks
        which: deriveWhich(sections, title),
        // LEST: Derive failure modes from problem statement
        lest: deriveLest(sections),
        // WITH: Dependencies from solution or labels
        with: deriveWith(sections, labels),
        // MEASURED BY: Use acceptance criteria
        measuredBy: deriveMeasuredBy(sections),
    };
    return fields;
}
function deriveWhat(sections, title) {
    console.error(`[deriveWhat] goal=${sections.goal?.substring(0, 50)}, solution=${sections.solution?.substring(0, 50)}`);
    // If goal section exists and is clean (not a section header)
    if (sections.goal) {
        const cleanGoal = sections.goal.trim();
        // Skip if it starts with ## (grabbed wrong content)
        if (!cleanGoal.startsWith('##') && !cleanGoal.startsWith('#')) {
            // Get first meaningful line
            const firstLine = cleanGoal.split('\n').find((l) => l.trim() && !l.startsWith('-'));
            if (firstLine && firstLine.length > 10) {
                log(`[deriveWhat] returning from goal: ${firstLine.trim()}`);
                return firstLine.trim();
            }
        }
    }
    // Try first line of solution (skip headers and list items only)
    if (sections.solution) {
        const lines = sections.solution.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            // Skip empty, headers, and list items (but allow bold **text**)
            if (trimmed &&
                !trimmed.startsWith('#') &&
                !trimmed.startsWith('- ') &&
                !trimmed.startsWith('* ') &&
                !/^\d+\.\s/.test(trimmed)) {
                if (trimmed.length > 15) {
                    // Strip markdown bold markers for cleaner output
                    const cleaned = trimmed.replace(/\*\*/g, '');
                    log(`[deriveWhat] returning from solution: ${cleaned.substring(0, 50)}`);
                    return cleaned.substring(0, 200);
                }
            }
        }
    }
    // Fall back to title (strip [system] prefix if present)
    const cleanTitle = title.replace(/^\[[^\]]+\]\s*/, '').replace(/^[a-z]+\([^)]+\):\s*/i, '');
    log(`[deriveWhat] returning from title: ${cleanTitle}`);
    return cleanTitle || title;
}
function deriveWho(sections, labels, issueNumber) {
    // Check for system labels
    const systemLabels = labels.filter((l) => l.startsWith('system/'));
    if (systemLabels.length > 0) {
        const systems = systemLabels.map((l) => l.replace('system/', '')).join(', ');
        return `${systems} system users and maintainers`;
    }
    // Check context for stakeholder mentions
    if (sections.context) {
        if (sections.context.includes('Claude Code'))
            return 'Claude Code sessions and users';
        if (sections.context.includes('n8n'))
            return 'n8n workflow developers';
        if (sections.context.includes('hook'))
            return 'Spinal Cord hook system';
    }
    return `Issue #${issueNumber} stakeholders`;
}
function deriveWhen(sections, labels) {
    // Check priority labels
    const priorityLabel = labels.find((l) => l.startsWith('priority/'));
    if (priorityLabel) {
        if (priorityLabel.includes('p0') || priorityLabel.includes('p1')) {
            return 'Immediate - blocking priority';
        }
        if (priorityLabel.includes('p2')) {
            return 'Current sprint - normal priority';
        }
        if (priorityLabel.includes('p3')) {
            return 'Backlog - when capacity allows';
        }
    }
    // Check explicit priority section
    if (sections.priority) {
        return sections.priority;
    }
    return 'Current session focus';
}
function deriveWhere(sections, issueNumber) {
    const locations = [];
    // Extract file paths from implementation tasks
    if (sections.implementation) {
        for (const task of sections.implementation) {
            const pathMatch = task.match(/`([^`]+\.[a-z]+)`/i);
            if (pathMatch?.[1]) {
                locations.push(pathMatch[1]);
            }
        }
    }
    // Extract from acceptance criteria
    if (sections.acceptanceCriteria) {
        for (const criteria of sections.acceptanceCriteria) {
            const pathMatch = criteria.match(/`([^`]+\.[a-z]+)`/i);
            if (pathMatch?.[1] && !locations.includes(pathMatch[1])) {
                locations.push(pathMatch[1]);
            }
        }
    }
    if (locations.length > 0) {
        return locations.slice(0, 4).join(', ');
    }
    return `GitHub Issue #${issueNumber}`;
}
function deriveHow(sections) {
    if (sections.solution) {
        // Get first meaningful line of solution
        const lines = sections.solution.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
        if (lines.length > 0) {
            return lines.slice(0, 2).join('; ').substring(0, 200);
        }
    }
    if (sections.implementation && sections.implementation.length > 0) {
        return sections.implementation.slice(0, 3).join('; ');
    }
    return 'Implementation approach to be determined from issue context';
}
function deriveWhich(sections, title) {
    // Extract target objects from title
    const titleTargets = [];
    // Look for hook names
    const hookMatch = title.match(/`([^`]+)`/);
    if (hookMatch?.[1]) {
        titleTargets.push(hookMatch[1]);
    }
    // Look for file types
    if (title.includes('hook'))
        titleTargets.push('PreToolUse/PostToolUse hooks');
    if (title.includes('validator'))
        titleTargets.push('validation hook');
    if (title.includes('gate'))
        titleTargets.push('enforcement gate');
    // Extract from implementation tasks
    if (sections.implementation) {
        for (const task of sections.implementation) {
            const taskHookMatch = task.match(/hook[:\s]+`?(\w+)`?/i);
            if (taskHookMatch?.[1]) {
                titleTargets.push(taskHookMatch[1]);
            }
        }
    }
    if (titleTargets.length > 0) {
        return [...new Set(titleTargets)].join(', ');
    }
    return 'Target artifacts defined in implementation tasks';
}
function deriveLest(sections) {
    if (sections.problem) {
        // Convert problem statement into failure mode
        const problems = sections.problem.split('\n').filter((l) => l.trim().startsWith('-'));
        if (problems.length > 0) {
            return problems
                .slice(0, 3)
                .map((p) => `Prevent: ${p.replace(/^-\s*/, '')}`)
                .join('; ');
        }
        // Use first line of problem
        const firstLine = sections.problem.split('\n').find((l) => l.trim());
        if (firstLine) {
            return `Prevent: ${firstLine.substring(0, 150)}`;
        }
    }
    return 'Must not introduce regressions; must not break existing functionality';
}
function deriveWith(sections, labels) {
    const deps = [];
    // Add from system labels
    const systemLabels = labels.filter((l) => l.startsWith('system/'));
    for (const label of systemLabels) {
        deps.push(label.replace('system/', ''));
    }
    // Extract tech from solution
    if (sections.solution) {
        if (sections.solution.includes('TypeScript'))
            deps.push('TypeScript');
        if (sections.solution.includes('Vitest'))
            deps.push('Vitest');
        if (sections.solution.includes('hook'))
            deps.push('hooks framework');
        if (sections.solution.includes('CLAUDE.md'))
            deps.push('CLAUDE.md');
    }
    // Add standard deps
    deps.push('bun runtime');
    return [...new Set(deps)].join(', ');
}
function deriveMeasuredBy(sections) {
    if (sections.acceptanceCriteria && sections.acceptanceCriteria.length > 0) {
        return sections.acceptanceCriteria.slice(0, 4).join('; ');
    }
    if (sections.implementation && sections.implementation.length > 0) {
        return sections.implementation
            .slice(0, 3)
            .map((t) => `Complete: ${t}`)
            .join('; ');
    }
    return 'All implementation tasks completed and tested';
}
function enrichFieldsFromSections(fields, sections, issueNumber, title, labels) {
    // Fill in any "unknown" or placeholder fields
    if (fields.who === 'unknown' || fields.who === 'Claude Code session') {
        fields.who = deriveWho(sections, labels, issueNumber);
    }
    if (fields.what === 'unknown' || fields.what === '') {
        fields.what = deriveWhat(sections, title);
    }
    if (fields.when === 'unknown' || fields.when === 'Current task') {
        fields.when = deriveWhen(sections, labels);
    }
    if (fields.where === 'unknown' || fields.where === process.cwd()) {
        fields.where = deriveWhere(sections, issueNumber);
    }
    if (fields.why === 'unknown' || fields.why === 'Task in progress') {
        fields.why = sections.problem ?? `Addresses issue #${issueNumber}`;
    }
    if (fields.how === 'unknown' || fields.how === 'Following implementation plan') {
        fields.how = deriveHow(sections);
    }
    if (fields.which.includes('not specified')) {
        fields.which = deriveWhich(sections, title);
    }
    if (fields.lest.includes('not defined')) {
        fields.lest = deriveLest(sections);
    }
    if (fields.with.includes('not enumerated')) {
        fields.with = deriveWith(sections, labels);
    }
    if (fields.measuredBy.includes('not defined')) {
        fields.measuredBy = deriveMeasuredBy(sections);
    }
    return fields;
}
// ============================================================================
// Goal Derivation Logic
// ============================================================================
/**
 * Create a goal from GitHub issue data.
 * Uses intelligent field extraction from issue structure.
 */
function goalFromGitHubIssue(issueNumber, issue) {
    const fields = issue.body
        ? extractFieldsFromGitHubIssue(issueNumber, issue.title, issue.body, issue.labels)
        : createDefaultFields(issue.title);
    return {
        id: `issue-${issueNumber}`,
        type: 'issue',
        summary: issue.title,
        fields,
        source: { github_issue: issueNumber },
        pushedAt: new Date().toISOString(),
        pushedBy: 'SessionStart',
    };
}
/**
 * Create a goal from OpenSpec proposal.
 */
function goalFromOpenSpec(proposal) {
    const fields = extractFieldsFromDescription(proposal.description);
    // Set defaults for OpenSpec context
    if (fields.who === 'Claude Code session') {
        fields.who = 'Spinal Cord governance system';
    }
    if (fields.where === process.cwd()) {
        fields.where = `OpenSpec: ${proposal.changeId}`;
    }
    return {
        id: `openspec-${proposal.changeId}`,
        type: 'epic',
        summary: proposal.title,
        fields,
        source: { openspec_change: proposal.changeId },
        pushedAt: new Date().toISOString(),
        pushedBy: 'SessionStart',
    };
}
/**
 * Create a goal from active-goal.json global override.
 */
function goalFromActiveGoalFile(activeGoal) {
    return {
        id: 'global-active-goal',
        type: 'epic',
        summary: activeGoal.summary ?? activeGoal.goal ?? 'Unknown goal',
        fields: {
            who: activeGoal.fields?.who ?? 'unknown',
            what: activeGoal.fields?.what ?? 'unknown',
            when: activeGoal.fields?.when ?? 'unknown',
            where: activeGoal.fields?.where ?? 'unknown',
            why: activeGoal.fields?.why ?? 'unknown',
            how: activeGoal.fields?.how ?? 'unknown',
            which: activeGoal.fields?.which ?? 'Target not specified',
            lest: activeGoal.fields?.lest ?? 'Failure modes not defined',
            with: activeGoal.fields?.with ?? 'Dependencies not enumerated',
            measuredBy: activeGoal.fields?.measuredBy ?? 'Metrics not defined',
        },
        source: { manual: true },
        pushedAt: activeGoal.updatedAt ?? new Date().toISOString(),
        pushedBy: 'SessionStart',
    };
}
/**
 * Derive goal from all available context sources.
 * Returns the highest-confidence goal based on priority cascade.
 */
function deriveGoalFromContext(workingDir) {
    // 1. Check git branch for issue reference
    const branchInfo = parseGitBranch(workingDir);
    if (branchInfo?.issueNumber) {
        const issue = fetchGitHubIssue(branchInfo.issueNumber, workingDir);
        if (issue) {
            return {
                source: 'git-branch',
                goal: goalFromGitHubIssue(branchInfo.issueNumber, issue),
                confidence: 'high',
                reason: `Derived from git branch: ${branchInfo.branch} → Issue #${branchInfo.issueNumber}`,
            };
        }
        // Issue number found but couldn't fetch - still use it
        return {
            source: 'git-branch',
            goal: goalFromGitHubIssue(branchInfo.issueNumber, {
                title: `Issue #${branchInfo.issueNumber}`,
                body: '',
                labels: [],
            }),
            confidence: 'medium',
            reason: `Branch references issue #${branchInfo.issueNumber} (could not fetch details)`,
        };
    }
    // 2. Check active-goal.json for linked OpenSpec
    const activeGoal = loadActiveGoalFile();
    if (activeGoal?.linkedArtifacts?.openspec) {
        const proposal = loadOpenSpecProposal(activeGoal.linkedArtifacts.openspec);
        if (proposal && proposal.status !== 'completed' && proposal.status !== 'archived') {
            return {
                source: 'openspec',
                goal: goalFromOpenSpec(proposal),
                confidence: 'high',
                reason: `Linked OpenSpec proposal: ${proposal.changeId}`,
            };
        }
    }
    // 3. Check active-goal.json for linked GitHub issues
    if (activeGoal?.linkedArtifacts?.github_issues?.length) {
        const issueNumber = activeGoal.linkedArtifacts.github_issues[0];
        if (issueNumber) {
            const issue = fetchGitHubIssue(issueNumber, workingDir);
            if (issue) {
                return {
                    source: 'active-goal',
                    goal: goalFromGitHubIssue(issueNumber, issue),
                    confidence: 'high',
                    reason: `Linked GitHub issue from active-goal.json: #${issueNumber}`,
                };
            }
        }
    }
    // 4. Use active-goal.json if it has a defined goal
    if (activeGoal?.goal || activeGoal?.summary) {
        return {
            source: 'active-goal',
            goal: goalFromActiveGoalFile(activeGoal),
            confidence: 'medium',
            reason: 'Using goal from active-goal.json',
        };
    }
    // 5. Check recent commit for intent
    const commitMessage = getRecentCommitIntent(workingDir);
    if (commitMessage && !commitMessage.startsWith('chore(sync)')) {
        // Parse conventional commit
        const conventionalMatch = commitMessage.match(/^(\w+)(?:\([^)]+\))?:\s*(.+)/);
        if (conventionalMatch) {
            const [, type, description] = conventionalMatch;
            return {
                source: 'commit',
                goal: {
                    id: `commit-intent-${Date.now()}`,
                    type: 'task',
                    summary: description ?? commitMessage,
                    fields: {
                        ...createDefaultFields(description ?? commitMessage),
                        how: `Continue ${type} work from last commit`,
                    },
                    source: { manual: false },
                    pushedAt: new Date().toISOString(),
                    pushedBy: 'SessionStart',
                },
                confidence: 'low',
                reason: `Inferred from recent commit: ${commitMessage.substring(0, 50)}...`,
            };
        }
    }
    // 6. No goal derivable
    return {
        source: 'none',
        goal: null,
        confidence: 'low',
        reason: 'No work context found to derive goal from',
    };
}
// ============================================================================
// Stack Hydration
// ============================================================================
/**
 * Hydrate session goal stack from derived context.
 * Only adds goals if stack is empty or working directory changed.
 */
function hydrateGoalStack(sessionId, workingDir, derived) {
    const stack = loadGoalStack(sessionId);
    // Check if stack already has goals
    if (stack.stack.length > 0) {
        const currentFocus = stack.stack[0];
        // Don't override existing goals
        return {
            hydrated: false,
            message: `Existing goal in focus: "${currentFocus?.summary}"`,
        };
    }
    // Check if working directory matches (project-scoped goals)
    if (stack.working_directory && stack.working_directory !== workingDir) {
        // Different project - clear and rehydrate
        log(`[goal-auto-derivation] Project changed: ${stack.working_directory} → ${workingDir}`);
        const newStack = {
            session_id: sessionId,
            working_directory: workingDir,
            stack: [],
            history: stack.history, // Preserve history
            lastModified: new Date().toISOString(),
        };
        saveGoalStack(newStack);
    }
    // Hydrate with derived goal
    if (derived.goal) {
        pushGoal(sessionId, derived.goal);
        return {
            hydrated: true,
            message: `Auto-derived goal (${derived.source}): "${derived.goal.summary}"`,
        };
    }
    return {
        hydrated: false,
        message: derived.reason,
    };
}
// ============================================================================
// Hook Implementations
// ============================================================================
/**
 * SessionStart hook - auto-derive and hydrate goal on session start.
 */
async function goalAutoDerivationSessionStart(input) {
    const sessionId = getSessionId(input);
    const workingDir = input.working_directory ?? process.cwd();
    log(`[goal-auto-derivation] SessionStart: deriving goal for ${workingDir}`);
    // Derive goal from context
    const derived = deriveGoalFromContext(workingDir);
    // Hydrate stack
    const result = hydrateGoalStack(sessionId, workingDir, derived);
    if (result.hydrated) {
        log(`[goal-auto-derivation] ${result.message}`);
        return {
            hookEventName: 'SessionStart',
            additionalContext: `Goal auto-derived from ${derived.source}: "${derived.goal?.summary}"\nConfidence: ${derived.confidence}\nReason: ${derived.reason}`,
        };
    }
    if (derived.source === 'none') {
        return {
            hookEventName: 'SessionStart',
            additionalContext: `No goal auto-derived. ${derived.reason}\nConsider: working on a feature branch, linking an OpenSpec proposal, or defining active-goal.json`,
        };
    }
    return {
        hookEventName: 'SessionStart',
        additionalContext: result.message,
    };
}
/**
 * UserPromptSubmit hook - detect context changes that might affect goal.
 * Only re-derives if explicit signals detected (branch change, new issue reference).
 */
async function goalAutoDerivationPromptSubmit(input) {
    const { prompt } = input;
    const sessionId = getSessionId(input);
    const workingDir = process.cwd();
    // Check for explicit goal change signals in prompt
    const issueRefMatch = prompt.match(/(?:issue|#)(\d+)/i);
    const openspecMatch = prompt.match(/openspec[:\s]+(\S+)/i);
    if (issueRefMatch || openspecMatch) {
        const derived = deriveGoalFromContext(workingDir);
        if (derived.goal) {
            const stack = loadGoalStack(sessionId);
            const currentFocus = stack.stack[0];
            // Only update if different goal
            if (currentFocus?.id !== derived.goal.id) {
                pushGoal(sessionId, derived.goal);
                return {
                    hookEventName: 'UserPromptSubmit',
                    additionalContext: `Goal context updated from prompt reference: "${derived.goal.summary}"`,
                };
            }
        }
    }
    return { hookEventName: 'UserPromptSubmit' };
}
// ============================================================================
// Registration
// ============================================================================
registerHook('goal-auto-derivation-session', 'SessionStart', goalAutoDerivationSessionStart);
registerHook('goal-auto-derivation-prompt', 'UserPromptSubmit', goalAutoDerivationPromptSubmit);
export { goalAutoDerivationSessionStart, goalAutoDerivationPromptSubmit, deriveGoalFromContext, hydrateGoalStack, parseGitBranch, fetchGitHubIssue, loadOpenSpecProposal, };
export default goalAutoDerivationSessionStart;
//# sourceMappingURL=goal_auto_derivation.js.map