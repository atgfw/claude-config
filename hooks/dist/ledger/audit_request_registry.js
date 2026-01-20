/**
 * Audit Request Registry
 *
 * Enables cross-session audit requests:
 * - Child sessions can request 3rd party audits
 * - Parent/global session can read and respond to audit requests
 * - Tracks audit status and results
 *
 * Location: ~/.claude/ledger/audit-requests.json
 *
 * Part of the Spinal Cord governance system.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
const REGISTRY_PATH = path.join(os.homedir(), '.claude', 'ledger', 'audit-requests.json');
/**
 * Load audit registry
 */
export function loadAuditRegistry() {
    try {
        if (fs.existsSync(REGISTRY_PATH)) {
            const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
            return JSON.parse(content);
        }
    }
    catch {
        // Fall through
    }
    return {
        requests: {},
        lastUpdated: new Date().toISOString(),
        config: {
            expiryHours: 24,
            maxPendingRequests: 10,
        },
    };
}
/**
 * Save audit registry
 */
export function saveAuditRegistry(registry) {
    registry.lastUpdated = new Date().toISOString();
    const dir = path.dirname(REGISTRY_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}
/**
 * Generate request ID
 */
function generateRequestId() {
    return crypto.randomBytes(8).toString('hex');
}
/**
 * Request an audit from parent/global session
 */
export function requestAudit(params) {
    const registry = loadAuditRegistry();
    // Clean up expired requests
    cleanupExpiredRequests(registry);
    const id = generateRequestId();
    const now = new Date();
    const expiry = new Date(now.getTime() + registry.config.expiryHours * 60 * 60 * 1000);
    const request = {
        id,
        requestedAt: now.toISOString(),
        requestedBy: params.requestedBy || 'child',
        projectPath: params.projectPath,
        artifactPath: params.artifactPath,
        auditType: params.auditType,
        description: params.description,
        status: 'pending',
        expiresAt: expiry.toISOString(),
    };
    registry.requests[id] = request;
    saveAuditRegistry(registry);
    return request;
}
/**
 * Get pending audit requests (for parent to review)
 */
export function getPendingAudits() {
    const registry = loadAuditRegistry();
    cleanupExpiredRequests(registry);
    return Object.values(registry.requests)
        .filter((r) => r.status === 'pending')
        .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
}
/**
 * Get audit request by ID
 */
export function getAuditRequest(id) {
    const registry = loadAuditRegistry();
    return registry.requests[id] || null;
}
/**
 * Submit audit review (parent responding to child request)
 */
export function submitAuditReview(requestId, review) {
    const registry = loadAuditRegistry();
    const request = registry.requests[requestId];
    if (!request)
        return null;
    request.status =
        review.verdict === 'approved'
            ? 'approved'
            : review.verdict === 'corrections'
                ? 'corrections'
                : 'rejected';
    request.verdict = review.verdict;
    request.verdictReason = review.verdictReason;
    request.findings = review.findings || [];
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = review.reviewedBy || 'parent';
    saveAuditRegistry(registry);
    return request;
}
/**
 * Check if child's audit was approved
 */
export function checkAuditStatus(artifactPath) {
    const registry = loadAuditRegistry();
    // Find most recent request for this artifact
    const requests = Object.values(registry.requests)
        .filter((r) => r.artifactPath === artifactPath)
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    if (requests.length === 0) {
        return {
            hasRequest: false,
            status: null,
            verdict: null,
            findings: [],
        };
    }
    const latest = requests[0];
    return {
        hasRequest: true,
        status: latest.status,
        verdict: latest.verdict || null,
        findings: latest.findings || [],
    };
}
/**
 * Cleanup expired requests
 */
function cleanupExpiredRequests(registry) {
    const now = new Date();
    for (const [_id, request] of Object.entries(registry.requests)) {
        if (request.status === 'pending' && new Date(request.expiresAt) < now) {
            request.status = 'expired';
        }
    }
}
/**
 * Format audit request for display
 */
export function formatAuditRequest(request) {
    const lines = [];
    lines.push(`Audit Request: ${request.id}`);
    lines.push(`Type: ${request.auditType.toUpperCase()}`);
    lines.push(`Status: ${request.status.toUpperCase()}`);
    lines.push(`Project: ${request.projectPath}`);
    lines.push(`Artifact: ${request.artifactPath}`);
    lines.push(`Requested: ${request.requestedAt}`);
    lines.push('');
    lines.push(`Description: ${request.description}`);
    if (request.verdict) {
        lines.push('');
        lines.push(`VERDICT: ${request.verdict.toUpperCase()}`);
        lines.push(`Reason: ${request.verdictReason}`);
        if (request.findings && request.findings.length > 0) {
            lines.push('');
            lines.push('Findings:');
            for (const finding of request.findings) {
                lines.push(`  [${finding.severity.toUpperCase()}] ${finding.category}: ${finding.message}`);
                if (finding.recommendation) {
                    lines.push(`    Recommendation: ${finding.recommendation}`);
                }
            }
        }
    }
    return lines.join('\n');
}
/**
 * List all audits for a project
 */
export function getProjectAudits(projectPath) {
    const registry = loadAuditRegistry();
    return Object.values(registry.requests)
        .filter((r) => r.projectPath === projectPath)
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
}
//# sourceMappingURL=audit_request_registry.js.map