import { describe, expect, it } from "vitest";
import { isOfflineCacheable, staticAssets } from "./offline-cache";
import { instrumentDownloadUrls } from "./offline-download";
import { offlineHash, parseOfflineHash } from "./use-offline-instruments";

describe("instrumentDownloadUrls", () => {
  it("guitarra: básicos, afinador, acordes, 144 escalas y catálogo", () => {
    const urls = instrumentDownloadUrls("es", "guitar");
    expect(urls).toHaveLength(148);
    expect(urls).toContain("/es/guitar/basics/tuner");
    expect(urls).toContain("/es/guitar/scales/csharp-dorian");
    expect(urls.at(-1)).toBe("/catalog/guitar.json");
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("piano: sin afinador", () => {
    const urls = instrumentDownloadUrls("en", "piano");
    expect(urls).toHaveLength(147);
    expect(urls).not.toContain("/en/piano/basics/tuner");
  });

  it("todas las páginas son de las que se guardan para sin conexión", () => {
    const pages = instrumentDownloadUrls("es", "ukulele").filter((u) =>
      u.startsWith("/es/"),
    );
    expect(pages.every(isOfflineCacheable)).toBe(true);
  });
});

describe("staticAssets", () => {
  it("saca los archivos de Next sin repetir ni arrastrar comillas o escapes", () => {
    const html = `<link rel="stylesheet" href="/_next/static/chunks/a1.css?dpl=dpl_X1">
      <script src="/_next/static/chunks/b2.js" async></script>
      <script>self.__next_f.push([1,"0:[\\"/_next/static/chunks/b2.js\\",\\"/_next/static/media/f.woff2\\"]"])</script>
      <img src="/logo.svg">`;
    expect(staticAssets(html)).toEqual([
      "/_next/static/chunks/a1.css?dpl=dpl_X1",
      "/_next/static/chunks/b2.js",
      "/_next/static/media/f.woff2",
    ]);
  });
});

describe("parseOfflineHash", () => {
  it("lee el instrumento del enlace a la descarga y rechaza lo demás", () => {
    expect(parseOfflineHash(offlineHash("piano"))).toBe("piano");
    expect(parseOfflineHash("#offline-ukulele")).toBe("ukulele");
    expect(parseOfflineHash("#offline-bass")).toBeNull();
    expect(parseOfflineHash("#offline-guitar/x")).toBeNull();
    expect(parseOfflineHash("")).toBeNull();
  });
});
