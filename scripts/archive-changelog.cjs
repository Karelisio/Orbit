#!/usr/bin/env node
// Notes de version tirées de CHANGELOG.md, en deux temps (voir
// .github/workflows/build-android.yml) :
//
//   notes <changelog du commit construit> [<changelog actuel de main>]
//     Écrit sur la sortie standard les entrées de « ## Non publié » du commit
//     construit — moins celles déjà archivées sous une version dans le
//     CHANGELOG de main (release concurrente, commit construit un peu
//     ancien) —, ou la note par défaut s'il n'en reste aucune. Ne modifie
//     rien : le build peut encore échouer. Ces notes deviennent le corps de
//     la Release GitHub, affiché dans Réglages > Mises à jour côté app.
//
//   archive <changelog> <tag> <date> <fichier de notes>
//     Une fois la release publiée, sur le CHANGELOG à jour de main : déplace
//     ces entrées de « ## Non publié » vers une nouvelle section
//     « ## <tag> — <date> », juste en dessous. Une entrée ajoutée entre-temps
//     par un autre commit reste sous « Non publié ». Jamais de section
//     archivée vide (note par défaut), et rien n'est fait si la section du
//     tag existe déjà (job relancé).
const fs = require("fs");

const UNRELEASED = "## Non publié";
const DEFAULT_NOTE = "- Corrections et améliorations internes.";

/** Découpe des lignes en entrées : une puce « - » et ses éventuelles lignes de suite. */
function entries(lines) {
  const result = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    if (line.startsWith("- ") || result.length === 0) result.push(line);
    else result[result.length - 1] += "\n" + line;
  }
  return result;
}

/** Bornes [début, fin[ de la section « ## Non publié » (fin = titre suivant), ou null. */
function unreleasedRange(lines) {
  const start = lines.findIndex((line) => line.trim() === UNRELEASED);
  if (start === -1) return null;
  let end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  if (end === -1) end = lines.length;
  return { start, end };
}

/** Entrées déjà publiées : celles de toutes les sections de version (« ## v... »). */
function releasedEntries(lines) {
  const released = new Set();
  let section = [];
  const flush = () => {
    for (const entry of entries(section)) released.add(entry);
    section = [];
  };
  let inVersion = false;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (inVersion) flush();
      inVersion = /^## v\d/.test(line);
      continue;
    }
    if (inVersion) section.push(line);
  }
  if (inVersion) flush();
  return released;
}

function read(path) {
  return fs.readFileSync(path, "utf8").split("\n");
}

function notes(builtPath, mainPath) {
  const built = read(builtPath);
  const range = unreleasedRange(built);
  let pending = range ? entries(built.slice(range.start + 1, range.end)) : [];
  if (mainPath && fs.existsSync(mainPath)) {
    const released = releasedEntries(read(mainPath));
    pending = pending.filter((entry) => !released.has(entry));
  }
  process.stdout.write((pending.length ? pending.join("\n") : DEFAULT_NOTE) + "\n");
}

function archive(path, tag, date, notesPath) {
  const lines = read(path);
  if (lines.some((line) => line.startsWith(`## ${tag} `) || line.trim() === `## ${tag}`)) {
    console.log(`section ${tag} déjà présente : rien à faire`);
    return;
  }
  const released = entries(read(notesPath));
  const archived = released.length ? released : [DEFAULT_NOTE];

  let range = unreleasedRange(lines);
  if (!range) {
    // Pas de « Non publié » : on le recrée avant la première version.
    let firstVersion = lines.findIndex((line) => line.startsWith("## "));
    if (firstVersion === -1) firstVersion = lines.length;
    lines.splice(firstVersion, 0, UNRELEASED, "");
    range = { start: firstVersion, end: firstVersion + 2 };
  }
  const releasedSet = new Set(archived);
  const remaining = entries(lines.slice(range.start + 1, range.end)).filter((entry) => !releasedSet.has(entry));

  const updated = [
    ...lines.slice(0, range.start + 1),
    ...remaining,
    "",
    `## ${tag} — ${date}`,
    ...archived,
    "",
    ...lines.slice(range.end),
  ];
  fs.writeFileSync(path, updated.join("\n"));
  console.log(`archivé sous ${tag} : ${archived.length} entrée(s), ${remaining.length} restée(s) sous « Non publié »`);
}

const [, , mode, ...args] = process.argv;
if (mode === "notes" && args.length >= 1) {
  notes(args[0], args[1]);
} else if (mode === "archive" && args.length === 4) {
  archive(args[0], args[1], args[2], args[3]);
} else {
  console.error(
    "Usage :\n  archive-changelog.cjs notes <changelog construit> [<changelog de main>]\n" +
      "  archive-changelog.cjs archive <changelog> <tag> <date> <fichier de notes>"
  );
  process.exit(1);
}
