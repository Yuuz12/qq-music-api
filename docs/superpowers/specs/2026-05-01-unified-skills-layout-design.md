# Unified Skills Layout Design

## Background

The repository currently stores skills in multiple locations:

- `./.agents/skills/frontend-design/` holds the actual `frontend-design` skill files.
- `./.trae/skills/completion-rule/` holds a Trae-specific `completion-rule` skill.
- `./skills/frontend-design` is a symlink-style entry already referenced by `skills-lock.json`.

This fragmented layout makes it harder to share the same skill content across Trae, Claude, CodeBuddy, iFlow, and other agent platforms. The desired end state is a single canonical skill store under `./.skills/`, while platform-specific directories keep only lightweight indirection files that point to the shared skill location by relative path.

## Goals

1. Move all real skill content into `./.skills/<skill-name>/`.
2. Keep platform directories as compatibility layers only.
3. Allow platform-specific skill scanners to resolve the shared skills through relative-path declarations inside `SKILL.md`.
4. Preserve existing project-level skill discoverability and lockfile-based references.

## Non-Goals

- No changes to application runtime code under `src/`.
- No changes to test behavior unrelated to skill discovery.
- No attempt to redesign upstream `skills` CLI behavior.

## Current State

### Shared / external skill

- `./.agents/skills/frontend-design/SKILL.md`
- `./skills/frontend-design` currently points at the same underlying content through indirection.
- `skills-lock.json` references `skills/frontend-design/SKILL.md`.

### Trae-local skill

- `./.trae/skills/completion-rule/SKILL.md`
- `./.trae/skills/completion-rule/references/*.md`

### Problem summary

- The repository has more than one source-of-truth for skill content.
- Some platforms can reuse shared skill content, but others still depend on platform-local layout.
- The current layout does not express a clean, canonical shared directory.

## Proposed Architecture

### Canonical storage

Create `./.skills/` as the only source-of-truth for skill content:

- `./.skills/frontend-design/`
- `./.skills/completion-rule/`

Each skill directory contains the full skill payload, including `SKILL.md`, `LICENSE.txt`, and any nested `references/` files.

### Platform compatibility directories

Keep platform directories such as:

- `./.trae/skills/`
- `./.agents/skills/`
- future directories for Claude, CodeBuddy, iFlow, or similar platforms

Each platform skill directory keeps only a thin `SKILL.md` shim. The shim does not duplicate the real skill content. Instead, it declares the relative path to the canonical file under `./.skills/`.

Example target shape:

- `./.trae/skills/frontend-design/SKILL.md` → points to `../../../.skills/frontend-design/SKILL.md`
- `./.agents/skills/frontend-design/SKILL.md` → points to `../../../.skills/frontend-design/SKILL.md`
- `./.trae/skills/completion-rule/SKILL.md` → points to `../../../.skills/completion-rule/SKILL.md`

If a platform requires additional metadata in its own directory, that metadata stays local, but the canonical skill body remains in `./.skills/`.

### Project-visible skill entry

Retain a project-visible skill entry path for lockfile compatibility. The cleanest approach is to keep `./skills/<name>/SKILL.md` as a project-facing shim that also points to `./.skills/<name>/SKILL.md`.

This preserves compatibility with `skills-lock.json` while still making `./.skills/` the canonical source.

## Data Flow

1. A platform scans its conventional skill directory.
2. The platform reads the local thin `SKILL.md`.
3. The thin file declares a relative path to the canonical skill in `./.skills/`.
4. The platform resolves that path and loads the shared skill definition.

This model ensures that all platforms consume one source-of-truth while preserving their expected entry directories.

## File Migration Plan

### `frontend-design`

Move the actual content from `./.agents/skills/frontend-design/` into:

- `./.skills/frontend-design/SKILL.md`
- `./.skills/frontend-design/LICENSE.txt`

Then replace the following entries with thin wrappers:

- `./.agents/skills/frontend-design/SKILL.md`
- `./.trae/skills/frontend-design/SKILL.md`
- `./skills/frontend-design/SKILL.md`

### `completion-rule`

Move the actual content from `./.trae/skills/completion-rule/` into:

- `./.skills/completion-rule/SKILL.md`
- `./.skills/completion-rule/references/go.md`
- `./.skills/completion-rule/references/java.md`
- `./.skills/completion-rule/references/python.md`
- `./.skills/completion-rule/references/typescript.md`

Then keep `./.trae/skills/completion-rule/SKILL.md` as a thin wrapper.

If future platforms also need `completion-rule`, they can add their own wrapper directories without copying content.

## Configuration Changes

### Lockfile

Update `skills-lock.json` so the stored `skillPath` reflects the desired project-facing entry model.

Preferred choice:

- keep `skillPath` as `skills/frontend-design/SKILL.md`

Reason:

- it preserves compatibility with existing tooling expectations;
- it avoids forcing the lockfile to point at a hidden directory;
- the `skills/` entry becomes a stable façade over the canonical `./.skills/` source.

## Error Handling

- If a wrapper `SKILL.md` points to a missing canonical path, the skill should fail fast with a clear missing-target error.
- Wrapper files must use repository-relative paths that remain valid after checkout on different machines.
- References nested under `completion-rule` must remain resolvable from the canonical directory layout.

## Testing Strategy

1. Verify file presence under `./.skills/`.
2. Verify wrapper `SKILL.md` files exist under `./.trae/skills/`, `./.agents/skills/`, and `./skills/` where applicable.
3. Verify the relative target paths are correct.
4. Re-run `npx skills ls --json` to ensure project-level skill listing still works for installed shared skills.
5. Manually inspect that `completion-rule` reference files remain intact after migration.

## Trade-offs

### Advantages

- One source-of-truth for all skills.
- Cleaner onboarding for additional platforms.
- Lower duplication risk.
- Easier future automation for syncing or validation.

### Costs

- Requires all wrappers to follow a stable relative-path convention.
- Some third-party tooling may not understand wrapper semantics unless it already supports path indirection in `SKILL.md`.
- Existing symlink-based assumptions may need to be normalized into file-based wrappers.

## Open Assumption

This design assumes the relevant platforms can load a skill after reading a local `SKILL.md` that points to a canonical relative target. If any platform requires physical inline content instead of a wrapper convention, that platform would need a specific compatibility exception. For the current implementation, the requested direction is to standardize on wrapper files rather than duplicated copies.

## Recommended Implementation Order

1. Create canonical `./.skills/` directories.
2. Move actual skill payloads there.
3. Replace platform-local skill files with wrapper `SKILL.md` files.
4. Update `skills-lock.json` only if needed to preserve project-level listing behavior.
5. Validate directory layout and skill listing commands.
