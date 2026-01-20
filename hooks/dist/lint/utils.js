/** Regex to match `// #region Name` with a required name */
export const REGION_START_RE = /^\s*\/\/\s*#region\s+(\S(?:.*\S)?)\s*$/;
// Matches #region with or without name (for detecting nameless regions)
export const REGION_START_BARE_RE = /^\s*\/\/\s*#region\s*$/;
export const REGION_END_RE = /^\s*\/\/\s*#endregion\s*$/;
export const REGION_END_WITH_NAME_RE = /^\s*\/\/\s*#endregion\s+\S+/;
export const ERROR_CTORS = new Set([
    'Error',
    'TypeError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'URIError',
    'AggregateError',
    'EvalError',
]);
export const BANNED_IDENTIFIERS = new Set([
    'result',
    'id',
    'pid',
    'object',
    'report',
    'output',
    'json',
    'response',
    'name',
    'value',
]);
export const GENERIC_MESSAGE_PREFIXES = [
    'preparing',
    'starting',
    'successfully',
    'completed',
    'finished',
];
export function reportAtLine(context, lineNumber1Based, messageId, data) {
    context.report({
        loc: {
            start: { line: lineNumber1Based, column: 0 },
            end: { line: lineNumber1Based, column: 0 },
        },
        messageId,
        data,
    });
}
export function isConsoleMemberExpression(callee) {
    if (!callee || callee.type !== 'MemberExpression') {
        return false;
    }
    const memberExpr = callee;
    if (memberExpr.object?.type !== 'Identifier' || memberExpr.object.name !== 'console') {
        return false;
    }
    if (memberExpr.property?.type !== 'Identifier') {
        return false;
    }
    return true;
}
export function getConsoleMethodName(callee) {
    const property = callee.property;
    return property.name;
}
export function getErrorCtorName(callee) {
    if (!callee) {
        return null;
    }
    if (callee.type === 'Identifier') {
        return callee.name;
    }
    return null;
}
export function stringValueHasNewline(value) {
    return typeof value === 'string' && (value.includes('\n') || value.includes('\r'));
}
export function templateLiteralHasNewline(node) {
    if (!node || node.type !== 'TemplateLiteral') {
        return false;
    }
    const templateLit = node;
    for (const q of templateLit.quasis) {
        if (stringValueHasNewline(q.value?.raw) || stringValueHasNewline(q.value?.cooked)) {
            return true;
        }
    }
    return false;
}
export function consoleArgsContainContext(args) {
    if (!args || args.length === 0) {
        return false;
    }
    if (args.length >= 2) {
        return true;
    }
    const a0 = args[0];
    if (!a0) {
        return false;
    }
    // Template literal with expressions contains context
    if (a0.type === 'TemplateLiteral') {
        const templateLit = a0;
        // Only has context if there are expressions (interpolations)
        return templateLit.expressions.length > 0;
    }
    // Literal string has no context
    if (a0.type === 'Literal') {
        return false;
    }
    // Other types (objects, variables, etc.) have context
    return true;
}
export function isGenericConsoleMessage(text) {
    if (typeof text !== 'string') {
        return false;
    }
    const t = text.trim().toLowerCase();
    return (GENERIC_MESSAGE_PREFIXES.some((prefix) => t.startsWith(prefix)) ||
        t === 'done' ||
        t.includes('executed successfully'));
}
//# sourceMappingURL=utils.js.map