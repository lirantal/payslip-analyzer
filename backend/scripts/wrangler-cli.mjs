#!/usr/bin/env node
/**
 * Single Wrangler entrypoint for the backend package.
 *
 * - Resolves backend/.env in memory: `op inject -i .env` to stdout (no secret temp files).
 * - For `wrangler dev`: runs `wrangler types` first, then passes each entry as `--var KEY:value`
 *   and appends `--env-file` last pointing at an empty file so Wrangler does not load .env / op://.
 * - For other subcommands: merges resolved vars into the child process env and passes the same
 *   empty `--env-file` so the CLI does not read raw op:// from disk.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..");
const envPath = join(backendRoot, ".env");

/** @returns {string} path to a new empty file (no secrets) */
function createEmptyEnvFile() {
  const p = join(tmpdir(), `wrangler-empty-${process.pid}-${Date.now()}`);
  writeFileSync(p, "", "utf8");
  return p;
}

function parseInjectedEnv(content) {
  /** @type {Array<[string, string]>} */
  const pairs = [];
  for (let line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const unexport = trimmed.replace(/^export\s+/, "");
    const eq = unexport.indexOf("=");
    if (eq <= 0) continue;
    const key = unexport.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = unexport.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    pairs.push([key, val]);
  }
  return pairs;
}

/**
 * Load resolved .env content in memory (never writes secrets to disk).
 * @returns {{ pairs: Array<[string, string]>, childEnv: NodeJS.ProcessEnv }}
 */
function loadResolvedEnv() {
  if (!existsSync(envPath)) {
    console.error("wrangler-cli: missing backend/.env");
    process.exit(1);
  }

  const opAvailable = spawnSync("op", ["--version"], {
    stdio: "pipe",
  }).status === 0;

  let content;
  if (opAvailable) {
    const r = spawnSync("op", ["inject", "-i", envPath], {
      cwd: backendRoot,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    if (r.status !== 0) {
      if (r.stderr) console.error(r.stderr);
      console.error("wrangler-cli: op inject failed (fix auth or .env references)");
      process.exit(r.status ?? 1);
    }
    content = r.stdout ?? "";
  } else {
    console.warn(
      "wrangler-cli: 1Password CLI (op) not found; reading .env as-is (op:// will break Wrangler)",
    );
    content = readFileSync(envPath, "utf8");
  }

  const pairs = parseInjectedEnv(content);
  const childEnv = { ...process.env };
  for (const [k, v] of pairs) {
    childEnv[k] = v;
  }
  return { pairs, childEnv };
}

function runWrangler(userArgs, childEnv, emptyEnvFile) {
  const pnpmArgs = ["exec", "wrangler", ...userArgs, "--env-file", emptyEnvFile];
  return spawnSync("pnpm", pnpmArgs, {
    cwd: backendRoot,
    stdio: "inherit",
    env: childEnv,
  });
}

function main() {
  const userArgs = process.argv.slice(2);
  if (userArgs.length === 0) {
    const emptyEnvFile = createEmptyEnvFile();
    const r = runWrangler([], process.env, emptyEnvFile);
    process.exit(r.status ?? 1);
  }

  const { pairs, childEnv } = loadResolvedEnv();
  const emptyEnvFile = createEmptyEnvFile();
  const sub = userArgs[0];
  const tail = userArgs.slice(1);

  if (sub === "dev") {
    const typegen = runWrangler(
      ["types", "--env-interface", "CloudflareBindings"],
      childEnv,
      emptyEnvFile,
    );
    if (typegen.status !== 0) {
      process.exit(typegen.status ?? 1);
    }

    const varFlags = pairs.flatMap(([k, v]) => ["--var", `${k}:${v}`]);
    const r = runWrangler(["dev", ...varFlags, ...tail], childEnv, emptyEnvFile);
    process.exit(r.status ?? 1);
  }

  const r = runWrangler(userArgs, childEnv, emptyEnvFile);
  process.exit(r.status ?? 1);
}

main();
