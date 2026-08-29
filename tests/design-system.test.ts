import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Design-system invariants that are otherwise only visible in a browser.
 */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx$/.test(full) ? [full] : [];
  });
}

const files = [...sourceFiles("components"), ...sourceFiles("app")];

describe("shared CTA component", () => {
  it("never has a call site override the variant's background", () => {
    // Tailwind utilities of equal specificity resolve by stylesheet order, not
    // by the order they appear in the class attribute. So passing `bg-orange`
    // in `className` alongside a variant that sets `bg-violet` silently loses,
    // and the button renders in the colour the caller was trying to avoid.
    // This shipped once: the admissions CTA on the dark band came out violet,
    // barely distinguishable from the Cetacean Blue behind it. Use a variant.
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      // Look inside each <CtaLink .../> or <Button .../> element.
      for (const m of source.matchAll(/<(CtaLink|Button)\b[^>]*>/g)) {
        const tag = m[0];
        if (!/className=/.test(tag)) continue;
        const className = /className="([^"]*)"/.exec(tag)?.[1] ?? "";
        if (/\bbg-\S+/.test(className)) {
          offenders.push(`${file} — ${tag.replace(/\s+/g, " ").slice(0, 120)}`);
        }
      }
    }

    expect(
      offenders,
      `Add a variant to components/ui/button.tsx instead:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("is the only place a pill CTA is styled", () => {
    // The finding this component exists to fix: one action, three unrelated
    // treatments across header, hero and mobile menu.
    const button = readFileSync("components/ui/button.tsx", "utf8");
    expect(button).toContain("rounded-full");

    const marketing = ["components/site-header.tsx", "components/sections/hero.tsx"];
    for (const file of marketing) {
      const source = readFileSync(file, "utf8");
      expect(source, `${file} should use the shared CTA`).toMatch(
        /CtaLink|Button/,
      );
      // No hand-rolled pill buttons alongside it.
      expect(
        source,
        `${file} still hand-rolls a pill button`,
      ).not.toMatch(/className="[^"]*rounded-full[^"]*bg-violet/);
    }
  });
});

describe("touch targets", () => {
  it("gives the mobile menu trigger a 44px box", () => {
    // p-2 around a 22px icon is ~38px, under the WCAG 2.5.5 minimum.
    const header = readFileSync("components/site-header.tsx", "utf8");
    expect(header).not.toMatch(/className="-mr-2 p-2 md:hidden"/);
    expect(header).toMatch(/p-3 md:hidden/);
  });
});

describe("focus styles", () => {
  it("has exactly one focus treatment, defined globally", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid/);

    // A local `focus:outline-*` fires on mouse clicks too and sets only the
    // colour, giving keyboard users a different indicator in one place.
    // Comments are excluded — month-picker.tsx names the override it removed.
    const offenders = files.filter((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .some(
          (line) =>
            !/^\s*(\/\/|\/\*|\*)/.test(line) &&
            /focus:outline-(?!none)/.test(line),
        ),
    );
    expect(offenders, `local focus overrides in: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("icon language", () => {
  it("uses the stroke-SVG set rather than emoji in the Studio", () => {
    // Emoji render at different weights, colours and baselines per OS, so the
    // same table looked different on a Mac and a Windows laptop.
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2190}-\u{21FF}\u{25A0}-\u{25FF}]/u;
    const offenders: string[] = [];

    for (const file of sourceFiles("components/studio")) {
      const source = readFileSync(file, "utf8");
      source.split("\n").forEach((line, i) => {
        const trimmed = line.trim();
        // Comments are prose and may legitimately name the glyphs they replaced
        // (icons.tsx documents exactly which emoji it exists to remove) or use
        // an arrow in an explanation. Only rendered code counts.
        if (/^(\/\/|\/\*|\*)/.test(trimmed)) return;
        if (emoji.test(line)) offenders.push(`${file}:${i + 1} — ${trimmed}`);
      });
    }

    expect(
      offenders,
      `Use <Icon> from components/studio/icons.tsx:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});

describe("fonts", () => {
  it("does not use @theme inline for the font slots", () => {
    // With `inline`, Tailwind bakes the resolved value into each utility, so
    // `font-display` compiles to Outfit directly and the `.studio-ui` scoped
    // override is silently ignored — the Studio renders in the marketing
    // typeface with no error anywhere.
    const css = readFileSync("app/globals.css", "utf8");
    const inlineBlocks = [...css.matchAll(/@theme inline \{([^}]*)\}/g)];
    for (const block of inlineBlocks) {
      expect(block[1], "font slots must not be in an @theme inline block").not.toMatch(
        /--font-(display|sans|mono):/,
      );
    }
  });

  it("scopes Inter to the Studio rather than applying it site-wide", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.studio-ui\s*\{[^}]*--font-display:\s*var\(--font-inter\)/);
    expect(readFileSync("app/studio/layout.tsx", "utf8")).toContain("studio-ui");
  });
});

describe("build scripts", () => {
  it("generates Next's route types before typechecking", () => {
    // `PageProps` and `LayoutProps` are emitted by `next typegen`, not written
    // by hand. Running `tsc --noEmit` without it fails on any fresh checkout —
    // which is what CI is, and why this passed locally and broke there.
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.scripts.typecheck).toContain("next typegen");
  });
});
