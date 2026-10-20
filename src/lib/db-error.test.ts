import { describe, expect, it } from "vitest";
import { dbError, isDbDownDigest, isDbUnavailable } from "./db-error";

describe("isDbUnavailable", () => {
  it("sin código (red caída, proyecto pausado) es base inaccesible", () => {
    expect(isDbUnavailable({ message: "TypeError: fetch failed", code: "" })).toBe(true);
    expect(isDbUnavailable({ message: "x" })).toBe(true);
  });
  it("PostgREST sin conexión a Postgres y errores de gateway", () => {
    expect(isDbUnavailable({ message: "x", code: "PGRST002" }, 503)).toBe(true);
    expect(isDbUnavailable({ message: "x", code: "PGRST116" }, 504)).toBe(true);
    expect(isDbUnavailable({ message: "x", code: "PGRST116" }, 522)).toBe(true);
  });
  it("un error de consulta con código no lo es", () => {
    expect(isDbUnavailable({ message: "x", code: "42P01" }, 404)).toBe(false);
    expect(isDbUnavailable({ message: "x", code: "PGRST116" }, 406)).toBe(false);
    expect(isDbUnavailable({ message: "x", code: "57014" }, 500)).toBe(false);
  });
});

describe("dbError", () => {
  it("marca el digest solo si la base no respondió", () => {
    const down = dbError({ message: "fetch failed", code: "" }) as Error & {
      digest?: string;
    };
    const other = dbError({ message: "x", code: "42501" }, 403) as Error & {
      digest?: string;
    };
    expect(isDbDownDigest(down.digest)).toBe(true);
    expect(other.digest).toBeUndefined();
    expect(isDbDownDigest(undefined)).toBe(false);
    expect(isDbDownDigest("123456")).toBe(false);
  });
});
