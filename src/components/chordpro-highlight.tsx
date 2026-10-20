import { Fragment, type ReactNode } from "react";
import { parseInstrumentalLine, sectionHeaderLabel } from "@/lib/chordpro";

/* Resaltado de sintaxis del modo texto del editor: una línea → nodos de texto
   React con color (nunca HTML del usuario). */

export function highlightLine(line: string, key: number): ReactNode {
  // [[Sección]]: encabezado (azul de directivas, en negrita)
  if (sectionHeaderLabel(line)) {
    return (
      <span key={key} className="font-bold text-directive">
        {line}
        {"\n"}
      </span>
    );
  }
  // {c: …}: nota para el músico (tenue, cursiva)
  if (/^\s*\{\s*(c|comment|ci|comment_italic)\s*:/i.test(line)) {
    return (
      <span key={key} className="italic text-tert">
        {line}
        {"\n"}
      </span>
    );
  }
  // Línea instrumental ("Em D Bm C x2"): acordes en cian, compás/repetición tenues
  const instrumental = parseInstrumentalLine(line);
  if (instrumental) {
    let cursor = 0;
    return (
      <span key={key}>
        {instrumental.tokens.map((tk, i) => {
          const gap = line.slice(cursor, tk.start);
          cursor = tk.end;
          return (
            <Fragment key={i}>
              {gap}
              <span
                className={
                  tk.kind === "chord" ? "font-semibold text-accent" : "text-mute"
                }
              >
                {line.slice(tk.start, tk.end)}
              </span>
            </Fragment>
          );
        })}
        {line.slice(cursor)}
        {"\n"}
      </span>
    );
  }
  if (/^\s*\{[^}]*\}\s*$/.test(line)) {
    return (
      <span key={key} className="text-directive">
        {line}
        {"\n"}
      </span>
    );
  }
  const parts = line.split(/(\[[^\]]*\])/g);
  return (
    <span key={key}>
      {parts.map((part, i) =>
        part.startsWith("[") && part.endsWith("]") ? (
          <span key={i} className="font-semibold text-accent">
            {part}
          </span>
        ) : (
          part
        ),
      )}
      {"\n"}
    </span>
  );
}
