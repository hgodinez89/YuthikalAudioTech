import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import es from "../../messages/es.json";
import { clientMessages, COMMON_NAMESPACES, SECTION_NAMESPACES } from "./client-messages";

/* Todo archivo .ts/.tsx de src (los hooks de cliente pueden vivir en lib/). */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("textos de cliente", () => {
  it("cada namespace de useTranslations llega al navegador en algún grupo", () => {
    const used = new Set<string>();
    for (const file of sourceFiles(join(__dirname, ".."))) {
      for (const m of readFileSync(file, "utf8").matchAll(
        /useTranslations\(\s*"([^"]+)"/g,
      )) {
        used.add(m[1].split(".")[0]);
      }
    }
    const shipped = new Set([
      ...COMMON_NAMESPACES,
      ...Object.values(SECTION_NAMESPACES).flat(),
    ]);
    expect([...used].filter((ns) => !shipped.has(ns))).toEqual([]);
    // Y todos existen en los mensajes.
    expect([...shipped].filter((ns) => !(ns in es))).toEqual([]);
  });

  it("una sección recibe los comunes más los suyos, y nada más", () => {
    expect(Object.keys(clientMessages(es, "chords")).sort()).toEqual(
      [...COMMON_NAMESPACES, ...SECTION_NAMESPACES.chords].sort(),
    );
    expect(clientMessages(es)).not.toHaveProperty("landing");
  });
});
