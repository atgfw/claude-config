/**
 * GitHub Label Taxonomy Provisioner
 * Reads label-taxonomy.json and idempotently provisions labels via gh CLI.
 */
export interface LabelDefinition {
    name: string;
    color: string;
    description: string;
}
export interface LabelTaxonomy {
    labels: LabelDefinition[];
    remove_defaults: string[];
}
/**
 * Load label taxonomy from github/label-taxonomy.json
 */
export declare function loadTaxonomy(): LabelTaxonomy;
/**
 * Idempotently provision labels from taxonomy.
 * Creates/updates labels and removes default labels listed in remove_defaults.
 */
export declare function provisionLabels(): void;
/**
 * Parse an issue title and return matching label names.
 *
 * Title format: `[system] type(scope): description`
 * - `[hooks]` -> `system/hooks`
 * - `feat(session-start):` -> `type/feat`
 * - Always includes `lifecycle/triage`
 */
export declare function getLabelsForTitle(title: string): string[];
/**
 * Return the source label for a given issue origin.
 */
export declare function getLabelsForSource(source: 'correction-ledger' | 'escalation' | 'openspec' | 'manual'): string;
//# sourceMappingURL=label_taxonomy.d.ts.map