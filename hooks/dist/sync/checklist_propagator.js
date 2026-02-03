/**
 * Checklist Propagator
 *
 * Pushes reconciled checklist changes back to linked artifacts:
 * - GitHub issues via gh CLI
 * - OpenSpec tasks.md files
 * - Plan .md files
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import { getLinkedArtifacts, getRegistryState } from './checklist_reconciler.js';
import { renderToGitHubChecklist, renderToOpenSpecTasks, renderToPlanChecklist, replaceChecklistSection, } from './checklist_parsers.js';
import { logTerse, logWarn } from '../utils.js';
/**
 * Propagate checklist state to a GitHub issue.
 * Updates the issue body with the current checklist state.
 */
export async function propagateToGitHub(issueNumber, items) {
    try {
        // Get current issue body
        const issueJson = execSync(`gh issue view ${issueNumber} --json body`, {
            encoding: 'utf-8',
            timeout: 15_000,
        });
        const { body } = JSON.parse(issueJson);
        // Replace checklist section
        const newChecklist = renderToGitHubChecklist(items);
        const newBody = replaceChecklistSection(body, newChecklist);
        // Update issue
        execSync(`gh issue edit ${issueNumber} --body-file -`, {
            input: newBody,
            encoding: 'utf-8',
            timeout: 15_000,
        });
        logTerse(`[+] Propagated to GitHub #${issueNumber}`);
        return true;
    }
    catch (error) {
        logWarn(`Failed to propagate to GitHub #${issueNumber}: ${error}`);
        return false;
    }
}
/**
 * Propagate checklist state to a file (OpenSpec or plan).
 */
export async function propagateToFile(filePath, items, artifactType) {
    try {
        if (!fs.existsSync(filePath)) {
            logWarn(`File not found for propagation: ${filePath}`);
            return false;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        // Render checklist based on type
        const newChecklist = artifactType === 'openspec' ? renderToOpenSpecTasks(items) : renderToPlanChecklist(items);
        // Replace checklist section
        const newContent = replaceChecklistSection(content, newChecklist);
        // Write back
        fs.writeFileSync(filePath, newContent, 'utf-8');
        logTerse(`[+] Propagated to ${artifactType}: ${filePath}`);
        return true;
    }
    catch (error) {
        logWarn(`Failed to propagate to file ${filePath}: ${error}`);
        return false;
    }
}
/**
 * Propagate checklist changes to all linked artifacts.
 * Returns list of artifact types that were successfully updated.
 */
export async function propagateToLinkedArtifacts(sourceType, sourceId) {
    const items = getRegistryState(sourceType, sourceId);
    if (!items || items.length === 0) {
        return [];
    }
    const links = getLinkedArtifacts(sourceType, sourceId);
    const propagated = [];
    // Propagate to GitHub if linked and not the source
    if (links.github_issue && sourceType !== 'github_issue') {
        const issueNum = Number.parseInt(links.github_issue, 10);
        if (await propagateToGitHub(issueNum, items)) {
            propagated.push(`github#${issueNum}`);
        }
    }
    // Propagate to OpenSpec if linked and not the source
    if (links.openspec && sourceType !== 'openspec') {
        // Construct path from change ID
        const tasksPath = `openspec/changes/${links.openspec}/tasks.md`;
        if (await propagateToFile(tasksPath, items, 'openspec')) {
            propagated.push(`openspec:${links.openspec}`);
        }
    }
    // Propagate to plan file if linked and not the source
    if (links.plan && sourceType !== 'plan') {
        if (await propagateToFile(links.plan, items, 'plan')) {
            propagated.push(`plan:${links.plan}`);
        }
    }
    return propagated;
}
//# sourceMappingURL=checklist_propagator.js.map