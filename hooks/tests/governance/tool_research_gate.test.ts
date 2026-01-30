import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isWrapperPath,
  isCodeFile,
  getResearchDocumentPath,
  validateResearchDocument,
  toolResearchGateHook,
} from '../../src/governance/tool_research_gate.js';
import type { PreToolUseInput } from '../../src/types.js';

// Helper to create PreToolUseInput with snake_case properties
function createInput(toolName: string, toolInput: Record<string, unknown>): PreToolUseInput {
  return {
    tool_name: toolName,
    tool_input: toolInput,
  };
}

describe('toolResearchGate', () => {
  // =========================================================================
  // Path Detection
  // =========================================================================
  describe('isWrapperPath', () => {
    it('should detect wrappers/ directory', () => {
      expect(isWrapperPath('/project/wrappers/api.ts')).toBe(true);
      expect(isWrapperPath('C:\\project\\wrappers\\api.ts')).toBe(true);
    });

    it('should detect integrations/ directory', () => {
      expect(isWrapperPath('/project/integrations/servicetitan.ts')).toBe(true);
    });

    it('should detect automation/ directory', () => {
      expect(isWrapperPath('/project/automation/browser.ts')).toBe(true);
    });

    it('should detect clients/ directory', () => {
      expect(isWrapperPath('/project/clients/http_client.ts')).toBe(true);
    });

    it('should detect adapters/ directory', () => {
      expect(isWrapperPath('/project/adapters/api_adapter.ts')).toBe(true);
    });

    it('should detect connectors/ directory', () => {
      expect(isWrapperPath('/project/connectors/db_connector.ts')).toBe(true);
    });

    it('should not detect regular source directories', () => {
      expect(isWrapperPath('/project/src/utils.ts')).toBe(false);
      expect(isWrapperPath('/project/lib/helpers.ts')).toBe(false);
      expect(isWrapperPath('/project/components/Button.tsx')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isWrapperPath('/project/WRAPPERS/api.ts')).toBe(true);
      expect(isWrapperPath('/project/Integrations/api.ts')).toBe(true);
    });
  });

  // =========================================================================
  // Code File Detection
  // =========================================================================
  describe('isCodeFile', () => {
    it('should detect TypeScript files', () => {
      expect(isCodeFile('file.ts')).toBe(true);
      expect(isCodeFile('file.tsx')).toBe(true);
    });

    it('should detect JavaScript files', () => {
      expect(isCodeFile('file.js')).toBe(true);
      expect(isCodeFile('file.jsx')).toBe(true);
      expect(isCodeFile('file.mjs')).toBe(true);
      expect(isCodeFile('file.cjs')).toBe(true);
    });

    it('should detect other language files', () => {
      expect(isCodeFile('file.py')).toBe(true);
      expect(isCodeFile('file.go')).toBe(true);
      expect(isCodeFile('file.rs')).toBe(true);
    });

    it('should not detect config/doc files', () => {
      expect(isCodeFile('README.md')).toBe(false);
      expect(isCodeFile('config.json')).toBe(false);
      expect(isCodeFile('package.json')).toBe(false);
      expect(isCodeFile('.env')).toBe(false);
    });
  });

  // =========================================================================
  // Research Document Path
  // =========================================================================
  describe('getResearchDocumentPath', () => {
    it('should return TOOL-RESEARCH.md in same directory', () => {
      const result = getResearchDocumentPath('/project/wrappers/api.ts');
      expect(result).toBe(path.join('/project/wrappers', 'TOOL-RESEARCH.md'));
    });

    it('should handle Windows paths', () => {
      const result = getResearchDocumentPath('C:\\project\\wrappers\\api.ts');
      expect(result).toBe(path.join('C:\\project\\wrappers', 'TOOL-RESEARCH.md'));
    });
  });

  // =========================================================================
  // Research Document Validation
  // =========================================================================
  describe('validateResearchDocument', () => {
    const validDocument = `
# Tool Research: Browser Automation

## Problem Statement
Need to automate browser interactions for testing.

## Search Queries Executed
- gh search repos "browser automation" --sort stars
- npm search browser-automation

## Candidates Found

### Playwright
- **URL:** https://github.com/microsoft/playwright
- **Stars:** 65,000
- **Decision:** ACCEPTED
- **Reason:** Well-maintained, good API

### Puppeteer
- **URL:** https://github.com/puppeteer/puppeteer
- **Stars:** 85,000
- **Decision:** REJECTED
- **Reason:** Chrome-only

## Final Decision

**Choice:** USE Playwright

**Rationale:**
Playwright provides cross-browser support and better API.
`;

    it('should validate a complete research document', () => {
      const result = validateResearchDocument(validDocument);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.toolsEvaluated).toHaveLength(2);
      expect(result.finalDecision).toBe('USE');
    });

    it('should detect missing Problem Statement section', () => {
      const incomplete = validDocument.replace(/## Problem Statement[\s\S]*?(?=## Search)/, '');
      const result = validateResearchDocument(incomplete);
      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.includes('Problem Statement'))).toBe(true);
    });

    it('should detect missing Search Queries section', () => {
      const incomplete = validDocument.replace(
        /## Search Queries Executed[\s\S]*?(?=## Candidates)/,
        ''
      );
      const result = validateResearchDocument(incomplete);
      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.includes('Search Queries'))).toBe(true);
    });

    it('should detect missing Candidates Found section', () => {
      const incomplete = validDocument.replace(
        /## Candidates Found[\s\S]*?(?=## Final Decision)/,
        ''
      );
      const result = validateResearchDocument(incomplete);
      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.includes('Candidates Found'))).toBe(true);
    });

    it('should detect missing Final Decision section', () => {
      const incomplete = validDocument.replace(/## Final Decision[\s\S]*$/, '');
      const result = validateResearchDocument(incomplete);
      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.includes('Final Decision'))).toBe(true);
    });

    it('should extract evaluated tools', () => {
      const result = validateResearchDocument(validDocument);
      expect(result.toolsEvaluated).toHaveLength(2);

      const playwright = result.toolsEvaluated.find((t) => t.name === 'Playwright');
      expect(playwright).toBeDefined();
      expect(playwright?.stars).toBe(65_000);
      expect(playwright?.decision).toBe('ACCEPTED');

      const puppeteer = result.toolsEvaluated.find((t) => t.name === 'Puppeteer');
      expect(puppeteer).toBeDefined();
      expect(puppeteer?.stars).toBe(85_000);
      expect(puppeteer?.decision).toBe('REJECTED');
    });

    it('should warn when rejecting high-star tool', () => {
      const result = validateResearchDocument(validDocument);
      expect(
        result.warnings.some((warning) => warning.includes('Puppeteer') && warning.includes('85'))
      ).toBe(true);
    });

    it('should require at least one tool evaluated', () => {
      const noTools = `
# Tool Research: Something

## Problem Statement
Need something.

## Search Queries Executed
- searched

## Candidates Found
None found.

## Final Decision

**Choice:** BUILD

**Rationale:**
Nothing exists.
`;
      const result = validateResearchDocument(noTools);
      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.includes('No tools evaluated'))).toBe(true);
    });

    it('should detect BUILD decision', () => {
      const buildDocument = validDocument.replace(
        '**Choice:** USE Playwright',
        '**Choice:** BUILD'
      );
      const result = validateResearchDocument(buildDocument);
      expect(result.finalDecision).toBe('BUILD');
    });
  });

  // =========================================================================
  // Hook Integration
  // =========================================================================
  describe('toolResearchGateHook', () => {
    let temporaryDirectory: string;

    beforeEach(() => {
      temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'research-gate-test-'));
    });

    afterEach(() => {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    it('should allow non-Write/Edit tools', async () => {
      const input = createInput('Read', { file_path: '/some/path.ts' });

      const result = await toolResearchGateHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow files not in wrapper directories', async () => {
      const input = createInput('Write', { file_path: '/project/src/utils.ts' });

      const result = await toolResearchGateHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow non-code files in wrapper directories', async () => {
      const input = createInput('Write', { file_path: '/project/wrappers/README.md' });

      const result = await toolResearchGateHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow the research document itself', async () => {
      const input = createInput('Write', { file_path: '/project/wrappers/TOOL-RESEARCH.md' });

      const result = await toolResearchGateHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should block wrapper file without research document', async () => {
      const wrapperDirectory = path.join(temporaryDirectory, 'wrappers');
      fs.mkdirSync(wrapperDirectory);

      const input = createInput('Write', { file_path: path.join(wrapperDirectory, 'api.ts') });

      const result = await toolResearchGateHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('RESEARCH REQUIRED');
    });

    it('should block wrapper file with incomplete research document', async () => {
      const wrapperDirectory = path.join(temporaryDirectory, 'wrappers');
      fs.mkdirSync(wrapperDirectory);

      // Create incomplete research doc
      fs.writeFileSync(
        path.join(wrapperDirectory, 'TOOL-RESEARCH.md'),
        '# Tool Research\n\n## Problem Statement\nNeed something.\n'
      );

      const input = createInput('Write', { file_path: path.join(wrapperDirectory, 'api.ts') });

      const result = await toolResearchGateHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('RESEARCH INCOMPLETE');
    });

    it('should allow wrapper file with valid research document', async () => {
      const wrapperDirectory = path.join(temporaryDirectory, 'wrappers');
      fs.mkdirSync(wrapperDirectory);

      // Create valid research doc
      const validResearch = `
# Tool Research: API Client

## Problem Statement
Need an API client.

## Search Queries Executed
- searched npm

## Candidates Found

### axios
- **Stars:** 100,000
- **Decision:** REJECTED
- **Reason:** Too heavy

## Final Decision

**Choice:** BUILD

**Rationale:**
Need lightweight solution.
`;
      fs.writeFileSync(path.join(wrapperDirectory, 'TOOL-RESEARCH.md'), validResearch);

      const input = createInput('Write', { file_path: path.join(wrapperDirectory, 'api.ts') });

      const result = await toolResearchGateHook(input);
      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });
});
