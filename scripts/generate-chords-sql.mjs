/**
 * Genera el seed SQL del catálogo de acordes a partir de
 * @tombatossals/chords-db, un archivo por instrumento:
 *
 *   node scripts/generate-chords-sql.mjs
 *
 * Salidas (el esquema vive en supabase/migrations/):
 *   supabase/seed_chords_guitar.sql
 *   supabase/seed_chords_ukulele.sql
 *
 * Cada seed borra solo las filas de su instrumento, así que pueden
 * ejecutarse por separado. Se excluyen los sufijos con bajo alterado
 * ("/E", "m/B", …): son inversiones, no cualidades del acorde.
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);

/* Guitarra sin prefijo (ids históricos); el resto con "<instrumento>-". */
const INSTRUMENTS = [
  { name: "guitar", idPrefix: "", db: require("@tombatossals/chords-db/lib/guitar.json") },
  {
    name: "ukulele",
    idPrefix: "ukulele-",
    db: require("@tombatossals/chords-db/lib/ukulele.json"),
  },
];

/* ---------- diccionarios ---------- */

/* El ukelele nombra algunas raíces en bemol; se normalizan a las claves
   de guitarra para compartir slugs, búsqueda y etiquetas. */
const KEY_ALIASES = { Db: "C#", Gb: "F#" };

const ROOT_ES = {
  C: "Do", "C#": "Do#", D: "Re", Eb: "Mib", E: "Mi", F: "Fa",
  "F#": "Fa#", G: "Sol", Ab: "Lab", A: "La", Bb: "Sib", B: "Si",
};

const ROOT_PC = {
  C: 0, "C#": 1, D: 2, Eb: 3, E: 4, F: 5,
  "F#": 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11,
};

const NOTE_ORDER = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

const PC_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const PC_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const FLAT_KEYS = new Set(["Eb", "Ab", "Bb", "F"]);

const SUFFIX_ES = {
  major: "mayor", minor: "menor", dim: "disminuido", dim7: "disminuido 7",
  sus2: "susp. 2", sus4: "susp. 4", "7sus4": "7 susp. 4", "7sg": "7 sol grave",
  alt: "alterado", aug: "aumentado", 6: "sexta", 69: "6/9", 7: "séptima",
  "7b5": "7 bemol 5", aug7: "aumentado 7", 9: "novena", "9b5": "9 bemol 5",
  aug9: "aumentado 9", "7b9": "7 bemol 9", "7#9": "7 sostenido 9", 11: "oncena",
  "9#11": "9 sostenido 11", 13: "trecena", maj7: "mayor 7",
  maj7b5: "mayor 7 bemol 5", "maj7#5": "mayor 7 sostenido 5", maj9: "mayor 9",
  maj11: "mayor 11", maj13: "mayor 13", m6: "menor 6", m69: "menor 6/9",
  m7: "menor 7", m7b5: "semidisminuido", m9: "menor 9", m11: "menor 11",
  mmaj7: "menor mayor 7", mmaj7b5: "menor mayor 7 bemol 5",
  mmaj9: "menor mayor 9", mmaj11: "menor mayor 11", add9: "add 9",
  madd9: "menor add 9",
  // exclusivos del catálogo de ukelele
  "7b9#5": "7 bemol 9 sostenido 5", "13b9": "13 bemol 9",
  "13b5b9": "13 bemol 5 bemol 9", b13b9: "bemol 13 bemol 9",
  "b13#9": "bemol 13 sostenido 9", m9b5: "menor 9 bemol 5",
};

/* Categorías paraguas (claves estables; las etiquetas viven en i18n). */
const CATEGORY_ORDER = [
  "major", "minor", "seventh", "suspended", "diminished", "augmented", "extended", "other",
];

function categoryOf(suffix) {
  if (suffix === "major") return "major";
  if (suffix === "minor") return "minor";
  if (/dim|m7b5|m9b5/.test(suffix)) return "diminished";
  if (/aug/.test(suffix)) return "augmented";
  if (/sus/.test(suffix)) return "suspended";
  if (["7", "m7", "7b5", "7b9", "7#9"].includes(suffix)) return "seventh";
  if (/^(6|69|9|9b5|9#11|11|13|13b9|13b5b9|b13b9|b13#9|maj7|maj7b5|maj7#5|maj9|maj11|maj13|m6|m69|m9|m11|mmaj\d+.*|add9|madd9)$/.test(suffix)) {
    return "extended";
  }
  return "other";
}

function printableSuffix(suffix) {
  if (suffix === "major") return "";
  if (suffix === "minor") return "m";
  return suffix;
}

function stripAccents(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function slugOf(key, suffix) {
  const k = key.toLowerCase().replace("#", "sharp");
  const s = suffix.toLowerCase().replace("#", "sharp").replace(/[^a-z0-9]/g, "-");
  return `${k}-${s}`;
}

/* Notas e intervalos a partir de los MIDI de la primera posición. */
const INTERVAL = ["1", "♭9", "9", "♭3", "3", "11", "♭5", "5", "♯5", "6", "♭7", "7"];

function notesAndIntervals(key, midi) {
  const rootPc = ROOT_PC[key];
  const pcs = [...new Set(midi.map((m) => m % 12))];
  const rel = [...new Set(pcs.map((pc) => (pc - rootPc + 12) % 12))].sort((a, b) => a - b);
  const names = FLAT_KEYS.has(key) ? PC_FLAT : PC_SHARP;
  const hasThird = rel.includes(3) || rel.includes(4);
  const intervals = rel.map((r) => {
    if (!hasThird && r === 2) return "2";
    if (!hasThird && r === 5) return "4";
    return INTERVAL[r];
  });
  const notes = rel.map((r) => names[(rootPc + r) % 12]);
  return { notes, intervals };
}

const sqlText = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sqlTextArr = (a) => `array[${a.map(sqlText).join(",")}]::text[]`;
const sqlIntArr = (a) => `array[${a.join(",")}]::smallint[]`;

function batches(rows, size) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/* ---------- recorrido por instrumento ---------- */

for (const { name: instrument, idPrefix, db } of INSTRUMENTS) {
  const chordRows = [];
  const positionRows = [];
  let skipped = 0;

  for (const bucket of Object.keys(db.chords)) {
    for (const chord of db.chords[bucket]) {
      const { suffix, positions } = chord;
      const key = KEY_ALIASES[chord.key] ?? chord.key;
      if (suffix.includes("/")) {
        skipped++;
        continue;
      }
      const id = idPrefix + slugOf(key, suffix);
      const category = categoryOf(suffix);
      const nameEn = key + printableSuffix(suffix);
      const suffixEs = SUFFIX_ES[suffix] ?? suffix;
      const nameEs = `${ROOT_ES[key]} ${suffixEs}`.trim();
      const { notes, intervals } = notesAndIntervals(key, positions[0].midi);
      const searchText = stripAccents(`${nameEn} ${nameEs} ${key} ${suffix}`).toLowerCase();

      chordRows.push(
        `(${[
          sqlText(id), sqlText(instrument), sqlText(key), sqlText(suffix), sqlText(nameEn),
          sqlText(nameEs), sqlText(category), CATEGORY_ORDER.indexOf(category),
          NOTE_ORDER.indexOf(key), sqlTextArr(notes), sqlTextArr(intervals),
          positions.length, sqlText(searchText),
        ].join(",")})`,
      );

      positions.forEach((p, i) => {
        positionRows.push(
          `(${[
            sqlText(id), i + 1, p.baseFret, sqlIntArr(p.frets), sqlIntArr(p.fingers),
            sqlIntArr(p.barres ?? []), p.capo ? "true" : "false",
          ].join(",")})`,
        );
      });
    }
  }

  let seed = `-- Seed del catálogo de acordes de ${instrument} (generado — no editar a mano).
-- Ejecutar DESPUÉS de las migraciones 00000000000001 y 00000000000005.
delete from public.chords where instrument = ${sqlText(instrument)};

`;
  for (const b of batches(chordRows, 200)) {
    seed += `insert into public.chords (id, instrument, key, suffix, name_en, name_es, category, category_order, note_order, notes, intervals, positions_count, search_text) values\n${b.join(",\n")};\n\n`;
  }
  for (const b of batches(positionRows, 200)) {
    seed += `insert into public.chord_positions (chord_id, position, base_fret, frets, fingers, barres, capo) values\n${b.join(",\n")};\n\n`;
  }

  writeFileSync(`supabase/seed_chords_${instrument}.sql`, seed);

  console.log(
    `${instrument}: ${chordRows.length} acordes, ${positionRows.length} posiciones ` +
      `(excluidos ${skipped} con bajo alterado), ${Math.round(seed.length / 1024)} KB`,
  );
}
