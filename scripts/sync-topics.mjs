// Copies the interview notes into the app and writes their manifest.
//
// The notes are written in ../interview-topics, outside this repo, and Vercel
// only ever receives this folder — so the app carries its own copy. Run this
// after editing the notes:   npm run sync:topics
//
// It is deliberately NOT part of `npm run build`: on Vercel the source folder
// does not exist, and the committed copy is what gets built.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "..", "interview-topics");
const DEST = join(here, "..", "src", "content", "interview-topics");
const CODING = "18-coding-round";

if (!existsSync(SRC)) {
  console.error(`Nothing to sync: ${SRC} does not exist.`);
  process.exit(1);
}

/** The stage a topic number opens — the same grouping the PDF build uses. */
const STAGES = [
  ["01", "Stage 1 — The language"],
  ["04", "Stage 2 — The backend core"],
  ["14", "Stage 3 — The senior rounds"],
  ["17", "Optional — Python track"],
  ["18", "Stage 4 — Coding round practice"],
];
const stageFor = (num) => STAGES.filter(([from]) => from <= num).pop()?.[1] ?? "";

const numbered = (dir) => readdirSync(dir).filter((f) => /^\d{2}-.*\.md$/.test(f)).sort();

// study order: overview, the numbered topics, then the coding-round bank
const files = [
  { file: "README.md", stage: "Start here" },
  ...numbered(SRC).map((f) => ({ file: f, stage: stageFor(f.slice(0, 2)) })),
];
if (existsSync(join(SRC, CODING))) {
  files.push({ file: `${CODING}/README.md`, stage: stageFor("18") });
  numbered(join(SRC, CODING)).forEach((f) => files.push({ file: `${CODING}/${f}`, stage: stageFor("18") }));
}

/** Tick boxes the renderer will actually produce — a "- [ ]" inside a code fence is just code. */
function countChecks(text) {
  let inFence = false;
  let n = 0;
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    else if (!inFence && /^\s*[-*+]\s\[[ xX]\]\s/.test(line)) n++;
  }
  return n;
}

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });

const manifest = files.map(({ file, stage }) => {
  const from = join(SRC, file);
  const to = join(DEST, file);
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
  const text = readFileSync(from, "utf8");
  const heading = text.split("\n").find((l) => /^#\s/.test(l)) ?? file;
  return {
    file,
    stage,
    // "# 06 — Redis (Complete Topic Notes)" -> "Redis (Complete Topic Notes)"
    title: heading.replace(/^#+\s*/, "").replace(/^🎯\s*/, "").replace(/^\d+\s*[—–-]\s*/, "").trim(),
    // self-check tick boxes in the file, so the list can show progress before it is opened
    checks: countChecks(text),
  };
});

writeFileSync(join(DEST, "index.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Synced ${manifest.length} topics, ${manifest.reduce((n, t) => n + t.checks, 0)} tick boxes -> src/content/interview-topics`);
