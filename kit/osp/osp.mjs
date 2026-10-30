#!/usr/bin/env node
// osp: the approval gate between OpenSpec and Superpowers.
//
// Two jobs in one file, no dependencies:
//   node .claude/osp/osp.mjs hook            Claude Code PreToolUse hook (reads JSON on stdin)
//   node .claude/osp/osp.mjs approve [id]    a human approves a change (run it yourself, `! ...`)
//   node .claude/osp/osp.mjs status          what is active, approved, stale
//   node .claude/osp/osp.mjs gate <mode>     changes (default) | strict | off
//
// The rule: while an OpenSpec change is active and not approved, the agent can write
// planning files (openspec/**) but not code. Approval is a hash of the change's
// artifacts, so editing the proposal, design, specs or task list after approval
// re-locks the code until a human approves again. Ticking checkboxes does not.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const APPROVAL = ".approved";

function findRoot(start) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "openspec")) && statSync(join(dir, "openspec")).isDirectory()) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function readConfig(root) {
  const file = join(root, ".claude", "osp", "config.json");
  try {
    return { gate: "changes", ...JSON.parse(readFileSync(file, "utf8")) };
  } catch {
    return { gate: "changes" };
  }
}

function writeConfig(root, cfg) {
  const file = join(root, ".claude", "osp", "config.json");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n");
}

function activeChanges(root) {
  const dir = join(root, "openspec", "changes");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "archive" && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}

// What a human approves: the proposal, the design, the delta specs and the task list.
// plan.md (Superpowers' plan) and the approval file itself are left out, and checkbox
// state is normalised, so implementation progress never invalidates an approval.
function fingerprint(root, id) {
  const dir = join(root, "openspec", "changes", id);
  const files = walk(dir)
    .filter((p) => p.endsWith(".md") || p.endsWith(".yaml") || p.endsWith(".yml"))
    .filter((p) => !p.endsWith(`${sep}plan.md`) && !p.endsWith(APPROVAL))
    .sort();
  const h = createHash("sha256");
  for (const p of files) {
    let text = readFileSync(p, "utf8");
    if (p.endsWith("tasks.md")) text = text.replace(/^(\s*[-*]\s*)\[[xX ]\]/gm, "$1[ ]");
    h.update(relative(dir, p) + "\0" + text + "\0");
  }
  return h.digest("hex");
}

function approvalState(root, id) {
  const file = join(root, "openspec", "changes", id, APPROVAL);
  if (!existsSync(file)) return "draft";
  const saved = readFileSync(file, "utf8").trim().split(/\s+/)[0];
  return saved === fingerprint(root, id) ? "approved" : "stale";
}

function isInside(child, parent) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith(sep) && !/^[a-zA-Z]:/.test(rel));
}

function block(msg) {
  process.stderr.write(msg.trim() + "\n");
  process.exit(2);
}

function approveCmd(root) {
  return `! node .claude/osp/osp.mjs approve`;
}

function hook() {
  let input = "";
  try {
    input = readFileSync(0, "utf8");
  } catch {
    process.exit(0);
  }
  let ev;
  try {
    ev = JSON.parse(input);
  } catch {
    process.exit(0);
  }
  const tool = ev.tool_name || "";
  const args = ev.tool_input || {};
  const root = findRoot(ev.cwd || process.cwd());
  if (!root) process.exit(0);

  // Only a human approves or turns the gate off.
  if (tool === "Bash") {
    const cmd = String(args.command || "");
    // Writes aimed at an approval file (a mention in an echo or a commit message is fine).
    const writesApproval = /(>>?|\btee\b|\btouch\b|\bcp\b|\bmv\b|\brm\b|\bln\b|\bsed\s+-i|\bperl\s+-[a-z]*i|\bdd\b)[^;&|]*\.approved\b/.test(cmd);
    if (writesApproval || /osp\.mjs["']?\s+(approve|gate)\b/.test(cmd)) {
      block(`Only a human approves a change or changes the gate. Ask them to run it:\n  ${approveCmd(root)} <change>`);
    }
    process.exit(0);
  }

  const target = args.file_path || args.notebook_path || args.path;
  if (!target || !["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(tool)) process.exit(0);

  const abs = resolve(ev.cwd || process.cwd(), target);
  if (!isInside(abs, root)) process.exit(0);
  if (abs.endsWith(APPROVAL)) {
    block(`Only a human approves a change. Ask them to run:\n  ${approveCmd(root)} <change>`);
  }

  // Planning is always free: the change folder, the specs, Superpowers' plan inside the change.
  if (isInside(abs, join(root, "openspec"))) process.exit(0);

  const cfg = readConfig(root);
  if (cfg.gate === "off") process.exit(0);

  const changes = activeChanges(root);
  const states = changes.map((id) => ({ id, state: approvalState(root, id) }));
  const approved = states.filter((s) => s.state === "approved");
  const waiting = states.filter((s) => s.state !== "approved");

  if (cfg.gate === "strict" && approved.length === 0) {
    block(
      `Code is locked: no approved OpenSpec change (gate: strict).\n` +
        `Propose one with /opsx:propose, then ask your human to review it and run:\n  ${approveCmd(root)} <change>`,
    );
  }

  if (waiting.length > 0) {
    const lines = waiting.map((s) =>
      s.state === "stale"
        ? `  - ${s.id}: approved, then its proposal/design/specs/tasks changed. Re-approval needed.`
        : `  - ${s.id}: not approved yet.`,
    );
    block(
      `Code is locked until a human approves the active OpenSpec change:\n${lines.join("\n")}\n` +
        `Stop here. Summarise the change for your human (what, why, scope, open questions) and ask them to run:\n` +
        `  ${approveCmd(root)} ${waiting[0].id}\n` +
        `Do not work around this gate (no shell redirection, sed -i or scripts to write code).`,
    );
  }
  process.exit(0);
}

function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "hook") return hook();

  const root = findRoot(process.cwd());
  if (!root) {
    console.error("No openspec/ folder found here or above. Run `openspec init` first.");
    process.exit(1);
  }

  if (cmd === "approve") {
    const changes = activeChanges(root);
    const id = arg || (changes.length === 1 ? changes[0] : null);
    if (!id) {
      console.error(changes.length ? `Which change? ${changes.join(", ")}` : "No active change to approve.");
      process.exit(1);
    }
    if (!changes.includes(id)) {
      console.error(`No active change named "${id}". Active: ${changes.join(", ") || "none"}`);
      process.exit(1);
    }
    const fp = fingerprint(root, id);
    writeFileSync(join(root, "openspec", "changes", id, APPROVAL), `${fp} ${new Date().toISOString()}\n`);
    console.log(`Approved ${id}. Code is unlocked for it; editing its proposal, design, specs or tasks locks it again.`);
    return;
  }

  if (cmd === "gate") {
    if (!["changes", "strict", "off"].includes(arg)) {
      console.error("Usage: osp.mjs gate <changes|strict|off>");
      process.exit(1);
    }
    writeConfig(root, { ...readConfig(root), gate: arg });
    console.log(`Gate: ${arg}`);
    return;
  }

  if (cmd === "status" || !cmd) {
    const cfg = readConfig(root);
    const changes = activeChanges(root);
    console.log(`Gate: ${cfg.gate}`);
    if (!changes.length) console.log("No active changes.");
    for (const id of changes) console.log(`  ${approvalState(root, id).padEnd(8)} ${id}`);
    return;
  }

  console.error("Usage: osp.mjs <hook|approve [change]|status|gate <changes|strict|off>>");
  process.exit(1);
}

main();
