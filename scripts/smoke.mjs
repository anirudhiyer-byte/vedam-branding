/**
 * Browser smoke test against a running build.
 *
 * This exists because two real bugs in this codebase were invisible to every
 * other check. Both were about *computed* CSS, which only a browser resolves:
 *
 *   1. `@theme inline` bakes a resolved value into each Tailwind utility, so
 *      `font-display` compiled to Outfit directly and the Studio's scoped
 *      Inter override was silently ignored. Types passed, lint passed, the
 *      build passed, the CSS looked correct on inspection.
 *   2. Tailwind utilities of equal specificity resolve by stylesheet order, not
 *      class-attribute order, so a `bg-orange` override on the dark-band CTA
 *      lost to the variant's `bg-violet` and the button rendered nearly
 *      invisible against the background it sat on.
 *
 * Deliberately not in CI: it needs a built app, a running server, and a browser
 * binary. Run it before a release.
 *
 *   pnpm build && pnpm start &
 *   pnpm run smoke
 *
 * Env:
 *   SMOKE_BASE_URL          default http://localhost:3000
 *   SMOKE_STUDIO_PASSWORD   set to also exercise the sign-in flow
 *   PLAYWRIGHT_CHROMIUM     explicit browser path, if Playwright cannot find one
 */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const PASSWORD = process.env.SMOKE_STUDIO_PASSWORD;

let failures = 0;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => {
  console.log(`FAIL  ${m}`);
  failures++;
};
const check = (ok, okMsg, failMsg) => (ok ? pass(okMsg) : fail(failMsg));

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM }
    : {},
);
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  // ---- Marketing site ----------------------------------------------------
  await page.goto(BASE, { waitUntil: "networkidle" });

  const h1 = (await page.locator("h1").first().innerText()).replace(/\n/g, " ");
  check(h1.includes("building it"), `hero: "${h1}"`, `hero was "${h1}"`);

  const description = await page.getAttribute('meta[name="description"]', "content");
  check(
    description?.includes("engineering school"),
    "meta description describes the school",
    `meta description is off-brand: ${description}`,
  );

  // Sections gated on real content must not render while it is absent.
  check(
    (await page.locator("#build").count()) === 0,
    "#build hidden while it has no real projects",
    "#build rendered with no real content",
  );
  for (const id of ["programme", "studio", "admissions"]) {
    check(
      (await page.locator(`#${id}`).count()) > 0,
      `#${id} renders`,
      `#${id} is missing`,
    );
  }

  // The nav's "Studio" link must reach studio content, not a testimonial.
  const studioHeading = await page.locator("#studio h2").first().innerText();
  check(
    studioHeading.toLowerCase().includes("vedam"),
    `#studio shows studio content: "${studioHeading}"`,
    `#studio heading is "${studioHeading}"`,
  );

  // Nothing fabricated survived the content rework.
  const body = await page.locator("body").innerText();
  const banned = [
    "Northwind",
    "Aperture Labs",
    "Priya Raghunathan",
    "Case studies are placeholders",
    "Brands shipped",
    "[SAMPLE]",
  ];
  const found = banned.filter((b) => body.includes(b));
  check(
    found.length === 0,
    "no fabricated content on the page",
    `fabricated content still present: ${found.join(", ")}`,
  );

  // Bug 1: the brandbook fonts must actually reach the marketing site.
  const bodyFont = await page.evaluate(
    () => getComputedStyle(document.body).fontFamily,
  );
  check(
    bodyFont.includes("Nunito"),
    `marketing body font is Nunito Sans`,
    `marketing body font is ${bodyFont}`,
  );
  const headingFont = await page.evaluate(
    () => getComputedStyle(document.querySelector("h1")).fontFamily,
  );
  check(
    headingFont.includes("Outfit"),
    "marketing display font is Outfit",
    `marketing display font is ${headingFont}`,
  );

  // Bug 2: the CTA on the dark band must be orange, not violet.
  const ctaBackground = await page
    .locator("#admissions a")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  check(
    ctaBackground === "rgb(249, 125, 3)",
    "admissions CTA is Vedams Orange on the dark band",
    `admissions CTA background is ${ctaBackground} — violet is near-invisible on Cetacean Blue`,
  );

  // ---- Accessibility -----------------------------------------------------
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  const trigger = await page
    .locator('button[aria-controls="mobile-nav"]')
    .boundingBox();
  check(
    trigger.width >= 44 && trigger.height >= 44,
    `mobile menu trigger is ${trigger.width}×${trigger.height}px`,
    `mobile menu trigger is ${trigger.width}×${trigger.height}px, under the 44px minimum`,
  );

  await page.setViewportSize({ width: 1280, height: 900 });

  // ---- Studio auth -------------------------------------------------------
  await page.goto(`${BASE}/studio`, { waitUntil: "networkidle" });
  check(
    page.url().includes("/studio/login"),
    "unauthenticated /studio redirects to login",
    `unauthenticated /studio landed on ${page.url()}`,
  );

  if (!PASSWORD) {
    console.log(
      "SKIP  sign-in flow — set SMOKE_STUDIO_PASSWORD to exercise it",
    );
  } else {
    await page.fill('input[name="password"]', "definitely-not-the-password");
    await page.click('button[type="submit"]');
    await page.waitForSelector("#login-error", { timeout: 15_000 });
    check(
      page.url().includes("/studio/login"),
      "a wrong password is refused",
      "a wrong password got through",
    );

    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/studio", { timeout: 20_000 });
    pass("the correct password signs in");

    const session = (await page.context().cookies()).find(
      (c) => c.name === "vedam_studio_session",
    );
    check(session?.httpOnly, "session cookie is httpOnly", "session cookie is readable by script");

    await page.waitForSelector("h1", { timeout: 30_000 });
    await page.waitForFunction(
      () => !document.body.innerText.includes("Loading the calendar"),
      null,
      { timeout: 30_000 },
    );

    // Bug 1 again, on the other side of the scope boundary.
    const studioFont = await page.evaluate(
      () => getComputedStyle(document.querySelector("h1")).fontFamily,
    );
    check(
      studioFont.includes("Inter"),
      "Studio headings are scoped to Inter",
      `Studio heading font is ${studioFont} — the .studio-ui scope is not applying`,
    );

    await page.click('button:has-text("Sign out")');
    await page.waitForURL("**/studio/login", { timeout: 15_000 });
    pass("sign out clears the session");
  }
} finally {
  await browser.close();
}

console.log(
  failures === 0
    ? "\nAll browser checks passed."
    : `\n${failures} browser check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
