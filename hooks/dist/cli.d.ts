#!/usr/bin/env node
/**
 * Hook CLI Entry Point
 *
 * Usage: node dist/cli.js <hook-name>
 *
 * IMPORTANT: This CLI is designed to ALWAYS output valid JSON to stdout,
 * even on errors. This ensures hook errors surface to Claude's context
 * via additionalContext rather than being silently swallowed.
 */
import './index.js';
//# sourceMappingURL=cli.d.ts.map