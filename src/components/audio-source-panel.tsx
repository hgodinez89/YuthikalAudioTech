"use client";

/* eslint-disable @next/next/no-img-element -- miniatura externa de YouTube */
import { FileMusic, Link2, Play, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "./button";
import { ConfirmDialog } from "./confirm-dialog";
import { formatTime, MAX_MP3_BYTES, MP3_ENABLED, type SongAudioRow } from "@/lib/audio";
import { setFileAudio, setYouTubeAudio } from "@/lib/audio-actions";
import { parseYouTubeId, youtubeThumbnail } from "@/lib/youtube";

/**
 * Fuente de audio de la sincronización: video de YouTube o MP3 (en
 * "Próximamente"). Conectar otro audio borra la sincronización anterior (sus
 * tiempos son de otra grabación): con marcas, se confirma antes.
 */
export function AudioSourcePanel({
  songId,
  audio,
  duration,
  marks,
  fileError,
  onBeforeChange,
}: {
  songId: string;
  audio: SongAudioRow | null;
  /** Duración del audio conectado (0 mientras carga). */
  duration: number;
  /** Marcas actuales (y fin): si hay, cambiar de audio pide confirmación. */
  marks: number;
  /** No se pudo obtener el MP3 conectado. */
  fileError: boolean;
  /** Lo pendiente era del audio anterior: el padre lo descarta. */
  onBeforeChange: () => void;
}) {
  const t = useTranslations("calibration");
  const router = useRouter();
  const urlId = useId();
  const [tab, setTab] = useState<"youtube" | "file">(audio?.source ?? "youtube");
  /* Subida de MP3 en "Próximamente": la pestaña solo se abre si ya hay un MP3. */
  const fileTabEnabled = MP3_ENABLED || audio?.source === "file";
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestYouTube = () => {
    const videoId = parseYouTubeId(urlInput);
    const replaces =
      audio !== null && (audio.source !== "youtube" || audio.youtube_id !== videoId);
    if (videoId && replaces && marks > 0) {
      setConfirmOpen(true);
      return;
    }
    void connectYouTube();
  };

  const connectYouTube = async () => {
    setConfirmOpen(false);
    setConnecting(true);
    setError(null);
    onBeforeChange();
    const result = await setYouTubeAudio(songId, urlInput).catch(() => null);
    setConnecting(false);
    if (!result?.ok) {
      setError(t(`errors.${result?.error ?? "network"}`));
      return;
    }
    setUrlInput("");
    router.refresh();
  };

  const uploadFile = async (file: File) => {
    setError(null);
    if (file.type !== "audio/mpeg") {
      setError(t("errors.fileType"));
      return;
    }
    if (file.size > MAX_MP3_BYTES) {
      setError(t("errors.fileSize"));
      return;
    }
    setUploading(true);
    try {
      const { supabaseBrowser } = await import("@/lib/supabase");
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(t("errors.auth"));
        return;
      }
      const path = `${user.id}/${songId}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from("audio")
        .upload(path, file, { upsert: true, contentType: "audio/mpeg" });
      if (uploadError) {
        setError(t("errors.upload"));
        return;
      }
      onBeforeChange();
      const result = await setFileAudio(songId, path);
      if (!result.ok) {
        setError(t(`errors.${result.error}`));
        return;
      }
      router.refresh();
    } catch {
      setError(t("errors.network"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-edge bg-surface">
      <div className="border-b border-edge px-4 py-3.5">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-tert">
          {t("sourceTitle")}
        </h2>
      </div>
      <div className="p-4">
        <div className="mb-3.5 flex rounded-[10px] border border-edge bg-surface-3 p-1 text-[13px] font-semibold">
          {(["youtube", "file"] as const).map((key) => {
            const disabled = key === "file" && !fileTabEnabled;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                disabled={disabled}
                aria-pressed={tab === key}
                title={disabled ? t("fileSoonHint") : undefined}
                className={
                  tab === key
                    ? "yk-gradient flex-1 cursor-pointer whitespace-nowrap rounded-lg px-2 py-[7px]"
                    : "inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-[7px] text-sub disabled:cursor-not-allowed disabled:text-disabled"
                }
              >
                {key === "youtube" ? "YouTube" : t("fileTab")}
                {/* Etiqueta corta: el aviso completo va en el title y en la pestaña. */}
                {disabled && <Badge>{t("soonShort")}</Badge>}
              </button>
            );
          })}
        </div>

        {tab === "youtube" && (
          <div>
            <div className="relative mb-3 flex items-center">
              <Link2 size={15} strokeWidth={2} className="absolute left-3 text-mute" />
              <label htmlFor={urlId} className="sr-only">
                {t("urlPlaceholder")}
              </label>
              <input
                id={urlId}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && requestYouTube()}
                placeholder={t("urlPlaceholder")}
                className="h-10 w-full rounded-[10px] border border-edge bg-surface-2 pl-9 pr-20 text-[13px] text-ink outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={requestYouTube}
                disabled={connecting || !urlInput.trim()}
                className="yk-gradient absolute right-1.5 cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                {connecting ? t("connecting") : t("connect")}
              </button>
            </div>
            {audio?.source === "youtube" && audio.youtube_id && (
              <div className="flex gap-3 rounded-xl border border-edge-2 bg-surface-2 p-2.5">
                <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                  <img
                    src={youtubeThumbnail(audio.youtube_id)}
                    alt=""
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="grid size-[26px] place-items-center rounded-full bg-page/70">
                      <Play size={12} fill="#fff" strokeWidth={0} className="ml-px" />
                    </span>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col justify-center">
                  <div className="mb-[3px] flex items-center gap-1.5 text-[10.5px] font-bold text-accent">
                    <span className="size-1.5 rounded-full bg-accent" />
                    {t("connected")}
                  </div>
                  <div className="line-clamp-2 text-[13px] font-semibold leading-[1.25]">
                    {audio.youtube_title ?? audio.youtube_id}
                  </div>
                  {duration > 0 && (
                    <div className="mt-0.5 text-[11.5px] text-tert">
                      {formatTime(duration)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "file" && (
          <div>
            {!MP3_ENABLED && (
              <p className="mb-3 text-[12.5px] text-tert">{t("fileSoonHint")}</p>
            )}
            {MP3_ENABLED && (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) void uploadFile(file);
                }}
                className="flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-edge-2 bg-surface-2 px-4 py-7 text-center hover:border-accent has-[:focus-visible]:border-accent"
              >
                {/* Oculto a la vista pero alcanzable con Tab (no display:none). */}
                <input
                  type="file"
                  accept="audio/mpeg,.mp3"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadFile(file);
                  }}
                />
                <Upload size={28} strokeWidth={1.8} className="text-accent" />
                <div className="text-[13.5px] font-semibold">
                  {uploading ? t("uploading") : t("dropTitle")}
                </div>
                <div className="text-xs text-tert">{t("dropHint")}</div>
              </label>
            )}
            {audio?.source === "file" && audio.file_path && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-edge-2 bg-surface-2 p-2.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                  <FileMusic size={18} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <div className="mb-[3px] flex items-center gap-1.5 text-[10.5px] font-bold text-accent">
                    <span className="size-1.5 rounded-full bg-accent" />
                    {t("connected")}
                  </div>
                  <div className="truncate text-[13px] font-semibold">
                    {audio.file_path.split("/").pop()}
                  </div>
                  {duration > 0 && (
                    <div className="mt-0.5 text-[11.5px] text-tert">
                      {formatTime(duration)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {(error || (fileError && audio?.source === "file")) && (
          <p role="alert" className="mt-3 text-[12.5px] font-semibold text-warn">
            {error ?? t("errors.fileLoad")}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t("sourceChangeTitle")}
        message={t("sourceChangeMessage", { count: marks })}
        cancelLabel={t("cancel")}
        confirmLabel={t("sourceChangeConfirm")}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void connectYouTube()}
      />
    </div>
  );
}
