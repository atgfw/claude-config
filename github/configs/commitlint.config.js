/**
 * Commitlint Configuration
 * Enforces Conventional Commits 1.0.0 standard
 *
 * Usage:
 *   Copy this file to your project root as commitlint.config.js
 *   Install: npm install -D @commitlint/cli @commitlint/config-conventional
 *   Add to package.json scripts: "commitlint": "commitlint --edit"
 */

module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Type must be one of the allowed values
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature (MINOR bump)
        "fix", // Bug fix (PATCH bump)
        "docs", // Documentation only
        "style", // Formatting, no code change
        "refactor", // Code change, no feature/fix
        "perf", // Performance improvement (PATCH bump)
        "test", // Adding/updating tests
        "build", // Build system/dependencies
        "ci", // CI configuration
        "chore", // Maintenance tasks
      ],
    ],
    // Type must be lowercase
    "type-case": [2, "always", "lower-case"],
    // Type cannot be empty
    "type-empty": [2, "never"],
    // Scope must be lowercase
    "scope-case": [2, "always", "lower-case"],
    // Subject cannot be empty
    "subject-empty": [2, "never"],
    // Subject should not end with period
    "subject-full-stop": [2, "never", "."],
    // Subject should be in sentence case (first letter lowercase)
    "subject-case": [2, "always", "sentence-case"],
    // Header should not exceed 72 characters
    "header-max-length": [2, "always", 72],
    // Body should wrap at 100 characters
    "body-max-line-length": [1, "always", 100],
    // Footer should wrap at 100 characters
    "footer-max-line-length": [1, "always", 100],
  },
  // Help text for failed commits
  helpUrl: "https://www.conventionalcommits.org/",
};
