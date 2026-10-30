<a id="readme-top"></a>

<div align="center">

# Awesome OpenSpec + Superpowers

**Use [OpenSpec](https://github.com/Fission-AI/OpenSpec) and [Superpowers](https://github.com/obra/superpowers) together, without two plans, two brainstorms, or an agent that codes before you approve.**

One command wires them in your repo: OpenSpec owns *what and why*, Superpowers owns *how*,
one `tasks.md` is both the task list and the plan, and a hook keeps the code locked until a
human approves the change. Built from the complaints in both projects' issues, tested
against their current releases every week.

[![CI](https://github.com/felipefontoura/awesome-openspec-superpowers/actions/workflows/ci.yml/badge.svg)](https://github.com/felipefontoura/awesome-openspec-superpowers/actions/workflows/ci.yml)
[![OpenSpec](https://img.shields.io/badge/OpenSpec-1.15-5D564B.svg)](https://github.com/Fission-AI/OpenSpec/releases)
[![Superpowers](https://img.shields.io/badge/Superpowers-7.0-5D564B.svg)](https://github.com/obra/superpowers/releases)
[![Claude Code](https://img.shields.io/badge/Claude_Code-ready-AD7A14.svg)](https://code.claude.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-B3A896.svg)](LICENSE)

[Install](#install)
·
[What it fixes](#what-it-fixes)
·
[How a change flows](#how-a-change-flows)
·
[**Free SDD book**](https://felipefontoura.com/get/sdd-book/?utm_source=github&utm_medium=referral&utm_campaign=awesome-openspec-superpowers&utm_content=readme)
·
[Resources](#resources)
·
[Report a bug](https://github.com/felipefontoura/awesome-openspec-superpowers/issues/new)

</div>

## Install

In the root of a git repo, with Node 20+ and [Claude Code](https://code.claude.com):

```bash
curl -fsSL https://raw.githubusercontent.com/felipefontoura/awesome-openspec-superpowers/main/install.sh | bash
```

It runs `openspec init` if you have no `openspec/` yet (through `npx` if OpenSpec is not
installed), then adds five things, all fenced so a re-run replaces them in place:

| File | What it does |
| --- | --- |
| `openspec/schemas/superpowers/` | An OpenSpec schema built from **your installed version's** `spec-driven`, with the tasks artifact and the apply step replaced. Proposal, specs and design stay upstream's. |
| `AGENTS.md` (imported by `CLAUDE.md`) | Who owns what. Superpowers' own rule is that CLAUDE.md / AGENTS.md beat its skills, so this is where its defaults get redirected, without a fork. |
| `openspec/config.yaml` | `schema: superpowers`, proposal rules (out of scope, open questions), archive through the CLI. |
| `.claude/osp/` + `.claude/settings.json` | The approval gate (a `PreToolUse` hook, zero dependencies) and Superpowers enabled **for this project**, so teammates who clone it get the same setup. |
| `.claude/skills/openspec-context/` | `/openspec-context`: writes the project context an existing codebase needs, without back-filling specs. |

Then install Superpowers once if you do not have it (`--with-superpowers` does this for you):

```text
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

Upgraded OpenSpec? Run the installer again; it rebuilds the schema from the new version.

## What it fixes

Every row is a complaint people filed or wrote about, with what this repo does about it.
👍 counts are from 2026-10-29.

| Complaint | Where people raised it | What this repo does |
| --- | --- | --- |
| **"Two planning systems, two sources of truth."** Brainstorm vs propose, `docs/superpowers/plans/` vs `tasks.md`, progress tracked in two files. | [OpenSpec #780](https://github.com/Fission-AI/OpenSpec/issues/780) (45 👍), [#973](https://github.com/Fission-AI/OpenSpec/issues/973), [#859](https://github.com/Fission-AI/OpenSpec/issues/859), [Superpowers #831](https://github.com/obra/superpowers/issues/831), [austinxyz](https://austinxyz.github.io/blogs/blog/openspec-superpowers-combined), [heyuan110](https://www.heyuan110.com/posts/ai/2026-06-28-openspec-superpowers-workflow/) | One design conversation (`/opsx:explore` → `/opsx:propose`). **One `tasks.md` that is both OpenSpec's task list and Superpowers' plan**: `### Task N:` headings Superpowers' executor reads, `- [ ]` steps OpenSpec counts. No `docs/superpowers/`. |
| **The agent codes before anyone approved the spec.** Neither tool has a hard gate; OpenSpec only checks that artifacts exist. | OpenSpec's [schema catalog](https://github.com/Fission-AI/OpenSpec/blob/main/docs/customization.md) ("OpenSpec only checks that artifacts exist, so enforce the gate with your own CI or hook"), [devcxl](https://devcxl.cn/en-us/blog/openspec-vs-superpowers-comparison/), [HN](https://news.ycombinator.com/item?id=49734264) | A hook locks code files while an active change is unapproved. Only a human can approve (`! node .claude/osp/osp.mjs approve <id>`); the agent is blocked from doing it. Editing the proposal, specs, design or tasks after approval **locks the code again**. Ticking boxes does not. |
| **Token cost and slowness.** "20 minutes to write 2 loc", "burned the whole 5h budget". | [Superpowers #743](https://github.com/obra/superpowers/issues/743) (32 👍), [#1152](https://github.com/obra/superpowers/issues/1152), [#1120](https://github.com/obra/superpowers/issues/1120) (17 👍), [HN](https://news.ycombinator.com/item?id=48739459) | **A Mode per change**, written in `tasks.md` and approved with it: `light` (one agent, test first, one review), `standard` (fresh subagent per task), `thorough` (plus whole-branch review). Ceremony matches the risk. |
| **OpenSpec's apply has no discipline.** No TDD, no review, tasks silently skipped. | [OpenSpec #572](https://github.com/Fission-AI/OpenSpec/issues/572) (16 👍), [#900](https://github.com/Fission-AI/OpenSpec/issues/900), [heyuan110](https://www.heyuan110.com/posts/ai/2026-04-09-claude-code-openspec-superpowers/) | The schema's apply instruction (the controlling one, not advisory config) runs Superpowers' test-first execution, and **every `#### Scenario:` in the specs must map to a named test** in the plan, or be listed as uncovered. |
| **Brainstorm asks what the code already answers.** | [Superpowers #2530](https://github.com/obra/superpowers/issues/2530) (28 👍) | Read the code first, never ask what it answers, at most three questions before proposing approaches. |
| **Forced worktrees; change files missing inside them.** | [Superpowers #4](https://github.com/obra/superpowers/issues/4) (18 👍), [#583](https://github.com/obra/superpowers/issues/583), [bridge #6](https://github.com/JiangWay/openspec-schemas/issues/6) | A declared preference (which the worktree skill honours without asking): work in place on `change/<id>`. If you ask for a worktree, the change folder is committed first. |
| **Plans and specs committed into `docs/` without asking.** | [Superpowers #807](https://github.com/obra/superpowers/issues/807) (14 👍), [#337](https://github.com/obra/superpowers/issues/337), [#1690](https://github.com/obra/superpowers/issues/1690) | Everything lives in `openspec/changes/<id>/` and is committed with the code of the task it belongs to. |
| **Plan checkboxes never ticked; archive warns.** | [Superpowers #1075](https://github.com/obra/superpowers/issues/1075), [OpenSpec #863](https://github.com/Fission-AI/OpenSpec/issues/863) (17 👍) | Tick each step the moment it passes; archive through `openspec archive <id> --yes` so delta specs merge. |
| **Superpowers on every project, even where you don't want it.** | [Superpowers #645](https://github.com/obra/superpowers/issues/645), [HN](https://news.ycombinator.com/item?id=48739459) | Enabled per project in `.claude/settings.json` (the maintainer's suggested route), so it runs where this setup is. |
| **"How do I start on an existing project?"** | [OpenSpec #724](https://github.com/Fission-AI/OpenSpec/issues/724) (16 👍), [#510](https://github.com/Fission-AI/OpenSpec/issues/510), Spec Kit [#264](https://github.com/github/spec-kit/issues/264), [#438](https://github.com/github/spec-kit/issues/438) | `/openspec-context` writes the facts every proposal needs (stack, test commands, conventions, boundaries, domains) into `config.yaml`. No back-filled specs: OpenSpec's [own advice](https://github.com/Fission-AI/OpenSpec/blob/main/docs/existing-projects.md) is that they go stale. |
| **Bridges drift from upstream.** The most-starred one is pinned to OpenSpec 1.4 and Superpowers 5. | [bridge #13](https://github.com/JiangWay/openspec-schemas/issues/13) | The schema is rebuilt from your installed OpenSpec; CI installs the latest OpenSpec every Monday and fails if the schema stops validating. |

Not fixable from outside, so not pretended: OpenSpec's `openspec/` folder name is hardcoded
([#697](https://github.com/Fission-AI/OpenSpec/issues/697)), and Superpowers' scratch folder
`.superpowers/` is too (it ignores itself in git).

## How a change flows

```text
 you ──► /opsx:explore ──► /opsx:propose ──────────────► openspec/changes/<id>/
          read the code     proposal · specs · design       tasks.md = the plan
          ≤3 questions      tasks.md (Mode: light|standard|thorough)

          ┌────────────── code is locked ──────────────┐
 you ──►  review the folder, then:  ! node .claude/osp/osp.mjs approve <id>
          └────────────── code unlocks ────────────────┘

 /opsx:apply ──► branch change/<id> ──► per task: failing test → code → green → tick → commit
                 (Superpowers TDD; subagents and reviews by Mode)
                 spec wrong or scope grows? ──► update the spec ──► locked again ──► you approve

 /opsx:archive ──► full suite green ──► openspec archive <id> --yes ──► openspec/specs/ updated
```

### A real run

Claude Code with Superpowers 7.0.1 and OpenSpec 1.15, on a small Node repo, asked to
*"propose a slugify function, and when the proposal is done, go ahead and implement it"*:

| Step | What happened | Cost (API-equivalent) |
| --- | --- | --- |
| `/opsx:propose` | Wrote proposal, delta spec, design and `tasks.md` through Superpowers' `writing-plans`: one plan, `Mode: light` with its reason, every scenario mapped to a named test. No `docs/superpowers/`. Then it **stopped at the gate** instead of implementing. | $0.31 · 66 s |
| approve | `! node .claude/osp/osp.mjs approve add-slugify` | – |
| `/opsx:apply` | Branch `change/add-slugify` in place, `test-driven-development` (tests failed first, then passed), one `requesting-code-review` for the whole change, 6/6 steps ticked, one commit with the approval record. A reviewer suggestion that would change the design was **left for re-approval**, not applied. | $0.44 · 53 s |
| `/opsx:archive` | `openspec archive --yes`: the delta merged into `openspec/specs/text-slugify/`, gate free again. | – |

Its words at the gate:

> I haven't implemented it. You asked me to implement once the proposal was done. This
> repo's rules require your approval before any code, and a hook locks code files until
> then. […] Next step: review `openspec/changes/add-slugify/`, then run
> `! node .claude/osp/osp.mjs approve add-slugify`.

## The gate

```bash
node .claude/osp/osp.mjs status            # active changes: draft, approved or stale
! node .claude/osp/osp.mjs approve <id>    # you, not the agent (the ! runs it in your shell)
node .claude/osp/osp.mjs gate strict       # no code at all without an approved change
node .claude/osp/osp.mjs gate off          # off; `changes` is the default
```

- **What is locked:** `Write`, `Edit`, `MultiEdit` and `NotebookEdit` on files inside the repo
  but outside `openspec/`, while any active change is not approved. Planning is never locked.
- **What approval is:** a SHA-256 of the change's proposal, design, specs and tasks (checkbox
  state ignored) in `openspec/changes/<id>/.approved`. Commit it: it records who approved
  what. A stale hash means the change moved after approval.
- **Quick fixes:** with no active change, code is free in the default mode.
- **Honest limit:** the hook sees file tools, not every shell command. It blocks the agent
  from approving through the shell, and the agent is told not to write code through it; a
  determined agent could. `gate strict` plus Claude Code's permission rules narrow that.
- Tested by [`test/osp.test.mjs`](test/osp.test.mjs) (`node --test test/*.test.mjs`).

## Other harnesses

`AGENTS.md`, the schema and the context skill are plain files, so Codex, Cursor and
OpenCode read them; invoke OpenSpec with their syntax (`$openspec-propose` in Codex,
`/opsx-propose` in Cursor and OpenCode). The gate is a Claude Code hook. Where subagents are
not available, the apply step falls back to `light` and says so.

## Uninstall

Delete the fenced `awesome-openspec-superpowers` blocks from `AGENTS.md`, `CLAUDE.md` and
`openspec/config.yaml`, set `schema: spec-driven`, remove `openspec/schemas/superpowers/`,
`.claude/osp/`, `.claude/skills/openspec-context/` and the hook entry in
`.claude/settings.json`. Your changes and specs stay as they are.

## Resources

### Official

- [OpenSpec](https://github.com/Fission-AI/OpenSpec): [docs](https://github.com/Fission-AI/OpenSpec/tree/main/docs), [existing projects](https://github.com/Fission-AI/OpenSpec/blob/main/docs/existing-projects.md), [customization and schemas](https://github.com/Fission-AI/OpenSpec/blob/main/docs/customization.md), [community](https://github.com/Fission-AI/OpenSpec/blob/main/docs/community.md)
- [Superpowers](https://github.com/obra/superpowers): [release notes](https://github.com/obra/superpowers/releases), [marketplace](https://github.com/obra/superpowers-marketplace)

### Other bridges (different trade-offs)

- [JiangWay/openspec-schemas `superpowers-bridge`](https://github.com/JiangWay/openspec-schemas/tree/main/superpowers-bridge): eight artifacts including brainstorm, plan, verify and retrospective; subagent hosts only.
- [danielhanold/superspec](https://github.com/danielhanold/superspec): an OpenSpec schema in six phases that calls Superpowers skills.
- [RbBtSn0w/spec-kit-extensions `superb`](https://github.com/RbBtSn0w/spec-kit-extensions): the same idea for GitHub Spec Kit; keeps only the Superpowers skills that strengthen a Spec Kit stage.

### Comparisons and field reports

- [OpenSpec vs. Spec Kit vs. Superpowers, and how to use both](https://felipefontoura.com/articles/spec-driven-development-tools-compared/?utm_source=github&utm_medium=referral&utm_campaign=awesome-openspec-superpowers) (felipefontoura.com): what each owns, the two rules that keep them from fighting.
- [OpenSpec tutorial: one real change, install to archive](https://felipefontoura.com/articles/openspec/?utm_source=github&utm_medium=referral&utm_campaign=awesome-openspec-superpowers) (felipefontoura.com)
- [OpenSpec vs Superpowers: governance vs execution layer](https://devcxl.cn/en-us/blog/openspec-vs-superpowers-comparison/) (devcxl)
- [Stacking OpenSpec and Superpowers on a real project](https://austinxyz.github.io/blogs/blog/openspec-superpowers-combined) (austinxyz): 180M tokens and where it drifted.
- [Claude Code + OpenSpec + Superpowers: who owns what](https://www.heyuan110.com/posts/ai/2026-04-09-claude-code-openspec-superpowers/) and [my workflow](https://www.heyuan110.com/posts/ai/2026-06-28-openspec-superpowers-workflow/) (heyuan110)
- [OpenSpec vs Superpowers: spec generation and implementation](https://luismori.dev/article/openspec-vs-superpowers-spec-generation-implementation-comparison/) (luismori)

### Discussions

- [OpenSpec on Hacker News](https://news.ycombinator.com/item?id=49734264) and [Superpowers 6 on Hacker News](https://news.ycombinator.com/item?id=48739459)
- [r/ClaudeCode: Superpowers vs OpenSpec, or both?](https://www.reddit.com/r/ClaudeCode/comments/1tlp5xa/superpowers_vs_openspec_or_both/)

### Lists

- [awesome-openspec](https://github.com/speclib/awesome-openspec) · [awesome-superpowers](https://github.com/prime-radiant-inc/awesome-superpowers) · [awesome-spec-driven-development](https://github.com/Engineering4AI/awesome-spec-driven-development) · [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)

## The method behind it

OpenSpec and Superpowers are tools. The part they leave to you is the method: what a spec
an agent can build from looks like, where the human gates go, how to keep specs true after
the code ships. I wrote it down in a free book, from shipping a 13-app crypto fintech solo
in 70 days with AI agents: [**Spec-Driven Development**, PDF or EPUB](https://felipefontoura.com/get/sdd-book/?utm_source=github&utm_medium=referral&utm_campaign=awesome-openspec-superpowers&utm_content=method).

## Contributing

Issues and pull requests are welcome, especially a complaint this does not fix yet (link
the issue or post), and runs on Codex, Cursor or OpenCode. Keep the kit dependency-free and
every claim in this README tested.

## License

MIT. OpenSpec and Superpowers are their authors' projects, under their own licenses; this
repo only configures them.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
