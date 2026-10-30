// The gate's contract, run with `node --test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const OSP = fileURLToPath(new URL("../kit/osp/osp.mjs", import.meta.url));

function repo() {
  const root = mkdtempSync(join(tmpdir(), "osp-"));
  mkdirSync(join(root, "openspec", "changes", "archive"), { recursive: true });
  mkdirSync(join(root, "openspec", "specs"), { recursive: true });
  return root;
}

function change(root, id) {
  const dir = join(root, "openspec", "changes", id);
  mkdirSync(join(dir, "specs", "auth"), { recursive: true });
  writeFileSync(join(dir, "proposal.md"), "## Why\nUsers need it.\n");
  writeFileSync(join(dir, "specs", "auth", "spec.md"), "## ADDED Requirements\n### Requirement: Login\n");
  writeFileSync(join(dir, "tasks.md"), "## 1. Build\n- [ ] 1.1 Add login\n- [ ] 1.2 Add logout\n");
  return dir;
}

function hook(root, tool, input) {
  const r = spawnSync("node", [OSP, "hook"], {
    input: JSON.stringify({ tool_name: tool, tool_input: input, cwd: root }),
    encoding: "utf8",
  });
  return { code: r.status, err: r.stderr };
}

function cli(root, ...args) {
  return spawnSync("node", [OSP, ...args], { cwd: root, encoding: "utf8" });
}

test("no active change: code is free (quick fixes)", () => {
  const root = repo();
  assert.equal(hook(root, "Write", { file_path: "src/a.js" }).code, 0);
});

test("draft change: code is locked, planning is free", () => {
  const root = repo();
  change(root, "add-login");
  const r = hook(root, "Edit", { file_path: "src/a.js" });
  assert.equal(r.code, 2);
  assert.match(r.err, /add-login: not approved yet/);
  assert.equal(hook(root, "Write", { file_path: "openspec/changes/add-login/design.md" }).code, 0);
  assert.equal(hook(root, "Write", { file_path: "openspec/changes/add-login/plan.md" }).code, 0);
});

test("the agent cannot approve, by file or by shell", () => {
  const root = repo();
  change(root, "add-login");
  assert.equal(hook(root, "Write", { file_path: "openspec/changes/add-login/.approved" }).code, 2);
  assert.equal(hook(root, "Bash", { command: "node .claude/osp/osp.mjs approve add-login" }).code, 2);
  assert.equal(hook(root, "Bash", { command: "echo x > openspec/changes/add-login/.approved" }).code, 2);
  assert.equal(hook(root, "Bash", { command: "node .claude/osp/osp.mjs gate off" }).code, 2);
  assert.equal(hook(root, "Bash", { command: "touch openspec/changes/add-login/.approved" }).code, 2);
  assert.equal(hook(root, "Bash", { command: "cp /tmp/x openspec/changes/add-login/.approved" }).code, 2);
  assert.equal(hook(root, "Bash", { command: "npm test" }).code, 0);
});

test("mentioning the approval file is not writing it", () => {
  const root = repo();
  change(root, "add-login");
  const note = 'echo "Note: .approved is the gate file, leave it" >> .superpowers/sdd/plan/progress.md';
  assert.equal(hook(root, "Bash", { command: note }).code, 0);
  assert.equal(hook(root, "Bash", { command: "git add openspec/changes/add-login/.approved" }).code, 0);
  assert.equal(hook(root, "Bash", { command: "cat openspec/changes/add-login/.approved" }).code, 0);
});

test("human approval unlocks code; ticking tasks keeps it unlocked", () => {
  const root = repo();
  const dir = change(root, "add-login");
  assert.equal(cli(root, "approve").status, 0);
  assert.equal(hook(root, "Edit", { file_path: "src/a.js" }).code, 0);
  const tasks = join(dir, "tasks.md");
  writeFileSync(tasks, readFileSync(tasks, "utf8").replace("- [ ] 1.1", "- [x] 1.1"));
  writeFileSync(join(dir, "plan.md"), "# Plan\n");
  assert.equal(hook(root, "Edit", { file_path: "src/a.js" }).code, 0);
});

test("scope change after approval locks code again", () => {
  const root = repo();
  const dir = change(root, "add-login");
  cli(root, "approve", "add-login");
  appendFileSync(join(dir, "tasks.md"), "- [ ] 1.3 Add password reset\n");
  const r = hook(root, "Edit", { file_path: "src/a.js" });
  assert.equal(r.code, 2);
  assert.match(r.err, /Re-approval needed/);
  assert.match(cli(root, "status").stdout, /stale\s+add-login/);
});

test("archived changes do not count", () => {
  const root = repo();
  mkdirSync(join(root, "openspec", "changes", "archive", "2026-01-01-old"), { recursive: true });
  assert.equal(hook(root, "Write", { file_path: "src/a.js" }).code, 0);
});

test("strict mode needs an approved change for any code", () => {
  const root = repo();
  cli(root, "gate", "strict");
  assert.equal(hook(root, "Write", { file_path: "src/a.js" }).code, 2);
  change(root, "add-login");
  cli(root, "approve");
  assert.equal(hook(root, "Write", { file_path: "src/a.js" }).code, 0);
});

test("gate off lets everything through", () => {
  const root = repo();
  change(root, "add-login");
  cli(root, "gate", "off");
  assert.equal(hook(root, "Write", { file_path: "src/a.js" }).code, 0);
});

test("files outside the repo and repos without openspec are ignored", () => {
  const root = repo();
  change(root, "add-login");
  assert.equal(hook(root, "Write", { file_path: join(tmpdir(), "elsewhere.txt") }).code, 0);
  const plain = mkdtempSync(join(tmpdir(), "plain-"));
  assert.equal(hook(plain, "Write", { file_path: "a.js" }).code, 0);
});

test("malformed hook input never blocks", () => {
  const r = spawnSync("node", [OSP, "hook"], { input: "not json", encoding: "utf8" });
  assert.equal(r.status, 0);
});
