/**
 * NPM Package Searcher
 *
 * Provides automated discovery of existing tools via npm search.
 * Uses the npm CLI for package discovery.
 */

import { execSync } from 'node:child_process';
import { log } from '../utils.js';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// CLI Detection
// ============================================================================

/**
 * Check if npm CLI is available
 */
export function isNpmCliAvailable(): boolean {
  try {
    execSync('npm --version', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search npm packages for a given query
 * Returns results with metadata
 */
export async function searchNpmPackages(query: string, limit = 10): Promise<NpmSearchResult> {
  if (!isNpmCliAvailable()) {
    return {
      success: false,
      packages: [],
      query,
      error: 'npm CLI not available',
    };
  }

  try {
    // Use npm search with JSON output
    const cmd = `npm search "${query}" --json --long`;

    log(`[NPM-SEARCH] Executing: ${cmd}`);

    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe', timeout: 30_000 });
    const rawPackages = JSON.parse(output) as Array<{
      name: string;
      version: string;
      description?: string;
      keywords?: string[];
      date?: string;
      links?: {
        npm?: string;
        homepage?: string;
        repository?: string;
      };
      author?: { name?: string; email?: string } | string;
      maintainers?: Array<{ username: string; email?: string }>;
    }>;

    const packages: NpmPackage[] = rawPackages.slice(0, limit).map((p) => ({
      name: p.name,
      version: p.version,
      description: p.description,
      keywords: p.keywords ?? [],
      date: p.date,
      links: {
        npm: p.links?.npm ?? `https://www.npmjs.com/package/${p.name}`,
        homepage: p.links?.homepage,
        repository: p.links?.repository,
      },
      author: typeof p.author === 'string' ? p.author : p.author?.name,
      maintainers: p.maintainers?.map((m) => m.username) ?? [],
    }));

    log(`[NPM-SEARCH] Found ${packages.length} packages`);

    return {
      success: true,
      packages,
      query,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`[NPM-SEARCH] Error: ${errorMessage}`);

    return {
      success: false,
      packages: [],
      query,
      error: errorMessage,
    };
  }
}

/**
 * Search for automation/wrapper packages in a specific domain
 * Searches multiple terms in parallel and deduplicates results
 */
export async function searchAutomationPackages(domain: string): Promise<NpmSearchResult> {
  // Build search queries that target automation tools
  const searchTerms = [`${domain}-sdk`, `${domain}-client`, `${domain}-api`, `${domain}`];

  // Search all terms in parallel
  const results = await Promise.all(searchTerms.map(async (term) => searchNpmPackages(term, 5)));

  // Deduplicate results by name
  const allPackages = new Map<string, NpmPackage>();

  for (const result of results) {
    if (result.success) {
      for (const pkg of result.packages) {
        if (!allPackages.has(pkg.name)) {
          allPackages.set(pkg.name, pkg);
        }
      }
    }
  }

  // Take top 10 (already sorted by npm relevance)
  const packages = [...allPackages.values()].slice(0, 10);

  return {
    success: true,
    packages,
    query: domain,
  };
}

/**
 * Format search results for display in research document
 */
export function formatSearchResults(result: NpmSearchResult): string {
  if (!result.success) {
    return `npm search failed: ${result.error}\n`;
  }

  if (result.packages.length === 0) {
    return `No packages found for: ${result.query}\n`;
  }

  const lines: string[] = [`npm search results for: ${result.query}`, ''];

  for (const pkg of result.packages) {
    lines.push(
      `### ${pkg.name}`,
      `- **Version:** ${pkg.version}`,
      `- **npm URL:** ${pkg.links.npm}`
    );
    if (pkg.links.repository) {
      lines.push(`- **Repository:** ${pkg.links.repository}`);
    }

    if (pkg.date) {
      lines.push(`- **Last Published:** ${pkg.date.split('T')[0]}`);
    }

    if (pkg.author) {
      lines.push(`- **Author:** ${pkg.author}`);
    }

    if (pkg.description) {
      lines.push(`- **Description:** ${pkg.description}`);
    }

    if (pkg.keywords.length > 0) {
      lines.push(`- **Keywords:** ${pkg.keywords.join(', ')}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}
