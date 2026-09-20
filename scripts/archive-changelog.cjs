#!/usr/bin/env node
// Lit CHANGELOG.md, archive la section "## Non publié" sous un titre versionné
// daté (## vX.Y.Z — AAAA-MM-JJ), la vide, et écrit le contenu extrait dans
// changelog-notes.txt pour que le workflow CI l'utilise comme corps de la
// Release GitHub (affiché ensuite dans Réglages > Mises à jour côté app).
const fs = require("fs");

const [, , tag, date] = process.argv;
if (!tag || !date) {
  console.error("Usage: archive-changelog.cjs <tag> <date>");
  process.exit(1);
}

const path = "CHANGELOG.md";
const content = fs.readFileSync(path, "utf8");
const lines = content.split("\n");

const startIdx = lines.findIndex((l) => l.trim() === "## Non publié");
if (startIdx === -1) {
  fs.writeFileSync("changelog-notes.txt", "Correctifs et améliorations diverses.\n");
  console.log("no-section");
  process.exit(0);
}

let endIdx = lines.findIndex((l, i) => i > startIdx && l.startsWith("## "));
if (endIdx === -1) endIdx = lines.length;

const section = lines.slice(startIdx + 1, endIdx);
const body = section.join("\n").trim();

fs.writeFileSync("changelog-notes.txt", (body || "Correctifs et améliorations diverses.") + "\n");

if (!body) {
  console.log("empty");
  process.exit(0);
}

const archived = [`## ${tag} — ${date}`, ...section];
const newLines = [...lines.slice(0, startIdx + 1), "", ...archived, ...lines.slice(endIdx)];
fs.writeFileSync(path, newLines.join("\n"));
console.log("updated");
