/**
 * Scrapling Runner
 * Node.js interface to execute Scrapling page actions via the Python executor.
 * Used by hook automations for browser interactions.
 */
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateActions, } from './scrapling_actions.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// #endregion
// #region Constants
const PYTHON_EXECUTABLE = process.platform === 'win32'
    ? 'C:\\Users\\codya\\AppData\\Local\\Programs\\Python\\Python311\\python.exe'
    : 'python3';
const EXECUTOR_PATH = path.join(__dirname, 'scrapling_executor.py');
const DEFAULT_OUTPUT_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.claude', 'scrapling-output');
const DEFAULT_TIMEOUT = 120_000;
// #endregion
// #region Runner
/**
 * Execute Scrapling session with page actions
 */
export async function runScrapling(config) {
    const validation = validateActions(config.actions);
    if (!validation.valid) {
        throw new Error(`Invalid actions: ${JSON.stringify(validation.errors)}`);
    }
    const outputDir = config.outputDir || DEFAULT_OUTPUT_DIR;
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const executorConfig = {
        url: config.url,
        actions: config.actions,
        method: config.method || 'stealthy-fetch',
        headless: config.headless !== false,
        timeout: config.timeout || 45_000,
        solveCloudflare: config.solveCloudflare || false,
        realChrome: config.realChrome || false,
        networkIdle: config.networkIdle !== false,
        outputDir,
        userDataDir: config.userDataDir,
    };
    const configJson = JSON.stringify(executorConfig);
    return new Promise((resolve, reject) => {
        const child = spawn(PYTHON_EXECUTABLE, [EXECUTOR_PATH, '--stdin'], {
            windowsHide: true,
        });
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        const timeout = setTimeout(() => {
            timedOut = true;
            child.kill('SIGTERM');
        }, DEFAULT_TIMEOUT);
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        child.on('close', (code) => {
            clearTimeout(timeout);
            if (timedOut) {
                reject(new Error('Scrapling executor timed out'));
                return;
            }
            if (code !== 0 && stderr && !stdout) {
                try {
                    const errorData = JSON.parse(stderr);
                    reject(new Error(errorData.error || stderr));
                }
                catch {
                    reject(new Error(stderr || `Process exited with code ${code}`));
                }
                return;
            }
            try {
                resolve(JSON.parse(stdout));
            }
            catch {
                reject(new Error(`Failed to parse output: ${stdout}`));
            }
        });
        child.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        // Write config to stdin and close it
        child.stdin.write(configJson);
        child.stdin.end();
    });
}
/**
 * Quick fetch with default settings
 */
export async function quickFetch(url, actions = [{ action: 'screenshot', filename: 'page.png' }]) {
    return runScrapling({
        url,
        actions,
        method: 'stealthy-fetch',
        headless: true,
        networkIdle: true,
    });
}
/**
 * Explore a page - get screenshots and list elements
 */
export async function explorePage(url) {
    return runScrapling({
        url,
        actions: [
            { action: 'screenshot', filename: 'explore-initial.png' },
            { action: 'get_title' },
            { action: 'get_url' },
            { action: 'list_elements', selector: 'button' },
            { action: 'list_elements', selector: 'a' },
            { action: 'list_elements', selector: 'input' },
            { action: 'list_elements', selector: 'form' },
        ],
        method: 'stealthy-fetch',
        headless: true,
        networkIdle: true,
    });
}
/**
 * Fill and submit a form
 */
export async function fillForm(url, fields, submitSelector) {
    const actions = [{ action: 'screenshot', filename: 'form-before.png' }];
    for (const field of fields) {
        actions.push({ action: 'fill', selector: field.selector, value: field.value });
    }
    actions.push({ action: 'screenshot', filename: 'form-filled.png' });
    if (submitSelector) {
        actions.push({ action: 'click', selector: submitSelector }, { action: 'wait', value: '2000' }, { action: 'screenshot', filename: 'form-submitted.png' });
    }
    return runScrapling({
        url,
        actions,
        method: 'stealthy-fetch',
        headless: true,
        networkIdle: true,
    });
}
// #endregion
// #region CLI
const currentFile = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === currentFile;
if (isMainModule) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log(`
Scrapling Runner CLI

Usage:
  npx ts-node scrapling_runner.ts <url> [--explore] [--actions JSON]

Examples:
  npx ts-node scrapling_runner.ts https://example.com --explore
  npx ts-node scrapling_runner.ts https://example.com --actions '[{"action":"screenshot"}]'
`);
        process.exit(1);
    }
    const url = args[0] ?? '';
    const isExplore = args.includes('--explore');
    const actionsIndex = args.indexOf('--actions');
    const actionsArgument = actionsIndex === -1 ? undefined : args[actionsIndex + 1];
    const actions = actionsArgument ? JSON.parse(actionsArgument) : undefined;
    const run = async () => {
        const result = isExplore ? await explorePage(url) : await quickFetch(url, actions);
        console.log(JSON.stringify(result, null, 2));
    };
    run().catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
}
// #endregion
export { SCRAPLING_ACTIONS, validateActions } from './scrapling_actions.js';
//# sourceMappingURL=scrapling_runner.js.map