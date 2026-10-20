"use client";

import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type PointerEvent } from "react";
import { Button } from "./button";

type Item = { id: string; name: string };

/**
 * Ordenar el setlist de una playlist: arrastrar con el asa (puntero, sin
 * librería) o los botones ↑/↓ (teclado y lectores de pantalla). Nada se
 * guarda hasta "Guardar orden".
 */
export function SetlistOrder({
  songs,
  pending,
  error,
  onCancel,
  onSave,
}: {
  songs: Item[];
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (ids: string[]) => void;
}) {
  const t = useTranslations("songs.setlist");
  const [order, setOrder] = useState(songs);
  const [announce, setAnnounce] = useState("");
  /* Arrastre en curso: fila, punto de partida y desplazamiento visible. */
  const [drag, setDrag] = useState<{ id: string; offset: number } | null>(null);
  const dragStart = useRef({ y: 0, rowHeight: 0 });

  const move = (index: number, delta: -1 | 1, focus = false) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setAnnounce(
      t("moved", { name: next[target].name, n: target + 1, total: next.length }),
    );
    // El botón que se usó sigue con el foco en la fila movida.
    if (focus) {
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLButtonElement>(
            `[data-setlist-row="${next[target].id}"] [data-dir="${delta}"]`,
          )
          ?.focus(),
      );
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    const row = e.currentTarget.closest<HTMLElement>("[data-setlist-row]");
    if (!row) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    // Alto de fila + separación: cuánto hay que arrastrar para pasar a la vecina.
    dragStart.current = { y: e.clientY, rowHeight: row.offsetHeight + 8 };
    setDrag({ id, offset: 0 });
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const { y, rowHeight } = dragStart.current;
    const dy = e.clientY - y;
    const index = order.findIndex((s) => s.id === drag.id);
    // Al pasar la mitad de la fila vecina, intercambian lugar.
    if (dy > rowHeight / 2 && index < order.length - 1) {
      move(index, 1);
      dragStart.current.y += rowHeight;
      setDrag({ id: drag.id, offset: dy - rowHeight });
    } else if (dy < -rowHeight / 2 && index > 0) {
      move(index, -1);
      dragStart.current.y -= rowHeight;
      setDrag({ id: drag.id, offset: dy + rowHeight });
    } else {
      setDrag({ id: drag.id, offset: dy });
    }
  };
  const onPointerUp = () => setDrag(null);

  const iconButton =
    "yk-hit relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-edge-2 bg-surface-2 text-sub hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div>
      <p className="mb-3 text-[13px] text-tert">{t("hint")}</p>
      <ol className="flex flex-col gap-2">
        {order.map((song, i) => {
          const dragging = drag?.id === song.id;
          return (
            <li
              key={song.id}
              data-setlist-row={song.id}
              className={`flex items-center gap-2 rounded-[14px] border bg-surface py-2 pl-2 pr-2.5 ${
                dragging ? "relative z-10 border-accent shadow-pop" : "border-edge"
              }`}
              style={dragging ? { transform: `translateY(${drag.offset}px)` } : undefined}
            >
              <button
                type="button"
                aria-label={t("drag", { name: song.name })}
                onPointerDown={(e) => onPointerDown(e, song.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                // Las flechas también sirven con el foco en el asa.
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                    move(i, e.key === "ArrowUp" ? -1 : 1);
                  }
                }}
                className="grid size-10 shrink-0 cursor-grab touch-none place-items-center rounded-[10px] text-mute hover:text-ink active:cursor-grabbing"
              >
                <GripVertical size={18} strokeWidth={2} />
              </button>
              <span className="w-7 shrink-0 text-center text-[13px] font-bold tabular-nums text-accent">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                {song.name}
              </span>
              <button
                type="button"
                data-dir={-1}
                onClick={() => move(i, -1, true)}
                disabled={i === 0}
                aria-label={t("up", { name: song.name })}
                className={iconButton}
              >
                <ArrowUp size={16} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                data-dir={1}
                onClick={() => move(i, 1, true)}
                disabled={i === order.length - 1}
                aria-label={t("down", { name: song.name })}
                className={iconButton}
              >
                <ArrowDown size={16} strokeWidth={2.2} />
              </button>
            </li>
          );
        })}
      </ol>
      <p role="status" className="sr-only">
        {announce}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-[13px] font-semibold text-warn">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2.5">
        <Button onClick={onCancel} disabled={pending}>
          {t("cancel")}
        </Button>
        <Button
          variant="primary"
          onClick={() => onSave(order.map((s) => s.id))}
          disabled={pending}
        >
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
