/**
 * Task Specification Schema v1.0
 *
 * Structured context injection template for LLM-assisted task execution.
 * Enforces 11-section specification: Focus, Who, What, When, Where, Why, How, Which, Lest, With, MeasuredBy
 */
export declare const SCHEMA_VERSION = "1.0";
export interface ContextMetadata {
    schema_version: string;
    injection_timestamp: string;
    conversation_turn?: number;
    context_token_budget?: number;
}
export type TaskType = 'feature' | 'bugfix' | 'refactor' | 'documentation' | 'investigation' | 'integration' | 'deployment';
export type Complexity = 'trivial' | 'low' | 'medium' | 'high' | 'critical';
export interface TaskClassification {
    type: TaskType;
    complexity: Complexity;
    estimated_effort?: string;
    blocking?: string[];
    blocked_by?: string[];
}
export interface FocusDeclaration {
    issue_number?: number;
    title: string;
    classification: TaskClassification;
}
export type StakeholderRole = 'executor' | 'requester' | 'audience' | 'reviewer' | 'parent_task' | 'dependent_agents';
export type NotificationTrigger = 'on_start' | 'on_complete' | 'on_blocked' | 'on_decision_needed' | 'on_deploy' | 'on_pr_ready' | 'on_scope_change' | 'on_interface_change';
export interface Stakeholder {
    role: StakeholderRole;
    entity: string;
    responsibility: string;
    notifications: NotificationTrigger[];
}
export interface WhoSection {
    stakeholders: Stakeholder[];
    escalation_path: string;
}
export interface AcceptanceCriterion {
    given: string;
    when: string;
    then: string;
    and?: string[];
}
export interface DefinitionOfDoneItem {
    description: string;
    completed: boolean;
}
export interface WhatSection {
    desired_state: string;
    acceptance_criteria: AcceptanceCriterion[];
    out_of_scope: string[];
    definition_of_done: DefinitionOfDoneItem[];
}
export interface Precondition {
    condition: string;
    verified_by: string;
    reference?: string;
}
export type ActivationType = 'manual' | 'scheduled' | 'event_driven' | 'dependency_complete';
export interface ActivationTrigger {
    type: ActivationType;
    specification: string;
}
export type TimeSensitivity = 'fixed_deadline' | 'soft_target' | 'best_effort';
export interface TimeConstraints {
    deadline?: string;
    time_sensitivity: TimeSensitivity;
    calendar_context?: string;
    estimated_completion?: string;
}
export interface SequenceStep {
    step_number: number;
    description: string;
    status: 'complete' | 'current' | 'pending';
    blocked_by_this?: boolean;
}
export interface WhenSection {
    preconditions: Precondition[];
    activation_trigger: ActivationTrigger;
    sequence: SequenceStep[];
    time_constraints: TimeConstraints;
}
export type ArtifactType = 'source_code' | 'configuration' | 'api_endpoint' | 'documentation' | 'database' | 'build_artifact' | 'deployment';
export type ModificationType = 'create' | 'modify' | 'delete' | 'read';
export interface SourceArtifact {
    artifact_type: ArtifactType;
    verbatim_name: string;
    full_path: string;
    access_method: string;
}
export interface DestinationArtifact {
    artifact_type: ArtifactType;
    verbatim_name: string;
    target_path: string;
    write_method: string;
}
export interface RelatedTaskLocation {
    platform: string;
    identifier: string;
    url: string;
}
export interface WhereSection {
    source_artifacts: SourceArtifact[];
    destination_artifacts: DestinationArtifact[];
    parent_issue?: RelatedTaskLocation;
    child_issues?: RelatedTaskLocation[];
    linked_prs?: RelatedTaskLocation[];
    external_trackers?: RelatedTaskLocation[];
}
export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low';
export interface RiskIfNotCompleted {
    impact_level: ImpactLevel;
    affected_parties: string[];
    consequence: string;
    mitigation_if_delayed?: string;
}
export interface WhySection {
    purpose: string;
    strategic_objective?: string;
    project_milestone?: string;
    epic_reference?: string;
    user_story?: string;
    risk_if_not_completed: RiskIfNotCompleted;
}
export interface ResourceReference {
    resource_type: string;
    title: string;
    location: string;
    relevance: string;
}
export interface HowSection {
    plan_document?: string;
    plan_section?: string;
    plan_revision?: string;
    approach_summary: string;
    resource_references: ResourceReference[];
}
export type TargetObjectType = 'file' | 'function' | 'class' | 'endpoint' | 'workflow' | 'config' | 'schema' | 'table';
export interface TargetObject {
    object_title: string;
    object_type: TargetObjectType;
    full_path: string;
    current_state: string;
    target_state: string;
}
export interface SecondaryObject {
    name: string;
    type: TargetObjectType;
    path: string;
    modification_type: ModificationType;
}
export interface WhichSection {
    primary_target: TargetObject;
    secondary_objects?: SecondaryObject[];
}
export type Probability = 'high' | 'medium' | 'low';
export interface CriticalFailure {
    failure: string;
    probability: Probability;
    impact: ImpactLevel;
    prevention: string;
    detection: string;
    recovery?: string;
}
export interface NegativeAcceptanceCriterion {
    given: string;
    when: string;
    must_not: string;
    lest: string;
}
export interface AssumptionRisk {
    assumption: string;
    if_wrong: string;
    validation_method: string;
    fallback?: string;
}
export interface RegressionGuardrail {
    behavior: string;
    test_coverage: string;
    owner: string;
}
export type ComplianceStandard = 'HIPAA' | 'SOC2' | 'PCI-DSS' | 'GDPR' | 'TCPA' | 'internal_policy';
export interface SecurityConstraint {
    constraint: string;
    standard: ComplianceStandard;
    verification: string;
}
export interface ForbiddenPattern {
    pattern: string;
    reason: string;
    alternative: string;
}
export interface LestSection {
    critical_failures: CriticalFailure[];
    negative_criteria: NegativeAcceptanceCriterion[];
    assumption_risks?: AssumptionRisk[];
    regression_guardrails?: RegressionGuardrail[];
    security_constraints?: SecurityConstraint[];
    forbidden_patterns?: ForbiddenPattern[];
}
export interface RequiredTool {
    tool_name: string;
    version: string;
    purpose: string;
    access_method: string;
}
export type AccessType = 'read' | 'write' | 'admin' | 'deploy';
export interface RequiredAccess {
    resource: string;
    access_type: AccessType;
    credential_location: string;
    provisioning?: string;
    expiration?: string;
}
export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';
export interface EnvironmentConfig {
    name: string;
    url: string;
    access: string;
    data_type?: string;
    deployment_method?: string;
    approval_required?: boolean;
    deployment_window?: string;
    rollback_procedure?: string;
}
export interface ExternalDependency {
    service: string;
    provider: string;
    endpoint: string;
    auth_method: string;
    rate_limits?: string;
    sla?: string;
    fallback: string;
    documentation?: string;
}
export type HumanDependencyType = 'approval' | 'information' | 'review' | 'access_grant' | 'decision';
export interface HumanDependency {
    person_or_team: string;
    dependency_type: HumanDependencyType;
    needed_by: string;
    request_channel: string;
    escalation_if_unresponsive: string;
}
export interface RequiredData {
    dataset: string;
    location: string;
    format: string;
    freshness?: string;
    volume?: string;
    sensitivity: DataSensitivity;
}
export interface WithSection {
    tools: RequiredTool[];
    access_requirements?: RequiredAccess[];
    environments?: EnvironmentConfig[];
    external_dependencies?: ExternalDependency[];
    human_dependencies?: HumanDependency[];
    required_data?: RequiredData[];
}
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'boolean' | 'qualitative';
export interface SuccessMetric {
    metric: string;
    type: MetricType;
    target_value: string;
    current_value?: string;
    measurement_method: string;
    measurement_location: string;
    measurement_frequency?: string;
}
export interface QuantitativeKPI {
    kpi: string;
    baseline: string;
    target: string;
    threshold: string;
    measurement_source: string;
}
export interface QualitativeMeasure {
    indicator: string;
    assessment_method: string;
    assessor: string;
    criteria: string;
    evidence?: string;
}
export type MilestoneStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked';
export interface ProgressMilestone {
    milestone: string;
    target_date?: string;
    completion_signal: string;
    current_status: MilestoneStatus;
    percent_complete?: number;
}
export interface ValidationCheck {
    check: string;
    method: string;
    owner: string;
}
export interface MonitoringWindow {
    metric: string;
    duration: string;
    success_criteria: string;
    escalation_if_anomaly: string;
}
export interface PostCompletionValidation {
    immediate_checks: ValidationCheck[];
    short_term_monitoring?: MonitoringWindow[];
    long_term_success?: Array<{
        outcome: string;
        measurement_window: string;
        review_date: string;
    }>;
}
export interface MeasuredBySection {
    success_metrics: SuccessMetric[];
    quantitative_kpis?: QuantitativeKPI[];
    qualitative_measures?: QualitativeMeasure[];
    progress_milestones?: ProgressMilestone[];
    post_completion_validation?: PostCompletionValidation;
}
export interface TaskSpecification {
    metadata: ContextMetadata;
    focus: FocusDeclaration;
    who: WhoSection;
    what: WhatSection;
    when: WhenSection;
    where: WhereSection;
    why: WhySection;
    how: HowSection;
    which: WhichSection;
    lest: LestSection;
    with: WithSection;
    measured_by: MeasuredBySection;
}
export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'in_review' | 'complete';
export interface TaskState {
    status: TaskStatus;
    progress_percentage: number;
    last_action?: string;
    next_action?: string;
    blockers?: string[];
    decisions_needed?: string[];
}
export interface ContextAnchors {
    previous_turn_outcome?: string;
    accumulated_artifacts?: string[];
    open_questions?: string[];
    assumptions_made?: string[];
}
export interface MinimalTaskSpec {
    focus: {
        issue_number?: number;
        title: string;
    };
    target: {
        type: TargetObjectType;
        path: string;
    };
    executor: string;
    audience: string;
    status: TaskStatus;
    next_action: string;
    desired_state: string;
    acceptance: string[];
    lest: string[];
    with: {
        tools?: string;
        access?: string;
        services?: string;
    };
    measured_by: {
        primary_metric: string;
        target: string;
    };
    paths: {
        in: string;
        out: string;
        plan?: string;
    };
    constraints: {
        when?: string;
        deadline?: string;
        blocked_by?: string[];
    };
}
//# sourceMappingURL=task_specification.d.ts.map