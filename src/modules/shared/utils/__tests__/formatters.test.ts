// src/modules/shared/utils/__tests__/formatters.test.ts
// ============================================================
// Tests des fonctions de formatage
// ============================================================

import { describe, expect, it } from "vitest";
import { formatDate } from "../constants";
import { formatCurrency, formatDateShort, truncate } from "../formatters";

describe("formatDate", () => {
  it("formate une date ISO en format français", () => {
    const result = formatDate("2026-01-15");
    expect(result).toContain("15");
    expect(result).toContain("01");
    expect(result).toContain("2026");
  });

  it("formate un objet Date", () => {
    const result = formatDate(new Date(2026, 0, 15).toISOString());
    expect(result).toContain("15");
  });

  it("retourne un string", () => {
    expect(typeof formatDate("2026-06-01")).toBe("string");
  });
});

describe("formatCurrency", () => {
  it("formate en Ariary par défaut", () => {
    const result = formatCurrency(50000);
    expect(result).toContain("50");
    expect(typeof result).toBe("string");
  });

  it("formate avec devise personnalisée", () => {
    const result = formatCurrency(100, "EUR");
    expect(typeof result).toBe("string");
    expect(result).toContain("100");
  });

  it("gère les zéros", () => {
    const result = formatCurrency(0);
    expect(typeof result).toBe("string");
  });

  it("gère les grands nombres", () => {
    const result = formatCurrency(1000000);
    expect(typeof result).toBe("string");
  });
});

describe("truncate", () => {
  it("tronque une chaîne trop longue", () => {
    const long = "a".repeat(100);
    const result = truncate(long, 50);
    expect(result.length).toBeLessThanOrEqual(51); // 50 + '…'
    expect(result.endsWith("…")).toBe(true);
  });

  it("ne tronque pas une chaîne courte", () => {
    const short = "Hello";
    expect(truncate(short, 50)).toBe("Hello");
  });

  it("utilise la limite par défaut (50)", () => {
    const str = "a".repeat(51);
    const result = truncate(str);
    expect(result.endsWith("…")).toBe(true);
  });

  it("gère une chaîne vide", () => {
    expect(truncate("", 10)).toBe("");
  });
});
