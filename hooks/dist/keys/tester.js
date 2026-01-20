/**
 * API Key Tester
 * Validates API keys by testing connectivity to service endpoints
 */
const TEST_TIMEOUT_MS = 5000;
/**
 * Test an API key by making a request to the service
 */
export async function testKey(service, key) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
    try {
        const headers = service.testHeaders(key);
        const options = {
            method: service.testMethod,
            headers,
            signal: controller.signal,
        };
        if (service.testMethod === 'POST' && service.testBody) {
            options.body = JSON.stringify(service.testBody);
        }
        const response = await fetch(service.testEndpoint, options);
        clearTimeout(timeout);
        // 200-299 = valid key
        if (response.ok) {
            return { valid: true, reason: 'success', statusCode: response.status };
        }
        // 401/403 = invalid key (but format was correct)
        if (response.status === 401 || response.status === 403) {
            return { valid: false, reason: 'unauthorized', statusCode: response.status };
        }
        // 429 = rate limited, key might be valid
        if (response.status === 429) {
            return { valid: true, reason: 'success', statusCode: response.status };
        }
        // Other errors = network/service issue
        return { valid: false, reason: 'network', statusCode: response.status };
    }
    catch (error) {
        clearTimeout(timeout);
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                return { valid: false, reason: 'timeout' };
            }
        }
        return { valid: false, reason: 'error' };
    }
}
/**
 * Test multiple keys in parallel
 */
export async function testKeys(keys) {
    const results = new Map();
    const tests = keys.map(async ({ service, value }) => {
        const result = await testKey(service, value);
        results.set(service.envVar, result);
    });
    await Promise.all(tests);
    return results;
}
//# sourceMappingURL=tester.js.map