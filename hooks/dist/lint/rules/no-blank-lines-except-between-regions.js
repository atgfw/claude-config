import { REGION_START_RE, REGION_END_RE } from '../utils.js';
const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow blank lines unless they occur strictly between // #endregion and the next // #region.',
        },
        schema: [],
        messages: {
            blankLine: 'Blank lines are only allowed strictly between "// #endregion" and the next "// #region".',
        },
    },
    create(context) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        const lines = sourceCode.getText().split(/\r?\n/);
        function isRegionStartLine(line) {
            return REGION_START_RE.test(line);
        }
        function isRegionEndLine(line) {
            return REGION_END_RE.test(line);
        }
        return {
            Program(node) {
                for (let idx = 0; idx < lines.length; idx += 1) {
                    const current = lines[idx];
                    if (current === undefined || current.trim() !== '') {
                        continue;
                    }
                    const prev = idx > 0 ? lines[idx - 1] : null;
                    const next = idx + 1 < lines.length ? lines[idx + 1] : null;
                    const ok = prev !== null &&
                        prev !== undefined &&
                        next !== null &&
                        next !== undefined &&
                        isRegionEndLine(prev.trim()) &&
                        isRegionStartLine(next.trim());
                    if (!ok) {
                        context.report({
                            node,
                            messageId: 'blankLine',
                            loc: {
                                start: { line: idx + 1, column: 0 },
                                end: { line: idx + 1, column: 0 },
                            },
                        });
                    }
                }
            },
        };
    },
};
export default rule;
//# sourceMappingURL=no-blank-lines-except-between-regions.js.map