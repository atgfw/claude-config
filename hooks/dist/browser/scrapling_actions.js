/**
 * Scrapling Page Action Schema
 * Codified mapping of all Scrapling CLI page actions for programmatic use.
 *
 * Usage: Import this schema for hook automations, validation, and code generation.
 */
// #endregion
// #region Action Definitions
/**
 * Complete mapping of Scrapling page actions with Playwright equivalents
 */
export const SCRAPLING_ACTIONS = {
    screenshot: {
        description: 'Capture screenshot of current page state',
        playwrightMethod: 'page.screenshot',
        requiredParams: [],
        optionalParams: ['filename', 'selector'],
        example: { action: 'screenshot', filename: 'page.png' },
        pythonTemplate: `page.screenshot(path='{filename}')`,
    },
    click: {
        description: 'Click an element',
        playwrightMethod: 'page.click',
        requiredParams: ['selector'],
        optionalParams: ['timeout', 'position'],
        example: { action: 'click', selector: 'button.submit' },
        pythonTemplate: `page.click('{selector}')`,
    },
    fill: {
        description: 'Clear and fill input field',
        playwrightMethod: 'page.fill',
        requiredParams: ['selector', 'value'],
        optionalParams: ['timeout'],
        example: { action: 'fill', selector: 'input#email', value: 'user@example.com' },
        pythonTemplate: `page.fill('{selector}', '{value}')`,
    },
    type: {
        description: 'Type text character by character',
        playwrightMethod: 'page.type',
        requiredParams: ['selector', 'value'],
        optionalParams: ['timeout'],
        example: { action: 'type', selector: 'input#search', value: 'query' },
        pythonTemplate: `page.type('{selector}', '{value}')`,
    },
    hover: {
        description: 'Hover over an element',
        playwrightMethod: 'page.hover',
        requiredParams: ['selector'],
        optionalParams: ['timeout', 'position'],
        example: { action: 'hover', selector: '.dropdown-trigger' },
        pythonTemplate: `page.hover('{selector}')`,
    },
    press: {
        description: 'Press a keyboard key',
        playwrightMethod: 'page.press',
        requiredParams: ['selector', 'value'],
        optionalParams: ['timeout'],
        example: { action: 'press', selector: 'input', value: 'Enter' },
        pythonTemplate: `page.press('{selector}', '{value}')`,
    },
    select: {
        description: 'Select dropdown option',
        playwrightMethod: 'page.select_option',
        requiredParams: ['selector', 'value'],
        optionalParams: ['timeout'],
        example: { action: 'select', selector: 'select#country', value: 'US' },
        pythonTemplate: `page.select_option('{selector}', '{value}')`,
    },
    check: {
        description: 'Check a checkbox',
        playwrightMethod: 'page.check',
        requiredParams: ['selector'],
        optionalParams: ['timeout'],
        example: { action: 'check', selector: 'input[type=checkbox]' },
        pythonTemplate: `page.check('{selector}')`,
    },
    uncheck: {
        description: 'Uncheck a checkbox',
        playwrightMethod: 'page.uncheck',
        requiredParams: ['selector'],
        optionalParams: ['timeout'],
        example: { action: 'uncheck', selector: 'input[type=checkbox]' },
        pythonTemplate: `page.uncheck('{selector}')`,
    },
    wait: {
        description: 'Wait for specified milliseconds',
        playwrightMethod: 'page.wait_for_timeout',
        requiredParams: ['value'],
        optionalParams: [],
        example: { action: 'wait', value: '2000' },
        pythonTemplate: `page.wait_for_timeout({value})`,
    },
    wait_selector: {
        description: 'Wait for element to appear',
        playwrightMethod: 'page.wait_for_selector',
        requiredParams: ['selector'],
        optionalParams: ['timeout', 'value'],
        example: { action: 'wait_selector', selector: '.loaded' },
        pythonTemplate: `page.wait_for_selector('{selector}')`,
    },
    wait_url: {
        description: 'Wait for URL to match pattern',
        playwrightMethod: 'page.wait_for_url',
        requiredParams: ['value'],
        optionalParams: ['timeout'],
        example: { action: 'wait_url', value: '**/dashboard**' },
        pythonTemplate: `page.wait_for_url('{value}')`,
    },
    get_text: {
        description: 'Get inner text of element',
        playwrightMethod: 'page.locator().inner_text',
        requiredParams: ['selector'],
        optionalParams: [],
        example: { action: 'get_text', selector: 'h1' },
        pythonTemplate: `page.locator('{selector}').first.inner_text()`,
    },
    get_attribute: {
        description: 'Get attribute value of element',
        playwrightMethod: 'page.locator().get_attribute',
        requiredParams: ['selector', 'attribute'],
        optionalParams: [],
        example: { action: 'get_attribute', selector: 'a', attribute: 'href' },
        pythonTemplate: `page.locator('{selector}').first.get_attribute('{attribute}')`,
    },
    get_value: {
        description: 'Get input value',
        playwrightMethod: 'page.locator().input_value',
        requiredParams: ['selector'],
        optionalParams: [],
        example: { action: 'get_value', selector: 'input#email' },
        pythonTemplate: `page.locator('{selector}').first.input_value()`,
    },
    get_title: {
        description: 'Get page title',
        playwrightMethod: 'page.title',
        requiredParams: [],
        optionalParams: [],
        example: { action: 'get_title' },
        pythonTemplate: `page.title()`,
    },
    get_url: {
        description: 'Get current page URL',
        playwrightMethod: 'page.url',
        requiredParams: [],
        optionalParams: [],
        example: { action: 'get_url' },
        pythonTemplate: `page.url`,
    },
    list_elements: {
        description: 'List all matching elements',
        playwrightMethod: 'page.locator().all',
        requiredParams: ['selector'],
        optionalParams: [],
        example: { action: 'list_elements', selector: 'button' },
        pythonTemplate: `[el.inner_text() for el in page.locator('{selector}').all()]`,
    },
    evaluate: {
        description: 'Execute JavaScript in page context',
        playwrightMethod: 'page.evaluate',
        requiredParams: ['value'],
        optionalParams: [],
        example: { action: 'evaluate', value: 'document.title' },
        pythonTemplate: `page.evaluate('{value}')`,
    },
    go_back: {
        description: 'Navigate back in history',
        playwrightMethod: 'page.go_back',
        requiredParams: [],
        optionalParams: ['timeout'],
        example: { action: 'go_back' },
        pythonTemplate: `page.go_back()`,
    },
    go_forward: {
        description: 'Navigate forward in history',
        playwrightMethod: 'page.go_forward',
        requiredParams: [],
        optionalParams: ['timeout'],
        example: { action: 'go_forward' },
        pythonTemplate: `page.go_forward()`,
    },
    reload: {
        description: 'Reload current page',
        playwrightMethod: 'page.reload',
        requiredParams: [],
        optionalParams: ['timeout'],
        example: { action: 'reload' },
        pythonTemplate: `page.reload()`,
    },
    scroll: {
        description: 'Scroll to element or position',
        playwrightMethod: 'page.locator().scroll_into_view_if_needed',
        requiredParams: ['selector'],
        optionalParams: [],
        example: { action: 'scroll', selector: '#footer' },
        pythonTemplate: `page.locator('{selector}').scroll_into_view_if_needed()`,
    },
    focus: {
        description: 'Focus an element',
        playwrightMethod: 'page.focus',
        requiredParams: ['selector'],
        optionalParams: ['timeout'],
        example: { action: 'focus', selector: 'input#search' },
        pythonTemplate: `page.focus('{selector}')`,
    },
    blur: {
        description: 'Remove focus from element',
        playwrightMethod: 'page.locator().blur',
        requiredParams: ['selector'],
        optionalParams: [],
        example: { action: 'blur', selector: 'input#search' },
        pythonTemplate: `page.locator('{selector}').blur()`,
    },
    drag: {
        description: 'Drag element to target',
        playwrightMethod: 'page.drag_and_drop',
        requiredParams: ['selector', 'value'],
        optionalParams: ['timeout'],
        example: { action: 'drag', selector: '#source', value: '#target' },
        pythonTemplate: `page.drag_and_drop('{selector}', '{value}')`,
    },
    upload_file: {
        description: 'Upload file to input',
        playwrightMethod: 'page.set_input_files',
        requiredParams: ['selector', 'value'],
        optionalParams: ['timeout'],
        example: { action: 'upload_file', selector: 'input[type=file]', value: '/path/to/file.pdf' },
        pythonTemplate: `page.set_input_files('{selector}', '{value}')`,
    },
};
// #endregion
// #region Validation
/**
 * Validate a Scrapling action
 */
export function validateAction(action) {
    const errors = [];
    const def = SCRAPLING_ACTIONS[action.action];
    if (!def) {
        return { valid: false, errors: [`Unknown action: ${action.action}`] };
    }
    for (const parameter of def.requiredParams) {
        if (!(parameter in action) || action[parameter] === undefined) {
            errors.push(`Missing required parameter: ${parameter}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Validate a sequence of actions
 */
export function validateActions(actions) {
    const allErrors = [];
    for (const [index, action] of actions.entries()) {
        const result = validateAction(action);
        if (!result.valid) {
            allErrors.push({ step: index, errors: result.errors });
        }
    }
    return { valid: allErrors.length === 0, errors: allErrors };
}
// #endregion
// #region Code Generation
/**
 * Generate Python page_action function from action sequence
 */
export function generatePythonPageAction(actions, functionName = 'page_action') {
    const lines = [`def ${functionName}(page):`, `    results = []`];
    for (const [index, action] of actions.entries()) {
        const def = SCRAPLING_ACTIONS[action.action];
        if (!def) {
            lines.push(`    # Unknown action: ${action.action}`);
            continue;
        }
        let code = def.pythonTemplate;
        code = code.replace('{selector}', action.selector || '');
        code = code.replace('{value}', action.value || '');
        code = code.replace('{filename}', action.filename || `screenshot-${index}.png`);
        code = code.replace('{attribute}', action.attribute || 'href');
        lines.push(`    try:`, `        result_${index} = ${code}`, `        results.append({'step': ${index}, 'action': '${action.action}', 'status': 'ok', 'value': str(result_${index})[:500] if result_${index} else None})`, `    except Exception as e:`, `        results.append({'step': ${index}, 'action': '${action.action}', 'status': 'error', 'error': str(e)})`);
    }
    lines.push(`    return results`);
    return lines.join('\n');
}
/**
 * Generate full Scrapling fetch script
 */
export function generateScraplingScript(options, actions) {
    const fetcherClass = options.method === 'stealthy-fetch' ? 'StealthyFetcher' : 'DynamicFetcher';
    const fetcherImport = options.method === 'stealthy-fetch' ? 'StealthyFetcher' : 'DynamicFetcher';
    const pageActionCode = generatePythonPageAction(actions);
    const fetchOptions = [
        `    '${options.url}'`,
        `    headless=${options.headless === false ? 'False' : 'True'}`,
    ];
    if (options.timeout) {
        fetchOptions.push(`    timeout=${options.timeout}`);
    }
    if (options.solveCloudflare) {
        fetchOptions.push(`    solve_cloudflare=True`);
    }
    if (options.realChrome) {
        fetchOptions.push(`    real_chrome=True`);
    }
    if (options.networkIdle) {
        fetchOptions.push(`    network_idle=True`);
    }
    if (options.userDataDir) {
        fetchOptions.push(`    user_data_dir='${options.userDataDir}'`);
    }
    return `#!/usr/bin/env python3
"""Auto-generated Scrapling script"""
import json
from scrapling import ${fetcherImport}

${pageActionCode}

response = ${fetcherClass}.fetch(
${fetchOptions.join(',\n')},
    page_action=page_action
)

print(json.dumps({
    'url': '${options.url}',
    'status': response.status,
    'results': page_action.__code__.co_consts  # Note: results captured during execution
}))
`;
}
// #endregion
// #region JSON Schema
/**
 * JSON Schema for Scrapling actions (for validation in other systems)
 */
export const SCRAPLING_ACTION_JSON_SCHEMA = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'ScraplingAction',
    type: 'object',
    required: ['action'],
    properties: {
        action: {
            type: 'string',
            enum: Object.keys(SCRAPLING_ACTIONS),
        },
        selector: {
            type: 'string',
            description: 'CSS selector for target element',
        },
        value: {
            type: 'string',
            description: 'Value for fill/type/press/evaluate actions',
        },
        filename: {
            type: 'string',
            description: 'Output filename for screenshot',
        },
        attribute: {
            type: 'string',
            description: 'Attribute name for get_attribute action',
        },
        timeout: {
            type: 'number',
            description: 'Timeout in milliseconds',
        },
    },
};
// #endregion
export default SCRAPLING_ACTIONS;
//# sourceMappingURL=scrapling_actions.js.map