/**
 * NPM Package Searcher
 *
 * Provides automated discovery of existing tools via npm search.
 * Uses the npm CLI for package discovery.
 */
export type NpmPackage = {
    name: string;
    version: string;
    description: string | undefined;
    keywords: string[];
    date: string | undefined;
    links: {
        npm: string;
        homepage: string | undefined;
        repository: string | undefined;
    };
    author: string | undefined;
    maintainers: string[];
};
export type NpmSearchResult = {
    success: boolean;
    packages: NpmPackage[];
    query: string;
    error?: string;
};
/**
 * Check if npm CLI is available
 */
export declare function isNpmCliAvailable(): boolean;
/**
 * Search npm packages for a given query
 * Returns results with metadata
 */
export declare function searchNpmPackages(query: string, limit?: number): Promise<NpmSearchResult>;
/**
 * Search for automation/wrapper packages in a specific domain
 * Searches multiple terms in parallel and deduplicates results
 */
export declare function searchAutomationPackages(domain: string): Promise<NpmSearchResult>;
/**
 * Format search results for display in research document
 */
export declare function formatSearchResults(result: NpmSearchResult): string;
//# sourceMappingURL=npm_searcher.d.ts.map