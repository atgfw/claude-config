import { describe, it, expect } from 'vitest';
import {
  detectWorkRequest,
  deriveSystemPrefix,
} from '../../src/hooks/work_request_issue_bridge.js';

describe('detectWorkRequest', () => {
  it('detects action verb prompts as work requests', () => {
    const result = detectWorkRequest(
      'Implement a new authentication flow using JWT tokens and refresh mechanism'
    );
    expect(result).not.toBeNull();
    expect(result!.verb).toBe('implement');
    expect(result!.type).toBe('feat');
  });

  it('detects fix requests as fix type', () => {
    const result = detectWorkRequest(
      'Fix the broken authentication system that causes 500 errors on login'
    );
    expect(result).not.toBeNull();
    expect(result!.verb).toBe('fix');
    expect(result!.type).toBe('fix');
  });

  it('detects refactor requests as refactor type', () => {
    const result = detectWorkRequest(
      'Refactor the database connection pooling to use async/await patterns'
    );
    expect(result).not.toBeNull();
    expect(result!.verb).toBe('refactor');
    expect(result!.type).toBe('refactor');
  });

  it('skips short prompts', () => {
    expect(detectWorkRequest('fix bug')).toBeNull();
    expect(detectWorkRequest('add test')).toBeNull();
  });

  it('skips question prompts', () => {
    expect(
      detectWorkRequest('What is the best way to implement authentication in this project?')
    ).toBeNull();
    expect(detectWorkRequest('How do I configure the database connection pooling?')).toBeNull();
    expect(detectWorkRequest('Can you explain how the authentication flow works?')).toBeNull();
  });

  it('skips meta commands', () => {
    expect(detectWorkRequest('/commit all the changes we just made')).toBeNull();
    expect(detectWorkRequest('audit the system for any pending issues and fix quirks')).toBeNull();
    expect(detectWorkRequest('review the code changes in the last commit please')).toBeNull();
  });

  it('skips conversational responses', () => {
    expect(detectWorkRequest('yes go ahead and do it please now')).toBeNull();
    expect(detectWorkRequest('ok that looks good to me thanks')).toBeNull();
    expect(detectWorkRequest('proceed with the implementation plan now')).toBeNull();
  });

  it('skips prompts ending with question mark', () => {
    expect(detectWorkRequest('Should I implement the feature using React or Vue?')).toBeNull();
  });

  it('truncates long titles to 120 chars', () => {
    const longPrompt =
      'Build a comprehensive user management system with role-based access control, multi-factor authentication, session management, password reset flows, and audit logging capabilities for the enterprise dashboard';
    const result = detectWorkRequest(longPrompt);
    expect(result).not.toBeNull();
    expect(result!.title.length).toBeLessThanOrEqual(120);
    expect(result!.title).toContain('...');
  });

  it('returns null for no action verb', () => {
    expect(
      detectWorkRequest(
        'The authentication system needs a complete overhaul to support new requirements'
      )
    ).toBeNull();
  });
});

describe('deriveSystemPrefix', () => {
  it('detects n8n projects', () => {
    expect(deriveSystemPrefix('/home/user/coding/n8n_n8n')).toBe('n8n');
  });

  it('detects claude/infra projects', () => {
    expect(deriveSystemPrefix('/home/user/.claude')).toBe('infra');
  });

  it('detects elevenlabs projects', () => {
    expect(deriveSystemPrefix('/home/user/elevenlabs-agents')).toBe('elevenlabs');
  });

  it('defaults to general for unknown projects', () => {
    expect(deriveSystemPrefix('/home/user/my-app')).toBe('general');
  });
});
