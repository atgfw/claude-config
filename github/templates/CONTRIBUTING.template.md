# Contributing to {{PROJECT_NAME}}

Thank you for your interest in contributing!

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

### Suggesting Features

1. Check existing issues for similar suggestions
2. Create a new issue with:
   - Clear description of the feature
   - Use case and motivation
   - Possible implementation approach

### Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Write or update tests
5. Update documentation if needed
6. Submit a pull request

## Development Setup

```bash
git clone {{REPO_URL}}
cd {{PROJECT_NAME}}
npm install
npm test
```

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | MINOR |
| `fix` | Bug fix | PATCH |
| `docs` | Documentation only | None |
| `style` | Formatting, no code change | None |
| `refactor` | Code change, no feature/fix | None |
| `perf` | Performance improvement | PATCH |
| `test` | Adding/updating tests | None |
| `build` | Build system/dependencies | None |
| `ci` | CI configuration | None |
| `chore` | Maintenance tasks | None |

### Breaking Changes

Add `!` after type or include `BREAKING CHANGE:` in footer:

```
feat!: remove deprecated API endpoint

feat(api): change response format

BREAKING CHANGE: Response is now an object instead of array
```

## Branch Naming

Use these prefixes:

- `feature/<description>` - New features
- `bugfix/<description>` - Bug fixes
- `hotfix/<description>` - Urgent fixes
- `release/<description>` - Release prep
- `chore/<description>` - Maintenance
- `docs/<description>` - Documentation

Examples:
- `feature/add-user-auth`
- `bugfix/fix-login-redirect`
- `docs/update-api-reference`

## Code Style

- Run linter before committing: `npm run lint`
- Run formatter: `npm run format`
- Ensure tests pass: `npm test`

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the CHANGELOG.md if applicable
3. The PR will be merged once you have approval from maintainers
