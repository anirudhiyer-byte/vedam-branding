/**
 * Guards the brand palette against unreadable combinations.
 *
 * Vedams Orange and Vedams Light Grey are beautiful and both fail WCAG AA as
 * text on light backgrounds. This asserts the pairings the UI actually uses,
 * reading the real token values out of app/globals.css so the check cannot
 * drift from the stylesheet.
 */
import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");
const strategy = readFileSync("lib/social/strategy.ts", "utf8");

/** Pulls a Record<string, "#hex"> literal out of a source file. */
function hexMap(constName: string): Record<string, string> {
  const block = strategy.slice(strategy.indexOf(`export const ${constName}`));
  const body = block.slice(block.indexOf("{"), block.indexOf("};"));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(\w+):\s*"(#[0-9a-fA-F]{6})"/g)) {
    out[m[1]] = m[2];
  }
  if (Object.keys(out).length === 0) throw new Error(`no colours in ${constName}`);
  return out;
}

const BUCKET_COLOR = hexMap("BUCKET_COLOR");
const STAGE_COLOR = {
  shoot: "#00cfe5",
  edit: "#8a18ff",
  posted: "#f97d03",
};

function token(name: string): string {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --color-${name} not found in globals.css`);
  return m[1];
}

function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const [r, g, b] = ch.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

let failures = 0;

/** AA body text needs 4.5:1; large text and UI graphics need 3:1. */
function needs(label: string, fg: string, bg: string, min: number) {
  const r = ratio(token(fg), token(bg));
  const ok = r >= min;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label.padEnd(44)} ${r.toFixed(2)}:1 (needs ${min})`,
  );
  if (!ok) failures++;
}

/** Asserts a pairing is genuinely unusable, so the rule stays documented. */
function mustFail(label: string, fg: string, bg: string) {
  const r = ratio(token(fg), token(bg));
  const ok = r < 4.5;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label.padEnd(44)} ${r.toFixed(2)}:1 (must stay < 4.5)`,
  );
  if (!ok) failures++;
}

console.log("— text on light surfaces —");
needs("ink on paper", "ink", "paper", 4.5);
needs("ink on paper-alt", "ink", "paper-alt", 4.5);
needs("ink-muted on paper", "ink-muted", "paper", 4.5);
needs("ink-muted on paper-alt", "ink-muted", "paper-alt", 4.5);
needs("ink-faint on paper", "ink-faint", "paper", 4.5);
needs("accent (violet) on paper", "accent", "paper", 4.5);
needs("accent (violet) on paper-alt", "accent", "paper-alt", 4.5);
needs("accent on accent-soft", "accent", "accent-soft", 4.5);

console.log("\n— text on dark brand surfaces —");
needs("on-dark on violet", "on-dark", "violet", 4.5);
needs("on-dark on night", "on-dark", "night", 4.5);
needs("on-dark-muted on violet", "on-dark-muted", "violet", 4.5);
needs("on-dark-muted on night", "on-dark-muted", "night", 4.5);
needs("orange on night (dark accent)", "orange", "night", 4.5);
needs("orange on violet (dark accent)", "orange", "violet", 4.5);

console.log("\n— button fills —");
needs("on-dark on violet button", "on-dark", "violet", 4.5);
needs("on-dark on eviolet hover", "on-dark", "eviolet", 4.5);

console.log("\n— the rules that keep orange and grey out of body text —");
mustFail("orange as text on paper", "orange", "paper");
mustFail("grey as text on paper", "grey", "paper");
mustFail("eviolet as text on night", "accent", "night");

/**
 * Bucket chips and status pills tint a vivid hue against the page and put ink
 * text on top. Approximates the CSS color-mix in sRGB — close enough to catch
 * a hue that would make its chip unreadable.
 */
function mix(hex: string, pct: number, base: string): string {
  const parse = (h: string) =>
    [0, 2, 4].map((i) => parseInt(h.replace("#", "").slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(base);
  const m = (a: number, b: number) => Math.round(a * pct + b * (1 - pct));
  return (
    "#" +
    [m(r1, r2), m(g1, g2), m(b1, b2)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

console.log("\n— ink on bucket chips (16% tint) and status pills (22% tint) —");
const paper = token("paper");
const ink = token("ink");
for (const [name, hex] of Object.entries(BUCKET_COLOR)) {
  const chip = mix(hex, 0.16, paper);
  const r = ratio(ink, chip);
  const ok = r >= 4.5;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${("chip " + name).padEnd(44)} ${r.toFixed(2)}:1 (needs 4.5)`,
  );
  if (!ok) failures++;
}
for (const [stage, hex] of Object.entries(STAGE_COLOR)) {
  const pill = mix(hex, 0.22, paper);
  const r = ratio(ink, pill);
  const ok = r >= 4.5;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${("pill " + stage).padEnd(44)} ${r.toFixed(2)}:1 (needs 4.5)`,
  );
  if (!ok) failures++;
}

console.log(
  failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
