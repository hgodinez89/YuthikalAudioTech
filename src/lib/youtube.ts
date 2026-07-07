/** Extrae el ID de video de una URL de YouTube; null si no es válida. */
export function parseYouTubeId(url: string): string | null {
  const ID = /^[A-Za-z0-9_-]{11}$/;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const host = parsed.hostname.replace(/^www\.|^m\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return ID.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "music.youtube.com") {
    // /watch?v=ID
    const v = parsed.searchParams.get("v");
    if (v && ID.test(v)) return v;
    // /embed/ID · /shorts/ID · /live/ID
    const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
    if (match) return match[1];
  }

  return null;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
