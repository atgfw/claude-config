/**
 * GitHub Repository Searcher
 *
 * Provides automated discovery of existing tools via GitHub search.
 * Uses the gh CLI for authenticated API access.
 */
export type GitHubRepo = {
    name: string;
    fullName: string;
    url: string;
    description: string | undefined;
    stars: number;
    forks: number;
    language: string | undefined;
    updatedAt: string;
    license: string | undefined;
    archived: boolean;
};
export type GitHubSearchResult = {
    success: boolean;
    repos: GitHubRepo[];
    query: string;
    error?: string;
};
/**
 * Check if gh CLI is available and authenticated
 */
export declare function isGhCliAvailable(): boolean;
/**
 * Search GitHub repositories for a given query
 * Returns top results sorted by stars
 */
export declare function searchGitHubRepos(query: string, limit?: number): Promise<GitHubSearchResult>;
/**
 * Search for automation/wrapper tools in a specific domain
 * Searches multiple terms in parallel and deduplicates results
 */
export declare function searchAutomationTools(domain: string): Promise<GitHubSearchResult>;
/**
 * Get repos with more than a specified star threshold
 */
export declare function getHighStarRepos(repos: GitHubRepo[], threshold?: number): GitHubRepo[];
/**
 * Format search results for display in research document
 */
export declare function formatSearchResults(result: GitHubSearchResult): string;
//# sourceMappingURL=github_searcher.d.ts.map