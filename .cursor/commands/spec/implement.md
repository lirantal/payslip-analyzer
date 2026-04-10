---
description: Implement plan
argument-hint: [agent]
model: opus
---

## Your Mission

Implement the plan you are given by the user or any instructions provided by the user. If requirements are unclear to you and/or ambigious, ask for clarifications before continuing with implementation.

## Prerequisites

- **Planning**: If you are given a plan reference, or if a plan exists for this slice you are told to follow (created via `/plan-slice`), follow it. If no plan exists and the slice is complex, consider creating one first.
- **Memory Graph**: Read the memory graph to understand current project state and what has been implemented.

## Guidelines

Review Backend and Frontend Development Guidelines and Workflows so you know how to operate these services, and debug them.

### Before implementing, review:
- [ ] Any existing plan document reference
- [ ] Existing patterns in similar features (check how previous plans and/or implementation did it)
- [ ] Component naming conventions in @frontend/.cursor/rules/nuxt_component_best_practices.mdc
- [ ] Database schema conventions in existing schema files
- [ ] API response schema patterns in test harness

### Code Design Principles

**Design for modularity and testability:**
- Each file should have a clear, single responsibility
- If a file is growing large, pause and consider splitting into focused modules
- Complex logic should be extracted into separate, testable units
- Follow existing patterns in the codebase for file organization

**Avoid premature abstraction:**
- Don't create utilities or helpers for one-time operations
- Don't add layers of indirection "just in case"
- Match the abstraction level of similar features in the codebase
- When in doubt, keep it simple and inline

**Incremental implementation:**
- Implement and verify one logical unit at a time
- Run typecheck after each new file before moving to the next
- For complex features, test intermediate states in the browser

### Considerations for implementation:
**Handling complex code changes**:
- Per your judgement: for complex slices of work which may require complicated components, test after each major frontend component. For example: "after implementing the upload dropzone component, I should test it in the browser before moving to the next component"

**Database migrations:**
- Generate migrations with `drizzle-kit generate`
- Do NOT apply migrations (`drizzle-kit push`) until:
  1. All related code files are complete
  2. Typecheck passes
  3. You've confirmed the schema looks correct
- Migrations are hard to undo - treat them as a final step

### After implementing all tasks:
1. Test the feature in the browser
2. Verify the happy path works (create, read, update, delete, or other relevant workflow)
3. Check browser console for errors/warnings
4. If issues found, debug and fix before completing

### Your Definition of Done:
- [ ] All code implemented per spec
- [ ] Backend: lint passes, typecheck passes, tests pass
- [ ] Frontend: lint passes, typecheck passes, tests pass
- [ ] Database migrations applied to dev environment
- [ ] Browser smoke test completed
- [ ] No console errors/warnings
- [ ] Memory graph updated with implementation details

## When implementation completed successfully:
- Provides a summary of changes and what was implemented
- Provide instructions for how to verify and test the changes per the demo checkpoint