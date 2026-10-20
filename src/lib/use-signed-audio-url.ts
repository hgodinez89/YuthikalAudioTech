"use client";

import { useEffect, useState } from "react";

/* Vigencia de la URL firmada y margen para renovarla antes de que venza. */
const TTL_SECONDS = 3600;
const RENEW_BEFORE_SECONDS = 300;

type Signed = { path: string; url: string | null; error: boolean };

/**
 * URL firmada de un MP3 del bucket privado `audio`. Se renueva sola antes de
 * vencer (el motor cambia la URL sin cortar la reproducción) y `error` avisa
 * si no se pudo obtener. supabase-js se carga recién aquí.
 */
export function useSignedAudioUrl(path: string | null): {
  url: string | null;
  error: boolean;
} {
  const [signed, setSigned] = useState<Signed | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const sign = async () => {
      let url: string | null = null;
      try {
        const { supabaseBrowser } = await import("./supabase");
        const { data } = await supabaseBrowser()
          .storage.from("audio")
          .createSignedUrl(path, TTL_SECONDS);
        url = data?.signedUrl ?? null;
      } catch {
        url = null;
      }
      if (cancelled) return;
      // Si una renovación falla, se conserva la URL vigente.
      setSigned((prev) =>
        url
          ? { path, url, error: false }
          : prev?.path === path && prev.url
            ? prev
            : { path, url: null, error: true },
      );
      timer = setTimeout(sign, (url ? TTL_SECONDS - RENEW_BEFORE_SECONDS : 30) * 1000);
    };
    void sign();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [path]);

  return signed && signed.path === path
    ? { url: signed.url, error: signed.error }
    : { url: null, error: false };
}
