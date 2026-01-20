#!/usr/bin/env node
/**
 * Hook CLI Entry Point
 *
 * Usage: node dist/cli.js <hook-name>
 *
 * Available hooks:
 *   - pre-bash
 *   - pre-write
 *   - post-code-write
 *   - post-tool-use
 *   - pre-task-complete
 *   - session-start
 */
// Import all hooks to register them
import './index.js';
// Import and run main
import { main } from './runner.js';
main().catch((error) => {
    console.error('Hook execution failed:', error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map