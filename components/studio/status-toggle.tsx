"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleProduction } from "@/app/studio/actions";
import type { ProductionStage } from "@/lib/social/types";
import { Icon, STAGE_ICON } from "./icons";

/** Each stage gets its own brand hue so a row reads at a glance. */
const STAGE_COLOR: Record<ProductionStage, string> = {
  shoot: "#00cfe5",
  edit: "#8a18ff",
  posted: "#f97d03",
};

export function StatusToggle({
  monthId,
  itemId,
  stage,
  checked,
  label,
}: {
  monthId: string;
  itemId: string;
  stage: ProductionStage;
  checked: boolean;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [celebrate, setCelebrate] = useState(false);
  const [failed, setFailed] = useState(false);

  const color = STAGE_COLOR[stage];
  const on = optimistic;

  return (
    <span className="relative inline-flex">
      {celebrate && (
        <span
          aria-hidden="true"
          className="animate-pop pointer-events-none absolute -top-2 left-1/2 text-accent"
        >
          <Icon name="sparkle" className="size-4" />
        </span>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={pending}
        onClick={() => {
          const value = !on;
          setFailed(false);

          // Only celebrate going live, and only on the way up.
          if (value && stage === "posted") {
            setCelebrate(true);
            setTimeout(() => setCelebrate(false), 900);
          }

          startTransition(async () => {
            setOptimistic(value);
            const fd = new FormData();
            fd.set("monthId", monthId);
            fd.set("itemId", itemId);
            fd.set("stage", stage);
            fd.set("value", String(value));
            try {
              await toggleProduction(fd);
            } catch {
              // The optimistic value reverts on its own when the transition
              // ends without a matching server render. Without this the tick
              // silently sprang back with no explanation — most often because
              // the session had expired.
              setFailed(true);
            }
          });
        }}
        style={
          on
            ? {
                // Tinted against the page so ink text stays readable on any hue.
                backgroundColor: `color-mix(in oklab, ${color} 22%, var(--color-paper))`,
                borderColor: color,
              }
            : undefined
        }
        // min-h-11 keeps the tap target at the 44px minimum without changing
        // the visual pill height, which the table layout depends on.
        className={`inline-flex h-7 min-h-11 min-w-[3.4rem] cursor-pointer items-center justify-center gap-1 rounded-full border text-xs transition-all disabled:opacity-50 ${
          on
            ? "font-semibold text-ink shadow-sm"
            : "border-rule text-ink-faint hover:border-ink-faint hover:bg-paper-alt"
        }`}
      >
        <Icon
          name={STAGE_ICON[stage]}
          className={on ? "size-3.5" : "size-3.5 opacity-45"}
        />
        <Icon name={on ? "check" : "dash"} className="size-3" strokeWidth={2.5} />
      </button>

      {failed && (
        <span role="alert" className="sr-only">
          Could not save {label}. Reload and sign in again.
        </span>
      )}
    </span>
  );
}
