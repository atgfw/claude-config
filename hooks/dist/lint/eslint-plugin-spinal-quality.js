import asciiOnly from './rules/ascii-only.js';
import requireRegions from './rules/require-regions.js';
import noBlankLinesExceptBetweenRegions from './rules/no-blank-lines-except-between-regions.js';
import noNestedFunctionDeclarations from './rules/no-nested-function-declarations.js';
import catchThrowOnly from './rules/catch-throw-only.js';
import noMultilineErrorMessage from './rules/no-multiline-error-message.js';
import noEmptyConsoleMessage from './rules/no-empty-console-message.js';
import consoleMessageRequiresContext from './rules/console-message-requires-context.js';
import noGenericConsoleMessages from './rules/no-generic-console-messages.js';
import multilineCallArgsOver3 from './rules/multiline-call-args-over-3.js';
import forLoopVariableI from './rules/for-loop-variable-i.js';
import noBannedIdentifiers from './rules/no-banned-identifiers.js';
export const rules = {
    'ascii-only': asciiOnly,
    'require-regions': requireRegions,
    'no-blank-lines-except-between-regions': noBlankLinesExceptBetweenRegions,
    'no-nested-function-declarations': noNestedFunctionDeclarations,
    'catch-throw-only': catchThrowOnly,
    'no-multiline-error-message': noMultilineErrorMessage,
    'no-empty-console-message': noEmptyConsoleMessage,
    'console-message-requires-context': consoleMessageRequiresContext,
    'no-generic-console-messages': noGenericConsoleMessages,
    'multiline-call-args-over-3': multilineCallArgsOver3,
    'for-loop-variable-i': forLoopVariableI,
    'no-banned-identifiers': noBannedIdentifiers,
};
const plugin = {
    meta: {
        name: 'eslint-plugin-spinal-quality',
        version: '1.0.0',
    },
    rules,
};
export default plugin;
//# sourceMappingURL=eslint-plugin-spinal-quality.js.map