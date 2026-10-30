#!/usr/bin/env bash
# awesome-openspec-superpowers installer.
# Wires OpenSpec and Superpowers together in the current repo, for Claude Code:
#   - runs `openspec init --tools claude` if the repo has no openspec/ yet
#   - adds the routing rules to AGENTS.md (and imports them from CLAUDE.md)
#   - adds apply/archive guidance to openspec/config.yaml
#   - installs the approval gate (a PreToolUse hook) in .claude/
#   - installs the openspec-context skill for existing codebases
#   - installs Superpowers with --with-superpowers (otherwise prints the two commands)
# Safe to re-run: every block it writes is fenced and replaced in place.
#
#   curl -fsSL https://raw.githubusercontent.com/felipefontoura/awesome-openspec-superpowers/main/install.sh | bash
#   curl -fsSL .../install.sh | bash -s -- --with-superpowers
set -euo pipefail

REPO="felipefontoura/awesome-openspec-superpowers"
REF="${OSP_REF:-main}"
WITH_SUPERPOWERS=0
for arg in "$@"; do
  case "$arg" in
    --with-superpowers) WITH_SUPERPOWERS=1 ;;
    -h | --help) sed -n '2,14p' "$0" 2>/dev/null || true; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

say() { printf '\033[1m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!!\033[0m %s\n' "$*" >&2; }
die() { printf '\033[31mxx\033[0m %s\n' "$*" >&2; exit 1; }

command -v node >/dev/null || die "Node.js 20+ is required (OpenSpec and the gate run on it)."
git rev-parse --show-toplevel >/dev/null 2>&1 || die "Run this inside a git repository."
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# Where the kit comes from: this checkout if run locally, otherwise GitHub.
SRC=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "$(dirname "${BASH_SOURCE[0]}")/kit/osp/osp.mjs" ]; then
  SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  say "Downloading the kit ($REPO@$REF)"
  curl -fsSL "https://github.com/$REPO/archive/$REF.tar.gz" | tar -xz -C "$TMP" --strip-components=1
  SRC="$TMP"
fi
KIT="$SRC/kit"

# 1. OpenSpec
if command -v openspec >/dev/null; then OPENSPEC=(openspec); else OPENSPEC=(npx -y @fission-ai/openspec@latest); fi
if [ ! -d openspec ]; then
  say "Initialising OpenSpec (${OPENSPEC[*]} init --tools claude)"
  "${OPENSPEC[@]}" init --tools claude --no-animation .
else
  say "OpenSpec already initialised"
fi

# 2. The `superpowers` schema: your OpenSpec version's own spec-driven schema, with
#    the tasks artifact and the apply step replaced. Re-run after upgrading OpenSpec.
say "Building the superpowers schema from your OpenSpec's spec-driven"
"${OPENSPEC[@]}" schema fork spec-driven superpowers --force >/dev/null
cp "$KIT/schema/tasks.md" openspec/schemas/superpowers/templates/tasks.md

# 3-6. Schema patch, fenced blocks in AGENTS.md, CLAUDE.md, config.yaml; settings.json
say "Writing routing rules, config guidance and the approval gate"
mkdir -p .claude/osp .claude/skills
cp "$KIT/osp/osp.mjs" .claude/osp/osp.mjs
[ -f .claude/osp/config.json ] || printf '{\n  "gate": "changes"\n}\n' > .claude/osp/config.json
rm -rf .claude/skills/openspec-context
cp -R "$KIT/skills/openspec-context" .claude/skills/openspec-context

KIT="$KIT" node --input-type=module <<'NODE'
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const kit = process.env.KIT;
const START = "awesome-openspec-superpowers:start", END = "awesome-openspec-superpowers:end";

// Replace the fenced block if present, else append it.
function upsert(file, block, { create = true } = {}) {
  const has = existsSync(file);
  if (!has && !create) return "skipped";
  let text = has ? readFileSync(file, "utf8") : "";
  const lines = text.split("\n");
  const s = lines.findIndex((l) => l.includes(START));
  const e = lines.findIndex((l) => l.includes(END));
  if (s !== -1 && e > s) {
    lines.splice(s, e - s + 1, ...block.trimEnd().split("\n"));
    text = lines.join("\n");
  } else {
    text = (text.trimEnd() ? text.trimEnd() + "\n\n" : "") + block.trimEnd() + "\n";
  }
  writeFileSync(file, text);
  return has ? "updated" : "created";
}

// The schema: replace everything from the tasks artifact to the end (tasks + apply).
const schemaFile = "openspec/schemas/superpowers/schema.yaml";
const schema = readFileSync(schemaFile, "utf8");
const at = schema.search(/^  - id: tasks\s*$/m);
if (at === -1) throw new Error(`${schemaFile}: no tasks artifact found; this OpenSpec version changed spec-driven`);
const head = schema
  .slice(0, at)
  .replace(/^description: .*$/m, "description: OpenSpec owns what and why; Superpowers owns how. proposal → specs → design → tasks (the plan) → gated apply");
writeFileSync(schemaFile, head + readFileSync(join(kit, "schema", "tasks-and-apply.yaml"), "utf8"));
console.log(`   ${schemaFile} written`);

// AGENTS.md holds the rules (read by Codex, Cursor, OpenCode…); CLAUDE.md imports it.
const agents = readFileSync(join(kit, "AGENTS.fragment.md"), "utf8");
console.log(`   AGENTS.md ${upsert("AGENTS.md", agents)}`);
const claudeImport = `<!-- ${START} -->\n@AGENTS.md\n<!-- ${END} -->\n`;
const claude = existsSync("CLAUDE.md") ? readFileSync("CLAUDE.md", "utf8") : "";
if (/^@AGENTS\.md\s*$/m.test(claude.replace(new RegExp(`<!-- ${START}[\\s\\S]*?${END} -->`), ""))) {
  console.log("   CLAUDE.md already imports AGENTS.md");
} else {
  console.log(`   CLAUDE.md ${upsert("CLAUDE.md", claudeImport)}`);
}

// config.yaml: switch to the schema; append our rules only when the user has none.
const cfgFile = "openspec/config.yaml";
const frag = readFileSync(join(kit, "config.fragment.yaml"), "utf8");
let cfg = existsSync(cfgFile) ? readFileSync(cfgFile, "utf8") : "schema: spec-driven\n";
cfg = /^schema:.*$/m.test(cfg) ? cfg.replace(/^schema:.*$/m, "schema: superpowers") : "schema: superpowers\n" + cfg;
const withoutOurs = cfg.replace(/# awesome-openspec-superpowers:start[\s\S]*?# awesome-openspec-superpowers:end\n?/, "");
if (/^(rules|operations):/m.test(withoutOurs)) {
  writeFileSync(cfgFile, withoutOurs);
  console.log(`   ${cfgFile}: schema set; you have your own rules/operations, merge kit/config.fragment.yaml by hand`);
} else {
  writeFileSync(cfgFile, withoutOurs.trimEnd() + "\n\n" + frag.trimEnd() + "\n");
  console.log(`   ${cfgFile} updated`);
}

// .claude/settings.json: the PreToolUse hook, once.
const setFile = ".claude/settings.json";
const settings = existsSync(setFile) ? JSON.parse(readFileSync(setFile, "utf8")) : {};
settings.hooks ??= {};
settings.hooks.PreToolUse ??= [];
const command = 'node "$CLAUDE_PROJECT_DIR/.claude/osp/osp.mjs" hook';
const present = settings.hooks.PreToolUse.some((m) => (m.hooks || []).some((h) => String(h.command).includes("osp.mjs")));
if (!present) {
  settings.hooks.PreToolUse.push({ matcher: "Write|Edit|MultiEdit|NotebookEdit|Bash", hooks: [{ type: "command", command }] });
}
// Superpowers for this project only, and for every teammate who clones it.
settings.extraKnownMarketplaces ??= {};
settings.extraKnownMarketplaces["superpowers-marketplace"] ??= { source: { source: "github", repo: "obra/superpowers-marketplace" } };
settings.enabledPlugins ??= {};
settings.enabledPlugins["superpowers@superpowers-marketplace"] ??= true;
writeFileSync(setFile, JSON.stringify(settings, null, 2) + "\n");
console.log(`   ${setFile} ${present ? "already has the gate" : "gate hook added"}; Superpowers enabled for this project`);
NODE

# 5. Superpowers
if [ "$WITH_SUPERPOWERS" = 1 ]; then
  command -v claude >/dev/null || die "--with-superpowers needs the claude CLI on PATH."
  say "Installing Superpowers (user scope)"
  claude plugin marketplace add obra/superpowers-marketplace || true
  claude plugin install superpowers@superpowers-marketplace
fi

cat <<EOF

Done. What changed in $(basename "$ROOT"):
  AGENTS.md, CLAUDE.md         who owns what (OpenSpec: what/why, Superpowers: how)
  openspec/config.yaml         apply/archive guidance that calls Superpowers' skills
  .claude/osp/                 the approval gate; .claude/settings.json runs it
  .claude/skills/openspec-context   context for an existing codebase

Next, in Claude Code:
EOF
if [ "$WITH_SUPERPOWERS" = 0 ]; then
  cat <<'EOF'
  /plugin marketplace add obra/superpowers-marketplace
  /plugin install superpowers@superpowers-marketplace     (skip if you have it)
EOF
fi
cat <<'EOF'
  /openspec-context            once, on an existing codebase
  /opsx:propose <your change>  then review openspec/changes/<id>/ and approve:
  ! node .claude/osp/osp.mjs approve <id>
  /opsx:apply                  Superpowers plans, tests first, builds, reviews
  /opsx:archive

Gate status any time: node .claude/osp/osp.mjs status
EOF
