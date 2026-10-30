<!-- awesome-openspec-superpowers:start (managed by install.sh; re-running it replaces this block) -->

## OpenSpec + Superpowers: who owns what

OpenSpec owns **what and why**: one change folder per piece of work,
`openspec/changes/<id>/`. Superpowers owns **how**: test first, small tasks,
review. These are the user's instructions; Superpowers' own rule is that
CLAUDE.md / AGENTS.md take precedence over its skills.

**One design, one plan, one place.**
- The design conversation is `/opsx:explore` then `/opsx:propose`. Do not also
  run `superpowers:brainstorming` for the same work. If it triggers, treat the
  change folder as the spec it asks for: read the code first, never ask what the
  code answers, at most three questions before proposing approaches.
- The plan is the change's `tasks.md` (the `superpowers` OpenSpec schema writes it
  in Superpowers' plan format). Never write `docs/superpowers/specs/`,
  `docs/superpowers/plans/` or a second plan file.

**A human approves before code.** When the change is ready, stop. Summarise it in
under 150 words (what, why, scope, out of scope, open questions, the Mode in
`tasks.md`) and ask the human to review `openspec/changes/<id>/` and run
`! node .claude/osp/osp.mjs approve <id>`. A hook locks code files while a change
is unapproved, and again if its proposal, design, specs or tasks change after
approval. Never approve, bypass or write around it.

**Build by the Mode the human approved** (`/opsx:apply` carries the details):
`light` = one agent, test first, one review at the end; `standard` = a fresh
subagent per task with review; `thorough` = standard plus a whole-branch review.
Tick each `tasks.md` step as it passes. If the work needs behaviour the specs do
not describe, stop and update the spec; it goes back to the human.

**Workspace.** Worktree preference, declared: work in place on branch
`change/<id>`; create a worktree only if the human asks. Commit per task, planning
files with the code. `.superpowers/` is Superpowers' scratch space; leave it.

**Finish.** Full test suite green and shown, then `/opsx:archive` (the CLI merges
the delta specs into `openspec/specs/`), then
`superpowers:finishing-a-development-branch`.

**Quick fixes** (a typo, a one-line bug, a dependency bump) skip all of this when
no change is active: do it and say what you did. `/clear` between propose, apply
and archive is safe: everything lives on disk.

<!-- awesome-openspec-superpowers:end -->
