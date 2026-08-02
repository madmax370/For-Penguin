# Terminal Execution Requirement

Before making any changes, use the terminal to execute the required commands.

**Do not** merely suggest or describe commands. Execute them whenever the environment allows.

## Terminal Execution Rules

* Execute every required terminal command.
* Show the complete terminal output exactly as produced.
* Never summarize, truncate, or fabricate terminal output.
* Do not claim a command succeeded unless its output confirms success.
* If a command fails, display the complete error output before explaining the issue.
* If terminal execution is unavailable in the current environment, explicitly state that commands cannot be executed instead of inventing output.

---

# Git Workflow Requirements

Git tasks are **not complete** until the requested changes are successfully pushed to the remote repository, unless the user explicitly instructs otherwise.

Whenever a task involves Git:

1. Verify the current repository.
2. Verify the current branch.
3. Check repository status.
4. Make the requested changes.
5. Review the diff.
6. Commit the changes.
7. Push the commit to the appropriate remote branch.
8. Verify that the push completed successfully.

A task that includes committing code **must not stop after the commit**.

If a commit exists locally but has not been pushed, continue by pushing it.

Do not assume the task is complete until the push succeeds or the user explicitly asks you not to push.

---

# Required Git Verification

Before editing files, execute:

* `pwd`
* `git status`
* `git branch --show-current`
* `git remote -v`

Confirm:

* you are inside the correct repository
* you are on the expected branch
* the repository is clean or understand existing changes
* the correct remote exists

---

# Required Pre-Commit Validation

Before creating any commit:

* Review changes using `git diff`.
* Ensure only intended files were modified.
* Confirm no temporary or generated files are accidentally included.
* Run available validation tools whenever appropriate (tests, build, lint, formatting, type checks, etc.).
* If validation cannot be performed, explicitly state why.

---

# Required Push Verification

After pushing:

Execute commands that verify the push, such as:

* `git status`
* `git log --oneline --decorate -n 5`
* `git rev-parse HEAD`

If possible, also verify:

* local branch is up to date with its upstream
* working tree is clean
* no commits remain unpushed

Do not state that work is finished until these checks succeed.

---

# Git Identity and Attribution Requirements

For every Git commit and push:

* Use only my configured Git identity.
* Do not modify Git author configuration.
* Do not add any `Co-authored-by` trailers.
* Do not include AI attribution.
* Do not include automatic attribution lines.
* Ensure both author and committer identities belong only to my configured Git account.

---

# CRITICAL: Commit Identity & Co-Author Prohibition

**NEVER** include a `Co-authored-by` trailer in any commit message.
**NEVER** use `git commit --amend` unless explicitly instructed to rewrite history.
**ALWAYS** ensure the commit author is strictly the configured global user.

## Mandatory Pre-Commit Protocol

Before running ANY `git commit` command, you MUST execute the following sequence to guarantee identity purity:

1. **Force Identity Reset**:
   ```bash
   git config user.name "$(git config --global user.name)"
   git config user.email "$(git config --global user.email)"
   ```
   *(This overrides any repo-specific or cached bot identities)*

2. **Standard Commit Only**:
   Use ONLY `git commit -m "message"`. 
   - Do NOT add trailers.
   - Do NOT use `--amend`.
   - Do NOT use `-s` (sign-off) unless requested.

3. **Verification Step**:
   After committing, you MUST verify the author before pushing:
   ```bash
   git log -1 --format="%an <%ae>"
   ```
   If the output does NOT match the global user exactly, **ABORT** the push, reset the commit (`git reset --soft HEAD~1`), and retry the protocol.

## Violation Consequence

If a commit is pushed with a `Co-authored-by` line or wrong author:
1. It is considered a **failed task**.
2. You must immediately guide the user to rewrite the history (`git commit --amend --reset-author`) and force push (`git push --force-with-lease`).

---

# Command Output Requirements

For every terminal command:

1. Execute the actual command.
2. Show the complete terminal output.
3. Never replace output with descriptions.
4. Never omit warnings or errors.
5. Explain the result only after presenting the output.

Never fabricate logs, command output, or execution results.

---

# Safety Rules

Do not execute destructive operations unless explicitly requested.

This includes, but is not limited to:

* `git reset --hard`
* `git clean -fd`
* `git push --force`
* force-push variants
* branch deletion
* history rewriting
* deleting files outside the requested scope

If a destructive action appears necessary, ask for confirmation first.

---

# Coding Agent Best Practices

## Repository Awareness

* Verify the current repository before making changes.
* Verify the active branch before editing.
* Confirm file paths before modifying files.
* Avoid editing unrelated files.

## Editing

* Keep modifications minimal and focused.
* Preserve existing formatting and coding style.
* Avoid unnecessary refactoring.
* Respect project conventions.
* Do not reorder unrelated code.

## Validation

Before committing:

* Review `git diff`.
* Run relevant tests when available.
* Run linting if configured.
* Run formatting if configured.
* Verify builds when appropriate.
* Report any validation failures with complete command output.

## Commit Quality

* Keep commits focused on one logical change.
* Write clear commit messages.
* Avoid unrelated changes in the same commit.
* Never leave intended modifications uncommitted.

## Push Policy

If the task involves Git changes:

* Commit the work.
* Push the commit.
* Verify the push.
* Do not stop after creating a local commit.
* Report the branch name and pushed commit hash after a successful push.

## Communication

* Report blockers immediately.
* Include complete terminal output for failed commands.
* Ask for clarification when requirements are ambiguous.
* Never guess missing requirements.
* Never invent execution results.

## Completion Checklist

Before declaring a task complete, confirm that:

* Repository verified
* Correct branch verified
* Requested files updated
* Changes reviewed
* Validation completed (or reason provided)
* Commit created (if requested)
* Commit pushed successfully (unless the user requested otherwise)
* Working tree status verified
* No unpushed commits remain
