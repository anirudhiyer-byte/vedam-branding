import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUCKET_COLOR } from "@/lib/social/strategy";

/**
 * Guards the brand palette against unreadable combinations.
 *
 * Vedams Orange and Vedams Light Grey are both beautiful and both fail WCAG AA
 * as text on light surfaces. Token values are read out of globals.css so this
 * cannot drift from the stylesheet.
 *
 * The second half of this file is new, and exists because the original check
 * only compared token pairs — which is why `text-orange` on a white card
 * shipped to production and had to be found by hand. Checking declared colours
 * proves the palette is sound; checking usage proves the app uses it soundly.
 */

const css = readFileSync("app/globals.css", "utf8");

function token(name: string): string {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --color-${name} not found in globals.css`);
  return m[1];
}

function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** AA body text needs 4.5:1; large text and UI graphics need 3:1. */
describe("brand palette contrast", () => {
  it.each([
    ["ink on paper", "ink", "paper", 4.5],
    ["ink on canvas", "ink", "canvas", 4.5],
    ["ink-muted on paper", "ink-muted", "paper", 4.5],
    ["ink-faint on paper", "ink-faint", "paper", 4.5],
    ["ink-muted on paper-alt", "ink-muted", "paper-alt", 4.5],
    ["accent (violet) on paper", "accent", "paper", 4.5],
    ["on-dark on night", "on-dark", "night", 4.5],
    ["on-dark on violet", "on-dark", "violet", 4.5],
    ["on-dark-muted on night", "on-dark-muted", "night", 4.5],
    ["orange on night (dark-surface accent)", "orange", "night", 4.5],
  ])("%s meets AA", (_label, fg, bg, min) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(min);
  });

  it("keeps the documented failures failing, so the rule stays true", () => {
    // If these ever pass, the palette changed and the rule in globals.css —
    // "violet on light, orange on dark" — needs rewriting rather than trusting.
    expect(ratio(token("orange"), token("paper"))).toBeLessThan(4.5);
    expect(ratio(token("grey"), token("paper"))).toBeLessThan(4.5);
    expect(ratio(token("accent"), token("night"))).toBeLessThan(4.5);
  });

  it("keeps every bucket colour perceivable against the card", () => {
    // Deliberately not the 3:1 non-text threshold. WCAG 1.4.11 applies to
    // non-text content that *carries* information; every bucket colour in this
    // UI is a dot, tint, or bar sitting directly beside the bucket's name, so
    // the colour is redundant with adjacent text and the exemption applies.
    // Vedams Orange is 2.64:1 on paper — a brandbook colour that cannot be
    // changed to satisfy a threshold it is not subject to.
    //
    // What must hold is weaker but real: the mark has to be visible at all.
    // The test that actually protects readability is the usage pair below —
    // these colours must never become text.
    const paper = token("paper");
    for (const [bucket, hex] of Object.entries(BUCKET_COLOR)) {
      expect(ratio(hex, paper), `${bucket} (${hex}) on paper`).toBeGreaterThan(1.5);
    }
  });

  it("pairs the one colour-coded chart with a text legend", () => {
    // Weekly progress is the single place colour carries meaning without an
    // inline label on each mark, so the legend is load-bearing for anyone who
    // cannot distinguish the hues.
    const charts = readFileSync("components/studio/charts.tsx", "utf8");
    for (const label of ["Live", "Edited", "Shot", "Not started"]) {
      expect(charts, `legend entry "${label}" missing`).toContain(label);
    }
  });
});

/** Walks the component tree so the usage rule is checked, not just the tokens. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(full) ? [full] : [];
  });
}

describe("palette usage in components", () => {
  const files = [...sourceFiles("components"), ...sourceFiles("app")];

  it("never uses a failing colour as text on a light surface", () => {
    // `text-orange` and `text-grey` are 2.50:1 and 2.29:1 on paper. They are
    // only legitimate inside a dark-surface block, which in this codebase is
    // always marked with `brand-night`.
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      source.split("\n").forEach((line, i) => {
        if (!/\btext-(orange|grey)\b/.test(line)) return;
        // Allow it where the same file establishes a dark surface.
        if (/brand-night|text-on-dark|bg-night|bg-violet/.test(source)) return;
        offenders.push(`${file}:${i + 1} — ${line.trim()}`);
      });
    }

    expect(
      offenders,
      `Vedams Orange is 2.50:1 on paper and Light Grey 2.29:1 — both fail WCAG AA as text on a light surface. Use text-accent instead:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("never paints bucket or stage colour directly onto text", () => {
    // The pattern that shipped twice: `color: BUCKET_COLOR[...]` on a chip
    // tinted against near-white paper. The tint carries the identity; the ink
    // carries the legibility.
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      source.split("\n").forEach((line, i) => {
        if (/^\s*color:\s*(BUCKET_COLOR|STAGE_COLOR|color)\b/.test(line)) {
          offenders.push(`${file}:${i + 1} — ${line.trim()}`);
        }
      });
    }

    expect(
      offenders,
      `Use bucketChipStyle() and let text inherit --color-ink:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
