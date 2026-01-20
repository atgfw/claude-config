/**
 * API Key Detector
 * Scans text for API key patterns and classifies them
 */
import { SERVICES, maskKey } from './registry.js';
/**
 * Detect API keys in text
 * Returns array of detected keys with their service classification
 */
export function detectApiKeys(text) {
    const detected = [];
    const seen = new Set();
    for (const service of SERVICES) {
        const matches = text.match(new RegExp(service.pattern.source, 'g'));
        if (matches) {
            for (const match of matches) {
                // Skip if we've already seen this key
                if (seen.has(match))
                    continue;
                seen.add(match);
                // Validate it looks like a real key (not too short)
                if (match.length < 20)
                    continue;
                detected.push({
                    service,
                    value: match,
                    masked: maskKey(match, service),
                });
            }
        }
    }
    return detected;
}
/**
 * Check if text contains any API key patterns
 */
export function containsApiKey(text) {
    for (const service of SERVICES) {
        if (service.pattern.test(text)) {
            return true;
        }
    }
    return false;
}
/**
 * Extract env var assignments from text
 * Looks for patterns like: ANTHROPIC_API_KEY=sk-ant-...
 */
export function extractEnvAssignments(text) {
    const assignments = new Map();
    // Match common env assignment patterns
    const patterns = [
        /([A-Z][A-Z0-9_]+)=["']?([^"'\s\n]+)["']?/g, // VAR=value or VAR="value"
        /export\s+([A-Z][A-Z0-9_]+)=["']?([^"'\s\n]+)["']?/g, // export VAR=value
        /set\s+([A-Z][A-Z0-9_]+)=["']?([^"'\s\n]+)["']?/gi, // Windows set VAR=value
    ];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const [, varName, value] = match;
            if (varName && value) {
                // Check if this is a known API key var
                const service = SERVICES.find((s) => s.envVar === varName);
                if (service && service.pattern.test(value)) {
                    assignments.set(varName, value);
                }
            }
        }
    }
    return assignments;
}
//# sourceMappingURL=detector.js.map