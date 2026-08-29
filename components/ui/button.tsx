import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * The one place a button or call-to-action is styled.
 *
 * Before this existed, "Start a project" rendered three different ways on the
 * same page — a filled pill in the header, an outlined pill in the hero, and
 * bare text in the mobile menu — so the site never taught a visitor what its
 * primary action looks like. Variation is fine when it is chosen; three
 * variants for one action was not.
 */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "brand"
  | "onDark";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "whitespace-nowrap transition-colors disabled:cursor-not-allowed " +
  "disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  // Violet on light: the documented interactive colour, 5.46:1 on paper.
  primary: "bg-violet text-on-dark hover:bg-eviolet",
  secondary: "border border-ink/20 text-ink hover:border-ink hover:bg-paper-alt",
  ghost: "text-ink-muted hover:text-ink",
  // Reserved for the single most important action on a dark or hero surface.
  brand: "brand-gradient-bg text-on-dark shadow-tile hover:-translate-y-0.5",
  // The primary action on a dark brand surface. Orange, not violet — this is
  // the "orange on dark" half of the contrast rule, and it is about the button
  // being *visible*: Vedams Violet is nearly indistinguishable from Cetacean
  // Blue behind it, while Orange is 7.25:1 against the same ground.
  //
  // This is a variant rather than a `className` override on `primary` for a
  // concrete reason: Tailwind utilities of equal specificity are resolved by
  // stylesheet order, not by class-attribute order, so `bg-orange` passed
  // alongside `primary` loses to `bg-violet` and the button silently renders
  // in the colour the rule forbids. It did exactly that until this existed.
  onDark: "bg-orange text-night hover:bg-orange/90",
};

/**
 * Every size clears the 44×44px minimum touch target from WCAG 2.5.5 — `sm`
 * reaches it through padding on the tappable box, not just the visible text.
 */
const SIZES: Record<ButtonSize, string> = {
  sm: "h-11 px-4 text-sm",
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

function classesFor(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
) {
  return [BASE, VARIANTS[variant], SIZES[size], className]
    .filter(Boolean)
    .join(" ");
}

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: StyleProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button className={classesFor(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

/**
 * A call-to-action rendered as a link. Internal hrefs go through `next/link`;
 * anything external falls back to `<a>` with the safe `rel` already applied,
 * so no call site has to remember `noopener`.
 */
export function CtaLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  external,
  ...props
}: StyleProps & {
  href: string;
  children: ReactNode;
  external?: boolean;
} & Omit<ComponentPropsWithoutRef<"a">, "href">) {
  const classes = classesFor(variant, size, className);
  const isExternal = external ?? /^https?:\/\//.test(href);

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
