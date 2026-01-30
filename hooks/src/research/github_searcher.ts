/**
 * GitHub Repository Searcher
 *
 * Provides automated discovery of existing tools via GitHub search.
 * Uses the gh CLI for authenticated API access.
 */

import { execSync } from 'node:child_process';
import { log } from '../utils.js';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// CLI Detection
// ============================================================================

/**
 * Check if gh CLI is available and authenticated
 */
export function isGhCliAvailable(): boolean {
  try {
    execSync('gh auth status', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search GitHub repositories for a given query
 * Returns top results sorted by stars
 */
export async function searchGitHubRepos(query: string, limit = 10): Promise<GitHubSearchResult> {
  if (!isGhCliAvailable()) {
    return {
      success: false,
      repos: [],
      query,
      error: 'gh CLI not available or not authenticated',
    };
  }

  try {
    // Use gh search repos with JSON output
    const cmd = `gh search repos "${query}" --sort stars --limit ${limit} --json name,fullName,url,description,stargazersCount,forksCount,primaryLanguage,updatedAt,licenseInfo,isArchived`;

    log(`[GH-SEARCH] Executing: ${cmd}`);

    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    const rawRepos = JSON.parse(output) as Array<{
      name: string;
      fullName: string;
      url: string;
      description: string | undefined;
      stargazersCount: number;
      forksCount: number;
      primaryLanguage: { name: string } | undefined;
      updatedAt: string;
      licenseInfo: { key: string } | undefined;
      isArchived: boolean;
    }>;

    const repos: GitHubRepo[] = rawRepos.map((r) => ({
      name: r.name,
      fullName: r.fullName,
      url: r.url,
      description: r.description,
      stars: r.stargazersCount,
      forks: r.forksCount,
      language: r.primaryLanguage?.name,
      updatedAt: r.updatedAt,
      license: r.licenseInfo?.key,
      archived: r.isArchived,
    }));

    log(`[GH-SEARCH] Found ${repos.length} repositories`);

    return {
      success: true,
      repos,
      query,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`[GH-SEARCH] Error: ${errorMessage}`);

    return {
      success: false,
      repos: [],
      query,
      error: errorMessage,
    };
  }
}

/**
 * Search for automation/wrapper tools in a specific domain
 * Searches multiple terms in parallel and deduplicates results
 */
export async function searchAutomationTools(domain: string): Promise<GitHubSearchResult> {
  // Build search queries that target automation tools
  const searchTerms = [
    `${domain} automation`,
    `${domain} sdk`,
    `${domain} client`,
    `${domain} api wrapper`,
  ];

  // Search all terms in parallel
  const results = await Promise.all(searchTerms.map(async (term) => searchGitHubRepos(term, 5)));

  // Deduplicate results by fullName
  const allRepos = new Map<string, GitHubRepo>();

  for (const result of results) {
    if (result.success) {
      for (const repo of result.repos) {
        if (!allRepos.has(repo.fullName)) {
          allRepos.set(repo.fullName, repo);
        }
      }
    }
  }

  // Sort by stars and take top 10
  const repos = [...allRepos.values()].sort((a, b) => b.stars - a.stars).slice(0, 10);

  return {
    success: true,
    repos,
    query: domain,
  };
}

/**
 * Get repos with more than a specified star threshold
 */
export function getHighStarRepos(repos: GitHubRepo[], threshold = 5000): GitHubRepo[] {
  return repos.filter((r) => r.stars >= threshold);
}

/**
 * Format search results for display in research document
 */
export function formatSearchResults(result: GitHubSearchResult): string {
  if (!result.success) {
    return `GitHub search failed: ${result.error}\n`;
  }

  if (result.repos.length === 0) {
    return `No repositories found for: ${result.query}\n`;
  }

  const lines: string[] = [`GitHub search results for: ${result.query}`, ''];

  for (const repo of result.repos) {
    lines.push(
      `### ${repo.name}`,
      `- **URL:** ${repo.url}`,
      `- **Stars:** ${repo.stars.toLocaleString()}`,
      `- **Forks:** ${repo.forks.toLocaleString()}`,
      `- **Language:** ${repo.language ?? 'Unknown'}`,
      `- **Last Updated:** ${repo.updatedAt.split('T')[0]}`,
      `- **License:** ${repo.license ?? 'Not specified'}`,
      `- **Archived:** ${repo.archived ? 'Yes' : 'No'}`
    );
    if (repo.description) {
      lines.push(`- **Description:** ${repo.description}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}
