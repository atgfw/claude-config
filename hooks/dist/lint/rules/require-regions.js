import { REGION_START_RE, REGION_START_BARE_RE, REGION_END_RE, REGION_END_WITH_NAME_RE, reportAtLine, } from '../utils.js';
const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Require VSCode-style // #region Name and // #endregion blocks; enforce pairing and forbid names on #endregion.',
        },
        schema: [],
        messages: {
            missingAny: 'File must contain at least one "// #region <Name>" block.',
            regionMissingName: '"// #region" must include a RegionName on the same line.',
            endHasName: '"// #endregion" must NOT include a RegionName.',
            endWithoutStart: '"// #endregion" has no matching preceding "// #region".',
            startWithoutEnd: '"// #region {{name}}" has no matching subsequent "// #endregion".',
        },
    },
    create(context) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        const lines = sourceCode.getText().split(/\r?\n/);
        return {
            Program(node) {
                const stack = [];
                let sawRegion = false;
                for (let idx = 0; idx < lines.length; idx += 1) {
                    const line = lines[idx];
                    if (line === undefined) {
                        continue;
                    }
                    if (REGION_END_WITH_NAME_RE.test(line)) {
                        reportAtLine(context, idx + 1, 'endHasName');
                        continue;
                    }
                    // Check for region without name first
                    if (REGION_START_BARE_RE.test(line)) {
                        sawRegion = true;
                        reportAtLine(context, idx + 1, 'regionMissingName');
                        continue;
                    }
                    const startMatch = line.match(REGION_START_RE);
                    if (startMatch) {
                        sawRegion = true;
                        const regionName = startMatch[1] ?? '';
                        if (!regionName || regionName.trim().length === 0) {
                            reportAtLine(context, idx + 1, 'regionMissingName');
                        }
                        else {
                            stack.push({ name: regionName.trim(), line: idx + 1 });
                        }
                        continue;
                    }
                    if (REGION_END_RE.test(line)) {
                        sawRegion = true;
                        if (stack.length === 0) {
                            reportAtLine(context, idx + 1, 'endWithoutStart');
                        }
                        else {
                            stack.pop();
                        }
                    }
                }
                if (!sawRegion) {
                    context.report({ node, messageId: 'missingAny' });
                }
                for (const unclosed of stack) {
                    context.report({
                        node,
                        messageId: 'startWithoutEnd',
                        data: { name: unclosed.name },
                        loc: {
                            start: { line: unclosed.line, column: 0 },
                            end: { line: unclosed.line, column: 0 },
                        },
                    });
                }
            },
        };
    },
};
export default rule;
//# sourceMappingURL=require-regions.js.map