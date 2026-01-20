# Spec: Repository Templates

**Capability:** repository-templates
**Scope:** Global inheritance from Spinal Cord

## Required Files

Every repository must have:

| File | Purpose |
|------|---------|
| `README.md` | Project documentation |
| `LICENSE` | License (default: MIT) |
| `CONTRIBUTING.md` | Contribution guidelines |
| `PROJECT-DIRECTIVE.md` | Project-specific rules |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template |

## Templates Location

```
~/.claude/github/templates/
    +-- README.template.md
    +-- CONTRIBUTING.template.md
    +-- PR_TEMPLATE.md
    +-- ISSUE_TEMPLATE/
        +-- bug_report.md
        +-- feature_request.md
```

## README Template

```markdown
# {{PROJECT_NAME}}

{{DESCRIPTION}}

## Installation

\`\`\`bash
{{INSTALL_COMMAND}}
\`\`\`

## Usage

\`\`\`{{LANGUAGE}}
{{USAGE_EXAMPLE}}
\`\`\`

## Development

\`\`\`bash
{{DEV_SETUP}}
\`\`\`

## License

{{LICENSE_TYPE}}
```

## CONTRIBUTING Template

```markdown
# Contributing to {{PROJECT_NAME}}

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

Format: `type(scope): description`

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore

## Branch Naming

- `feature/<description>` - New features
- `bugfix/<description>` - Bug fixes
- `hotfix/<description>` - Urgent fixes
- `docs/<description>` - Documentation

## Pull Request Process

1. Create branch from `main`
2. Make changes with conventional commits
3. Push and create PR
4. Pass all checks
5. Get review approval
6. Squash and merge
```

## PR Template

```markdown
## Summary

<!-- Brief description of changes -->

## Type

- [ ] Feature (new functionality)
- [ ] Bug fix (non-breaking change)
- [ ] Breaking change
- [ ] Documentation
- [ ] Refactoring
- [ ] Performance improvement

## Testing

<!-- How was this tested? -->

## Checklist

- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
```

## Global Inheritance

Child projects inherit templates from Spinal Cord:
1. On project init, copy templates to `.github/`
2. `pre_build_gate` verifies required files exist
3. Templates can be customized per-project
