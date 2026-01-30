# Spec Delta: session-start-sync

**Capability:** `session-start-sync`
**Change ID:** `add-github-issue-tracking-system`

## MODIFIED Requirements

### Requirement: Session start auto-commits and pushes ~/.claude repo

After all existing session start steps complete, the system MUST add Step 9: auto-commit and push. Stages `ledger/`, `openspec/`, `hooks/dist/`. Commits with `chore(sync): session state sync`. Pulls with rebase before push.

**Non-blocking:** Push failures log `[!] Push failed: <reason>` but do not block session startup.

#### Scenario: Clean push succeeds

Given there are uncommitted changes in `ledger/`
When session start Step 9 runs
Then changes are committed with message `chore(sync): session state sync`
And `git push origin main` succeeds
And log shows `[+] Session state pushed`

#### Scenario: No changes to push

Given no uncommitted changes exist
When session start Step 9 runs
Then no commit is created
And log shows nothing (skip obvious success)

#### Scenario: Push fails gracefully

Given the remote is unreachable
When session start Step 9 runs
Then log shows `[!] Push failed: remote unreachable`
And session startup continues normally

#### Scenario: Merge conflict on pull

Given local and remote have diverged
When `git pull --rebase` fails
Then log shows `[!] Rebase conflict, skipping push`
And session startup continues normally

### Requirement: Session start triggers issue sync

After auto-push, the system MUST run task source sync to reconcile GitHub issues with local state.

#### Scenario: Sync runs after push

Given session start Step 9 completes (success or failure)
When Step 10 runs
Then `gh issue list --json` is fetched and reconciled with sync registry
