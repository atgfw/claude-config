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
});
