"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleProduction } from "@/app/studio/actions";
import type { ProductionStage } from "@/lib/social/types";

/** Each stage gets its own brand hue so a row reads at a glance. */
const STAGE_COLOR: Record<ProductionStage, string> = {
  shoot: "#00cfe5",
  edit: "#8a18ff",
  posted: "#f97d03",
};

const STAGE_ICON: Record<ProductionStage, string> = {
  shoot: "🎥",
  edit: "✂️",
  posted: "🚀",
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

  const color = STAGE_COLOR[stage];
  const on = optimistic;

  return (
    <span className="relative inline-flex">
      {celebrate && (
        <span
          aria-hidden="true"
          className="animate-pop pointer-events-none absolute -top-1 left-1/2 text-lg"
        >
          🎉
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
            await toggleProduction(fd);
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
        className={`inline-flex h-7 min-w-[3.1rem] cursor-pointer items-center justify-center gap-1 rounded-full border text-xs transition-all disabled:opacity-50 ${
          on
            ? "font-semibold text-ink shadow-sm"
            : "border-rule text-ink-faint hover:border-ink-faint hover:bg-paper-alt"
        }`}
      >
        <span aria-hidden="true" className={on ? "" : "opacity-40 grayscale"}>
          {STAGE_ICON[stage]}
        </span>
        <span aria-hidden="true">{on ? "✓" : "–"}</span>
      </button>
    </span>
  );
}
