/**
 * Hierarchical Testing Gate Hook
 *
 * Enforces the hierarchical testing governance for workflows:
 * 1. Nodes must be tested before workflow integration
 * 2. Subworkflows must be tested before parent orchestrators
 * 3. Dependencies (SW2-SW10 style) must be tested before dependents (SW0/SW1)
 *
 * BLOCKS workflow operations when:
 * - Building on untested foundations
 * - Modifying healthy entities without re-testing
 * - Creating parent workflows with unhealthy children
 *
 * Part of the Spinal Cord governance system.
 */
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
import { loadRegistry, checkEntityHealth, generateEntityId, } from '../ledger/test_run_registry.js';
/**
 * Extract workflow dependencies from n8n workflow JSON
 */
function extractWorkflowDependencies(workflowJson) {
    const dependencies = [];
    if (!workflowJson || typeof workflowJson !== 'object') {
        return dependencies;
    }
    const workflow = workflowJson;
    const nodes = workflow.nodes;
    if (!Array.isArray(nodes)) {
        return dependencies;
    }
    for (const node of nodes) {
        if (!node || typeof node !== 'object')
            continue;
        const n = node;
        const nodeType = n.type;
        const nodeName = n.name;
        const parameters = n.parameters;
        // Execute Workflow nodes - subworkflow dependencies
        if (nodeType === 'n8n-nodes-base.executeWorkflow' && parameters) {
            const workflowId = parameters.workflowId;
            if (workflowId) {
                dependencies.push({
                    id: workflowId,
                    name: `Subworkflow: ${workflowId}`,
                    type: 'subworkflow',
                    path: workflowId,
                });
            }
        }
        // Code nodes - need local testing first
        if (nodeType === 'n8n-nodes-base.code') {
            const codeNodePath = `code-node:${workflow.id || 'unknown'}:${nodeName}`;
            dependencies.push({
                id: generateEntityId('code-node', codeNodePath),
                name: `Code Node: ${nodeName}`,
                type: 'code-node',
                path: codeNodePath,
            });
        }
        // Function nodes (legacy) - also need testing
        if (nodeType === 'n8n-nodes-base.function') {
            const functionNodePath = `code-node:${workflow.id || 'unknown'}:${nodeName}`;
            dependencies.push({
                id: generateEntityId('code-node', functionNodePath),
                name: `Function Node: ${nodeName}`,
                type: 'code-node',
                path: functionNodePath,
            });
        }
    }
    return dependencies;
}
/**
 * Parse workflow input to extract workflow data
 */
function parseWorkflowInput(input) {
    const toolInput = input.tool_input || {};
    const toolName = input.tool_name || '';
    let operation = 'unknown';
    if (toolName.includes('create'))
        operation = 'create';
    else if (toolName.includes('update'))
        operation = 'update';
    else if (toolName.includes('delete'))
        operation = 'delete';
    return {
        workflowName: toolInput.name,
        workflowJson: toolInput.workflow || toolInput,
        operation,
    };
}
/**
 * Check if all dependencies are healthy
 */
function checkDependenciesHealth(dependencies) {
    const registry = loadRegistry();
    const unhealthyDeps = [];
    const untestedDeps = [];
    for (const dep of dependencies) {
        const entityId = dep.type === 'subworkflow' ? generateEntityId('subworkflow', dep.path) : dep.id;
        const entity = registry.entities[entityId];
        if (!entity) {
            // Entity not in registry - never tested
            untestedDeps.push(dep);
            continue;
        }
        const healthResult = checkEntityHealth(registry, entityId, true);
        if (!healthResult.isHealthy) {
            unhealthyDeps.push({ dep, result: healthResult });
        }
    }
    return {
        unhealthyDeps,
        untestedDeps,
    };
}
/**
 * Check if this workflow is building on untested foundations
 */
function checkHierarchicalTestingCompliance(workflowJson, operation) {
    const violations = [];
    const warnings = [];
    // Extract dependencies
    const dependencies = extractWorkflowDependencies(workflowJson);
    if (dependencies.length === 0) {
        return { compliant: true, violations, warnings, dependencies };
    }
    // Check dependency health
    const { unhealthyDeps, untestedDeps } = checkDependenciesHealth(dependencies);
    // Report untested dependencies
    if (untestedDeps.length > 0) {
        const names = untestedDeps.map((d) => d.name).join(', ');
        if (operation === 'create') {
            warnings.push(`Creating workflow with untested dependencies: ${names}`);
            warnings.push('These dependencies should be tested before integration testing');
        }
        else {
            violations.push(`Cannot update workflow - untested dependencies: ${names}`);
            violations.push('Test dependencies first with 3 novel runs each');
        }
    }
    // Report unhealthy dependencies
    for (const { dep, result } of unhealthyDeps) {
        if (result.status === 'failing') {
            violations.push(`Dependency "${dep.name}" has failing tests - fix before proceeding`);
        }
        else if (result.status === 'stale') {
            violations.push(`Dependency "${dep.name}" code changed - re-test before proceeding`);
        }
        else if (result.status === 'testing') {
            const missing = result.requiredRuns - result.novelRunCount;
            violations.push(`Dependency "${dep.name}" needs ${missing} more novel test runs (${result.novelRunCount}/3)`);
        }
        // Check children health
        if (!result.childrenHealthy) {
            violations.push(`Dependency "${dep.name}" has unhealthy children: ${result.unhealthyChildren.join(', ')}`);
        }
    }
    return {
        compliant: violations.length === 0,
        violations,
        warnings,
        dependencies,
    };
}
/**
 * Hierarchical Testing Gate Hook Implementation
 */
export async function hierarchicalTestingGateHook(input) {
    const toolName = input.tool_name || '';
    // Only process n8n workflow operations
    const isN8nWorkflow = toolName.includes('n8n') &&
        (toolName.includes('create_workflow') || toolName.includes('update_workflow'));
    if (!isN8nWorkflow) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    log('Hierarchical Testing Gate');
    log('=========================');
    log('');
    const { workflowName, workflowJson, operation } = parseWorkflowInput(input);
    log(`Operation: ${operation.toUpperCase()}`);
    log(`Workflow: ${workflowName || 'unnamed'}`);
    log('');
    // Check hierarchical testing compliance
    const compliance = checkHierarchicalTestingCompliance(workflowJson, operation);
    log(`Dependencies found: ${compliance.dependencies.length}`);
    if (compliance.dependencies.length > 0) {
        log('');
        log('Dependencies:');
        for (const dep of compliance.dependencies) {
            log(`  - ${dep.name} (${dep.type})`);
        }
    }
    log('');
    // Show warnings (don't block)
    if (compliance.warnings.length > 0) {
        log('WARNINGS:');
        for (const warning of compliance.warnings) {
            log(`  - ${warning}`);
        }
        log('');
    }
    // Check for violations
    if (!compliance.compliant) {
        logBlocked(`Hierarchical testing violated - ${compliance.violations.length} issues`, 'UNTESTED WORK IS UNSUITABLE TO BUILD UPON');
        log('');
        log('VIOLATIONS:');
        for (const violation of compliance.violations) {
            log(`  - ${violation}`);
        }
        log('');
        log('RESOLUTION:');
        log('  1. Test each dependency with 3 novel input data sets');
        log('  2. Verify all tests pass in test-run-registry');
        log('  3. Re-run this operation after dependencies are healthy');
        log('');
        log('From CLAUDE.md:');
        log('  "UNTESTED WORK IS UNSUITABLE TO BUILD UPON."');
        log('  "Single unhealthy child = Parent cannot be healthy"');
        log('');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: `Hierarchical testing violated: ${compliance.violations[0]}`,
            },
        };
    }
    logAllowed('All dependencies healthy - workflow operation approved');
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
        },
    };
}
// Register the hook
registerHook('hierarchical-testing-gate', 'PreToolUse', hierarchicalTestingGateHook);
export default hierarchicalTestingGateHook;
//# sourceMappingURL=hierarchical_testing_gate.js.map