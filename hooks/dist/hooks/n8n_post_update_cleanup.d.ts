/**
 * N8N Post Update Cleanup
 *
 * PostToolUse hook that cleans up temporary workflow JSON files
 * after successful n8n API operations.
 *
 * Only triggers on SUCCESS - if the n8n operation fails, temp files are preserved
 * for debugging.
 *
 * Issue: #19, #33
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
export declare function n8nPostUpdateCleanupHook(input: PostToolUseInput): Promise<PostToolUseOutput>;
export default n8nPostUpdateCleanupHook;
//# sourceMappingURL=n8n_post_update_cleanup.d.ts.map