"use client";

import { useRef, type RefObject } from "react";
import { invertPoints, mapScroll } from "./scroll-sync";

/* Editor y vista previa lado a lado (breakpoint lg): solo ahí se vincula el scroll. */
const SIDE_BY_SIDE = "(min-width: 64rem)";

/**
 * Scroll vinculado entre el texto ChordPro y la vista previa: cada sección es
 * un ancla (su línea de inicio en el texto, su bloque `[data-section]` en la
 * vista previa) y entre anclas se interpola. El scroll que se aplica a un
 * panel se recuerda para ignorar su evento de vuelta (sin rebote).
 */
export function useLinkedScroll({
  textRef,
  previewRef,
  sectionStartLines,
}: {
  textRef: RefObject<HTMLTextAreaElement | null>;
  previewRef: RefObject<HTMLDivElement | null>;
  /** Línea de inicio de cada sección en el texto, en orden. */
  sectionStartLines: number[];
}) {
  const echo = useRef(new Map<Element, number>());

  /** Lleva el otro panel a la posición equivalente. */
  const follow = (fromText: boolean) => {
    const text = textRef.current;
    const preview = previewRef.current;
    if (!text || !preview || !window.matchMedia(SIDE_BY_SIDE).matches) return;
    const source = fromText ? text : preview;
    const target = fromText ? preview : text;
    const last = echo.current.get(source);
    if (last !== undefined) {
      echo.current.delete(source);
      if (Math.abs(source.scrollTop - last) < 2) return;
    }

    const textStyle = getComputedStyle(text);
    const lineHeight =
      parseFloat(textStyle.lineHeight) || parseFloat(textStyle.fontSize) * 1.85;
    const previewPad = parseFloat(getComputedStyle(preview).paddingTop) || 0;
    const blocks = preview.querySelectorAll<HTMLElement>("[data-section]");
    const points = sectionStartLines.flatMap((startLine, i) =>
      blocks[i]
        ? [{ from: startLine * lineHeight, to: blocks[i].offsetTop - previewPad }]
        : [],
    );
    const textMax = text.scrollHeight - text.clientHeight;
    const previewMax = preview.scrollHeight - preview.clientHeight;
    const top = fromText
      ? mapScroll(points, textMax, previewMax, text.scrollTop)
      : mapScroll(invertPoints(points), previewMax, textMax, preview.scrollTop);
    if (Math.abs(target.scrollTop - top) < 1) return;
    target.scrollTop = top;
    echo.current.set(target, target.scrollTop);
  };

  return {
    onTextScroll: () => follow(true),
    onPreviewScroll: () => follow(false),
    /** Al vincular: olvida ecos viejos y alinea la vista previa con el texto. */
    relink: () => {
      echo.current.clear();
      follow(true);
    },
    unlink: () => echo.current.clear(),
  };
}
