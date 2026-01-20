/**
 * Semantic Release Configuration
 * Automates versioning and changelog generation
 *
 * Usage:
 *   Copy this file to your project root as release.config.js
 *   Install: npm install -D semantic-release @semantic-release/changelog @semantic-release/git
 *   Run: npx semantic-release
 */

module.exports = {
  branches: ["main", "master"],
  plugins: [
    // Analyze commits to determine version bump
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          // Breaking changes -> MAJOR
          { breaking: true, release: "major" },
          // Features -> MINOR
          { type: "feat", release: "minor" },
          // Fixes and performance -> PATCH
          { type: "fix", release: "patch" },
          { type: "perf", release: "patch" },
          // Documentation and style changes don't trigger release
          { type: "docs", release: false },
          { type: "style", release: false },
          { type: "refactor", release: false },
          { type: "test", release: false },
          { type: "build", release: false },
          { type: "ci", release: false },
          { type: "chore", release: false },
        ],
      },
    ],
    // Generate release notes
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          types: [
            { type: "feat", section: "Features" },
            { type: "fix", section: "Bug Fixes" },
            { type: "perf", section: "Performance Improvements" },
            { type: "revert", section: "Reverts" },
            { type: "docs", section: "Documentation", hidden: true },
            { type: "style", section: "Styles", hidden: true },
            { type: "chore", section: "Miscellaneous Chores", hidden: true },
            { type: "refactor", section: "Code Refactoring", hidden: true },
            { type: "test", section: "Tests", hidden: true },
            { type: "build", section: "Build System", hidden: true },
            { type: "ci", section: "Continuous Integration", hidden: true },
          ],
        },
      },
    ],
    // Update CHANGELOG.md
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
        changelogTitle:
          "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).",
      },
    ],
    // Update package.json version and commit changes
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json", "package-lock.json"],
        message:
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    // Create GitHub release
    "@semantic-release/github",
  ],
};
