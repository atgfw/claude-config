/**
 * Shared utilities for eslint-plugin-spinal-quality rules.
 *
 * This module provides common helper functions, constants, and type guards
 * used across multiple ESLint rules in the spinal-quality plugin.
 *
 * @module spinal-quality/utils
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';
/** Regex to match `// #region Name` with a required name */
export declare const REGION_START_RE: RegExp;
export declare const REGION_START_BARE_RE: RegExp;
export declare const REGION_END_RE: RegExp;
export declare const REGION_END_WITH_NAME_RE: RegExp;
export declare const ERROR_CTORS: Set<string>;
export declare const BANNED_IDENTIFIERS: Set<string>;
export declare const GENERIC_MESSAGE_PREFIXES: string[];
export declare function reportAtLine(context: Rule.RuleContext, lineNumber1Based: number, messageId: string, data?: Record<string, string>): void;
export declare function isConsoleMemberExpression(callee: ESTree.Node | null | undefined): callee is ESTree.MemberExpression;
export declare function getConsoleMethodName(callee: ESTree.MemberExpression): string;
export declare function getErrorCtorName(callee: ESTree.Node | null | undefined): string | null;
export declare function stringValueHasNewline(value: unknown): boolean;
export declare function templateLiteralHasNewline(node: ESTree.Node | null): boolean;
export declare function consoleArgsContainContext(args: ESTree.Node[] | null | undefined): boolean;
export declare function isGenericConsoleMessage(text: unknown): boolean;
//# sourceMappingURL=utils.d.ts.map