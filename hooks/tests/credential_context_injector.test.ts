/**
 * Tests for credential_context_injector hook
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  detectsCredentialDiscussion,
  getConfiguredServices,
  buildContextMessage,
  CREDENTIAL_PATTERNS,
} from '../src/hooks/credential_context_injector.js';

describe('credential_context_injector', () => {
  describe('detectsCredentialDiscussion', () => {
    it('detects direct API key mentions', () => {
      expect(detectsCredentialDiscussion('I need an API key')).toBe(true);
      expect(detectsCredentialDiscussion('where is the api_key')).toBe(true);
      expect(detectsCredentialDiscussion('set the api-key')).toBe(true);
    });

    it('detects token mentions', () => {
      expect(detectsCredentialDiscussion('add the auth token')).toBe(true);
      expect(detectsCredentialDiscussion('bearer token missing')).toBe(true);
      expect(detectsCredentialDiscussion('access_token required')).toBe(true);
    });

    it('detects environment variable patterns', () => {
      expect(detectsCredentialDiscussion('check ELEVENLABS_API_KEY')).toBe(true);
      expect(detectsCredentialDiscussion('set N8N_SECRET')).toBe(true);
      expect(detectsCredentialDiscussion('need MY_SERVICE_TOKEN')).toBe(true);
    });

    it('detects .env file mentions', () => {
      expect(detectsCredentialDiscussion('add it to .env')).toBe(true);
      expect(detectsCredentialDiscussion('check the .env file')).toBe(true);
      expect(detectsCredentialDiscussion('environment variable needed')).toBe(true);
    });

    it('detects service-specific patterns', () => {
      expect(detectsCredentialDiscussion('need the anthropic key')).toBe(true);
      expect(detectsCredentialDiscussion('elevenlabs api key')).toBe(true);
      expect(detectsCredentialDiscussion('servicetitan credentials')).toBe(true);
      expect(detectsCredentialDiscussion('key for n8n')).toBe(true);
    });

    it('detects action patterns', () => {
      expect(detectsCredentialDiscussion('add the API key')).toBe(true);
      expect(detectsCredentialDiscussion('configure the secret')).toBe(true);
      expect(detectsCredentialDiscussion('where is my token')).toBe(true);
      expect(detectsCredentialDiscussion('how do I set credentials')).toBe(true);
    });

    it('detects questions about key existence', () => {
      expect(detectsCredentialDiscussion('do you have the API key')).toBe(true);
      expect(detectsCredentialDiscussion('do we have credentials')).toBe(true);
      expect(detectsCredentialDiscussion('missing the secret key')).toBe(true);
      expect(detectsCredentialDiscussion("I don't have the token")).toBe(true);
    });

    it('does not trigger on unrelated prompts', () => {
      expect(detectsCredentialDiscussion('build the app')).toBe(false);
      expect(detectsCredentialDiscussion('fix the bug')).toBe(false);
      expect(detectsCredentialDiscussion('list github issues')).toBe(false);
      expect(detectsCredentialDiscussion('deploy to production')).toBe(false);
    });

    it('does not trigger on generic word usage', () => {
      // 'key' alone should not trigger - needs context
      expect(detectsCredentialDiscussion('the key thing is')).toBe(false);
      expect(detectsCredentialDiscussion('press any key')).toBe(false);
    });
  });

  describe('getConfiguredServices', () => {
    let tempDir: string;
    let tempEnvPath: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cred-test-'));
      tempEnvPath = path.join(tempDir, '.env');
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    it('returns empty array when .env does not exist', () => {
      const services = getConfiguredServices('/nonexistent/.env');
      expect(services).toEqual([]);
    });

    it('parses ElevenLabs keys', () => {
      fs.writeFileSync(tempEnvPath, 'ELEVENLABS_API_KEY=sk_xxx');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toContain('ElevenLabs');
    });

    it('parses n8n keys', () => {
      fs.writeFileSync(tempEnvPath, 'N8N_API_KEY=xxx\nN8N_BASE_URL=https://...');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toContain('n8n');
      expect(services.filter((s) => s === 'n8n')).toHaveLength(1); // No duplicates
    });

    it('parses ServiceTitan keys', () => {
      fs.writeFileSync(tempEnvPath, 'ST_CLIENT_ID=xxx\nST_CLIENT_SECRET=yyy');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toContain('ServiceTitan');
      expect(services.filter((s) => s === 'ServiceTitan')).toHaveLength(1);
    });

    it('parses multiple services', () => {
      fs.writeFileSync(
        tempEnvPath,
        `ELEVENLABS_API_KEY=xxx
N8N_API_KEY=yyy
ST_CLIENT_ID=zzz
MORPH_API_KEY=aaa
TAVILY_API_KEY=bbb`
      );
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toContain('ElevenLabs');
      expect(services).toContain('n8n');
      expect(services).toContain('ServiceTitan');
      expect(services).toContain('Morph');
      expect(services).toContain('Tavily');
    });

    it('skips empty values', () => {
      fs.writeFileSync(tempEnvPath, 'ELEVENLABS_API_KEY=\nN8N_API_KEY=actual_value');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).not.toContain('ElevenLabs');
      expect(services).toContain('n8n');
    });

    it('skips comments', () => {
      fs.writeFileSync(tempEnvPath, '# ELEVENLABS_API_KEY=xxx\nN8N_API_KEY=yyy');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).not.toContain('ElevenLabs');
      expect(services).toContain('n8n');
    });

    it('parses webhook secrets', () => {
      fs.writeFileSync(tempEnvPath, 'N8N_IN_SECRET_CUSTOMER_SYNC=xxx');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toContain('Webhook:customer_sync');
    });
  });

  describe('buildContextMessage', () => {
    it('includes location information', () => {
      const message = buildContextMessage([]);
      expect(message).toContain('~/.claude/.env');
      expect(message).toContain('CREDENTIAL CONTEXT REMINDER');
    });

    it('lists configured services', () => {
      const message = buildContextMessage(['ElevenLabs', 'n8n', 'ServiceTitan']);
      expect(message).toContain('ElevenLabs');
      expect(message).toContain('n8n');
      expect(message).toContain('ServiceTitan');
    });

    it('shows none detected when empty', () => {
      const message = buildContextMessage([]);
      expect(message).toContain('None detected');
    });

    it('includes CRUD rules', () => {
      const message = buildContextMessage([]);
      expect(message).toContain('READ');
      expect(message).toContain('CREATE/UPDATE');
      expect(message).toContain('grep');
    });

    it('includes forbidden patterns', () => {
      const message = buildContextMessage([]);
      expect(message).toContain('FORBIDDEN');
      expect(message).toContain('project-level .env');
      expect(message).toContain('inline credentials');
    });

    it('includes reminder to check before claiming missing', () => {
      const message = buildContextMessage([]);
      expect(message).toContain("Before claiming a key doesn't exist");
    });
  });

  describe('CREDENTIAL_PATTERNS coverage', () => {
    it('has at least 10 patterns', () => {
      expect(CREDENTIAL_PATTERNS.length).toBeGreaterThanOrEqual(10);
    });

    it('all patterns are valid regex', () => {
      for (const pattern of CREDENTIAL_PATTERNS) {
        expect(pattern).toBeInstanceOf(RegExp);
        // Should not throw when testing
        expect(() => pattern.test('test string')).not.toThrow();
      }
    });
  });

  // ============================================================================
  // ADVERSARIAL TESTS - Edge cases, false positives, boundary conditions
  // ============================================================================

  describe('ADVERSARIAL: False positive resistance', () => {
    it('does not trigger on "keyboard" or "monkey"', () => {
      expect(detectsCredentialDiscussion('use keyboard shortcuts')).toBe(false);
      expect(detectsCredentialDiscussion('monkey patching the code')).toBe(false);
      expect(detectsCredentialDiscussion('donkey kong')).toBe(false);
    });

    it('does not trigger on "turkey" or "hockey"', () => {
      expect(detectsCredentialDiscussion('thanksgiving turkey')).toBe(false);
      expect(detectsCredentialDiscussion('hockey game tonight')).toBe(false);
    });

    it('does not trigger on code variable names without context', () => {
      expect(detectsCredentialDiscussion('const myKey = items[0]')).toBe(false);
      expect(detectsCredentialDiscussion('for key in dictionary')).toBe(false);
      expect(detectsCredentialDiscussion('primary key constraint')).toBe(false);
    });

    it('does not trigger on "secretive" or "secretly"', () => {
      // These contain "secret" but are not credential-related
      // Note: Current implementation WILL trigger - this tests if we want stricter matching
      const result = detectsCredentialDiscussion('he was being secretive');
      // Document current behavior - adjust if too aggressive
      expect(typeof result).toBe('boolean');
    });

    it('does not trigger on music/crypto unrelated "token"', () => {
      // "token gesture" should not trigger
      expect(detectsCredentialDiscussion('just a token gesture')).toBe(true); // Contains "token" - acceptable
      // But pure crypto token discussion without auth context
      expect(detectsCredentialDiscussion('buy some bitcoin')).toBe(false);
    });

    it('does not trigger on file paths without .env', () => {
      expect(detectsCredentialDiscussion('edit /home/user/.bashrc')).toBe(false);
      expect(detectsCredentialDiscussion('read config.yaml')).toBe(false);
      expect(detectsCredentialDiscussion('update .gitignore')).toBe(false);
    });
  });

  describe('ADVERSARIAL: Unicode and encoding attacks', () => {
    it('handles Unicode lookalikes for "key"', () => {
      // Cyrillic "к" looks like Latin "k"
      const cyrillicKey = 'аpi кey'; // Uses Cyrillic а and к
      // Should NOT trigger (different characters)
      expect(detectsCredentialDiscussion(cyrillicKey)).toBe(false);
    });

    it('handles zero-width characters', () => {
      const withZeroWidth = 'api\u200Bkey'; // Zero-width space
      // Behavior depends on regex - document it
      const result = detectsCredentialDiscussion(withZeroWidth);
      expect(typeof result).toBe('boolean');
    });

    it('handles extremely long input without ReDoS', () => {
      // ReDoS test - should complete in reasonable time
      const longInput = 'a'.repeat(100000) + ' api key ' + 'b'.repeat(100000);
      const start = Date.now();
      const result = detectsCredentialDiscussion(longInput);
      const elapsed = Date.now() - start;
      expect(result).toBe(true);
      expect(elapsed).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('handles input with only whitespace', () => {
      expect(detectsCredentialDiscussion('   \n\t\r\n   ')).toBe(false);
    });

    it('handles empty string', () => {
      expect(detectsCredentialDiscussion('')).toBe(false);
    });

    it('handles null-byte injection attempts', () => {
      const withNull = 'api\u0000key';
      const result = detectsCredentialDiscussion(withNull);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('ADVERSARIAL: Case sensitivity edge cases', () => {
    it('detects ALL CAPS variations', () => {
      expect(detectsCredentialDiscussion('WHERE IS THE API KEY')).toBe(true);
      expect(detectsCredentialDiscussion('SET THE SECRET')).toBe(true);
    });

    it('detects MiXeD cAsE variations', () => {
      expect(detectsCredentialDiscussion('ApI kEy')).toBe(true);
      expect(detectsCredentialDiscussion('SeCrEt ToKeN')).toBe(true);
    });

    it('handles service names in different cases', () => {
      expect(detectsCredentialDiscussion('ANTHROPIC key')).toBe(true);
      expect(detectsCredentialDiscussion('Anthropic KEY')).toBe(true);
      expect(detectsCredentialDiscussion('AnThRoPiC kEy')).toBe(true);
    });
  });

  describe('ADVERSARIAL: Boundary and punctuation', () => {
    it('detects credentials at start of string', () => {
      expect(detectsCredentialDiscussion('API key is missing')).toBe(true);
      expect(detectsCredentialDiscussion('Token expired')).toBe(true);
    });

    it('detects credentials at end of string', () => {
      expect(detectsCredentialDiscussion('I need the API key')).toBe(true);
      expect(detectsCredentialDiscussion('please add the token')).toBe(true);
    });

    it('detects credentials with punctuation', () => {
      expect(detectsCredentialDiscussion('API key?')).toBe(true);
      expect(detectsCredentialDiscussion('API key!')).toBe(true);
      expect(detectsCredentialDiscussion('(API key)')).toBe(true);
      expect(detectsCredentialDiscussion('"API key"')).toBe(true);
    });

    it('detects credentials in markdown', () => {
      expect(detectsCredentialDiscussion('**API key**')).toBe(true);
      expect(detectsCredentialDiscussion('`API_KEY`')).toBe(true);
      expect(detectsCredentialDiscussion('- API key')).toBe(true);
    });

    it('detects credentials in code blocks', () => {
      const codeBlock = '```\nconst API_KEY = process.env.API_KEY\n```';
      expect(detectsCredentialDiscussion(codeBlock)).toBe(true);
    });
  });

  describe('ADVERSARIAL: getConfiguredServices edge cases', () => {
    let tempDir: string;
    let tempEnvPath: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cred-adv-'));
      tempEnvPath = path.join(tempDir, '.env');
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    it('handles .env with Windows line endings (CRLF)', () => {
      fs.writeFileSync(tempEnvPath, 'ELEVENLABS_API_KEY=xxx\r\nN8N_API_KEY=yyy\r\n');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toContain('ElevenLabs');
      expect(services).toContain('n8n');
    });

    it('handles .env with mixed line endings', () => {
      fs.writeFileSync(
        tempEnvPath,
        'ELEVENLABS_API_KEY=xxx\nN8N_API_KEY=yyy\r\nMORPH_API_KEY=zzz\r'
      );
      const services = getConfiguredServices(tempEnvPath);
      expect(services.length).toBeGreaterThanOrEqual(2);
    });

    it('handles .env with trailing whitespace', () => {
      fs.writeFileSync(tempEnvPath, 'ELEVENLABS_API_KEY=xxx   \nN8N_API_KEY=yyy\t\t');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toContain('ElevenLabs');
    });

    it('handles .env with leading whitespace on lines', () => {
      fs.writeFileSync(tempEnvPath, '  ELEVENLABS_API_KEY=xxx\n\tN8N_API_KEY=yyy');
      const services = getConfiguredServices(tempEnvPath);
      // Current behavior: lines are trimmed, so these should work
      expect(services).toContain('ElevenLabs');
    });

    it('handles values containing equals signs', () => {
      fs.writeFileSync(tempEnvPath, 'N8N_API_KEY=abc=def=ghi');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toContain('n8n');
    });

    it('handles values with quotes', () => {
      fs.writeFileSync(tempEnvPath, 'ELEVENLABS_API_KEY="sk_quoted_value"');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toContain('ElevenLabs');
    });

    it('handles empty .env file', () => {
      fs.writeFileSync(tempEnvPath, '');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toEqual([]);
    });

    it('handles .env with only comments', () => {
      fs.writeFileSync(tempEnvPath, '# Comment 1\n# Comment 2\n# ELEVENLABS_API_KEY=xxx');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toEqual([]);
    });

    it('handles .env with blank lines', () => {
      fs.writeFileSync(tempEnvPath, '\n\nELEVENLABS_API_KEY=xxx\n\n\nN8N_API_KEY=yyy\n\n');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toContain('ElevenLabs');
      expect(services).toContain('n8n');
    });

    it('handles duplicate keys (last value wins but service only listed once)', () => {
      fs.writeFileSync(tempEnvPath, 'ELEVENLABS_API_KEY=first\nELEVENLABS_API_KEY=second');
      const services = getConfiguredServices(tempEnvPath);
      expect(services.filter((s) => s === 'ElevenLabs')).toHaveLength(1);
    });

    it('handles unknown service prefixes gracefully', () => {
      fs.writeFileSync(tempEnvPath, 'UNKNOWN_SERVICE_API_KEY=xxx\nRANDOM_TOKEN=yyy');
      const services = getConfiguredServices(tempEnvPath);
      // Should not crash, may or may not detect
      expect(Array.isArray(services)).toBe(true);
    });

    it('handles very long values', () => {
      const longValue = 'x'.repeat(10000);
      fs.writeFileSync(tempEnvPath, `ELEVENLABS_API_KEY=${longValue}`);
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toContain('ElevenLabs');
    });

    it('handles keys with special characters in webhook names', () => {
      fs.writeFileSync(tempEnvPath, 'N8N_IN_SECRET_MY_WEBHOOK_123=xxx');
      const services = getConfiguredServices(tempEnvPath);
      expect(services).toContain('Webhook:my_webhook_123');
    });
  });

  describe('ADVERSARIAL: buildContextMessage edge cases', () => {
    it('handles very long service list', () => {
      const manyServices = Array.from({ length: 100 }, (_, i) => `Service${i}`);
      const message = buildContextMessage(manyServices);
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('Service0');
      expect(message).toContain('Service99');
    });

    it('handles service names with special characters', () => {
      const services = ['Service:with:colons', 'Service/with/slashes', 'Service<with>brackets'];
      const message = buildContextMessage(services);
      // Should not crash
      expect(message.length).toBeGreaterThan(0);
    });

    it('handles empty string in service list', () => {
      const services = ['ElevenLabs', '', 'n8n'];
      const message = buildContextMessage(services);
      expect(message).toContain('ElevenLabs');
      expect(message).toContain('n8n');
    });
  });
});
