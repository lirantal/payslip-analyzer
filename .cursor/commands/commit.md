---
description: Commit and push the code changes
argument-hint: [agent]
model: opus
---

Commit your changes based on the guidelines provided

## Guidelines

- You only stage to git the files with the changes that you made in this particular session
- Always before committing, if these code-checks exist for the project you ru them: lint, type checks, and build. If you found any issues from any of the lint, type-checking or build then fix them, then re-stage the changes.
- Your commit message format should follow conventional commits such as `<type>(<scope>): <subject>` and then followed with a sumary of the changes in the commit body
- Once commit is successful push the changes to the HEAD branch such as `git push origin HEAD`