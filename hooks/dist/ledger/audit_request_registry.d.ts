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
export type AuditType = 'enforcer' | 'plan-review' | 'code-review' | 'security' | 'testing';
export type AuditStatus = 'pending' | 'in-review' | 'approved' | 'corrections' | 'rejected' | 'expired';
export interface AuditRequest {
    id: string;
    requestedAt: string;
    requestedBy: string;
    projectPath: string;
    artifactPath: string;
    auditType: AuditType;
    description: string;
    status: AuditStatus;
    reviewedAt?: string;
    reviewedBy?: string;
    findings?: AuditFinding[];
    verdict?: 'approved' | 'corrections' | 'rejected';
    verdictReason?: string;
    expiresAt: string;
}
export interface AuditFinding {
    severity: 'error' | 'warning' | 'info';
    category: string;
    message: string;
    file?: string;
    line?: number;
    recommendation?: string;
}
export interface AuditRegistry {
    requests: Record<string, AuditRequest>;
    lastUpdated: string;
    config: {
        expiryHours: number;
        maxPendingRequests: number;
    };
}
/**
 * Load audit registry
 */
export declare function loadAuditRegistry(): AuditRegistry;
/**
 * Save audit registry
 */
export declare function saveAuditRegistry(registry: AuditRegistry): void;
/**
 * Request an audit from parent/global session
 */
export declare function requestAudit(params: {
    projectPath: string;
    artifactPath: string;
    auditType: AuditType;
    description: string;
    requestedBy?: string;
}): AuditRequest;
/**
 * Get pending audit requests (for parent to review)
 */
export declare function getPendingAudits(): AuditRequest[];
/**
 * Get audit request by ID
 */
export declare function getAuditRequest(id: string): AuditRequest | null;
/**
 * Submit audit review (parent responding to child request)
 */
export declare function submitAuditReview(requestId: string, review: {
    verdict: 'approved' | 'corrections' | 'rejected';
    verdictReason: string;
    findings?: AuditFinding[];
    reviewedBy?: string;
}): AuditRequest | null;
/**
 * Check if child's audit was approved
 */
export declare function checkAuditStatus(artifactPath: string): {
    hasRequest: boolean;
    status: AuditStatus | null;
    verdict: string | null;
    findings: AuditFinding[];
};
/**
 * Format audit request for display
 */
export declare function formatAuditRequest(request: AuditRequest): string;
/**
 * List all audits for a project
 */
export declare function getProjectAudits(projectPath: string): AuditRequest[];
//# sourceMappingURL=audit_request_registry.d.ts.map