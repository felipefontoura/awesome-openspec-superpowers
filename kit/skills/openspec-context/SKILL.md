---
name: openspec-context
description: Prepare an existing codebase for OpenSpec + Superpowers by writing the project context every proposal and plan will read (stack, commands, conventions, boundaries, the domains the code already has) into openspec/config.yaml. Use once when adopting OpenSpec on a brownfield repo, or when the user says "openspec context", "set up openspec for this repo", "existing project", "brownfield", or proposals keep ignoring the project's conventions.
---

# OpenSpec context for an existing codebase

OpenSpec's own guidance for existing projects: do not back-fill specs for code
you are not changing; specs grow one change at a time. What every change does
need from day one is context: the facts an agent cannot infer quickly, so the
first proposal fits the codebase instead of a generic template. OpenSpec reads
it from the `context:` field of `openspec/config.yaml` on every artifact and on
apply. This skill writes that field. It writes no specs.

## Steps

1. **Read before asking.** Look at the manifest files (package.json,
   pyproject.toml, go.mod, Cargo.toml, Gemfile, composer.json, pom.xml…), the
   lockfile, CI config (`.github/workflows/`, `.gitlab-ci.yml`), test config,
   linters and formatters, `README`, `CONTRIBUTING`, existing `AGENTS.md` /
   `CLAUDE.md`, and the top two levels of the source tree. Run nothing that
   writes or installs.

2. **Find the commands that prove a change works.** The exact test, lint,
   typecheck and build commands, and how to run a single test. Prefer what CI
   runs. If you can run the test command safely and quickly, run it once and
   note whether it passes today.

3. **Draft the context**, at most 25 lines, only facts an agent would get wrong
   or waste time finding:
   - Stack and versions that constrain choices (runtime, framework, database)
   - Commands: test (all and single), lint, typecheck, build
   - Conventions the code follows that a newcomer would break (layering, naming,
     error handling, where tests live, how migrations are made)
   - Boundaries: generated code, vendored folders, public APIs that must stay
     compatible, files never to edit
   - Domains: the 3 to 8 areas the code already divides into (folder or module
     names), which become the `openspec/specs/<domain>/` names when changes
     touch them
   Leave out anything discoverable in one file read, and anything aspirational.

4. **Show the draft to the human** with the evidence for each line (the file it
   came from). Ask what is wrong or missing. Do not write until they agree.

5. **Write it** into `openspec/config.yaml` as `context: |` (replace an existing
   `context:` block only with their OK). Then run `openspec validate --all` if
   any changes or specs exist, and report the result.

6. **Suggest the first change**: one small, real change they need this week,
   started with `/opsx:explore` on the area it touches. Not a rewrite, not a
   back-fill.
