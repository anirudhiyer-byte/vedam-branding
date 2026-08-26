"use client";

import { useState } from "react";
import { BUCKET_COLOR, BUCKET_LABEL, FORMAT_LABEL } from "@/lib/social/strategy";
import type { ContentItem } from "@/lib/social/types";
import { StatusToggle } from "./status-toggle";
import { LiveLinkCell } from "./live-link-cell";

function BucketChip({ bucket }: { bucket: ContentItem["bucket"] }) {
  const color = BUCKET_COLOR[bucket];
  return (
    <span
      // Tinted against the page so ink text stays readable on every hue.
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 16%, var(--color-paper))`,
        borderColor: `color-mix(in oklab, ${color} 45%, var(--color-paper))`,
      }}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap text-ink"
    >
      <span
        aria-hidden="true"
        style={{ backgroundColor: color }}
        className="size-2 rounded-full"
      />
      {BUCKET_LABEL[bucket]}
    </span>
  );
}

function FormatChip({ format }: { format: ContentItem["format"] }) {
  return (
    <span className="font-semibold whitespace-nowrap text-ink-muted">
      {FORMAT_LABEL[format]}
    </span>
  );
}

function formatHashtags(tags: string[]): string {
  return tags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
}

/** Caption plus hashtags — what actually gets pasted into the platform. */
function fullCaption(item: ContentItem): string {
  const tags = formatHashtags(item.hashtags);
  return tags ? `${item.caption}\n\n${tags}` : item.caption;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        try {
          // Unavailable on insecure origins; surface that instead of failing mute.
          await navigator.clipboard.writeText(text);
          setState("done");
        } catch {
          setState("failed");
        }
        setTimeout(() => setState("idle"), 1600);
      }}
      className="rounded border border-rule px-1.5 py-0.5 font-mono text-[0.625rem] text-ink-faint transition-colors hover:border-ink hover:text-ink"
    >
      {state === "done" ? "copied" : state === "failed" ? "blocked" : "copy"}
    </button>
  );
}

function ExpandedDetail({ item }: { item: ContentItem }) {
  return (
    <div
      style={{
        backgroundColor: `color-mix(in oklab, ${BUCKET_COLOR[item.bucket]} 8%, var(--color-paper))`,
        borderTop: `2px solid ${BUCKET_COLOR[item.bucket]}`,
      }}
      className="animate-rise grid gap-5 px-4 py-5 md:grid-cols-2"
    >
      <div>
        <h4 className="eyebrow">Hook</h4>
        <p className="mt-1.5 font-display text-lg leading-snug font-bold">{item.hook}</p>

        <h4 className="eyebrow mt-5">Copy / script</h4>
        <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-ink-muted">
          {item.copy}
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h4 className="eyebrow">Caption</h4>
          <CopyButton
            text={fullCaption(item)}
            label={`Copy caption for ${item.topic}`}
          />
        </div>
        <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-ink-muted">
          {item.caption}
        </p>

        {item.hashtags.length > 0 && (
          <p className="mt-3 font-mono text-xs break-words text-ink-faint">
            {formatHashtags(item.hashtags)}
          </p>
        )}

        <h4 className="eyebrow mt-5">CTA</h4>
        <p className="mt-1.5 text-sm text-ink-muted">{item.cta}</p>

        {item.seoKeywords.length > 0 && (
          <>
            <h4 className="eyebrow mt-5">Target keywords</h4>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {item.seoKeywords.map((k) => (
                <li
                  key={k}
                  className="rounded-full border border-rule px-2 py-0.5 font-mono text-[0.6875rem] text-ink-faint"
                >
                  {k}
                </li>
              ))}
            </ul>
          </>
        )}

        <h4 className="eyebrow mt-5">Why this post</h4>
        <p className="mt-1.5 text-sm text-ink-muted">{item.rationale}</p>
      </div>
    </div>
  );
}

export function CalendarTable({
  monthId,
  items,
}: {
  monthId: string;
  items: ContentItem[];
}) {
  const [open, setOpen] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-ink-muted">
        Nothing planned on this platform for this month yet.
      </p>
    );
  }

  const th =
    "px-3 py-3 text-left font-mono text-[0.6875rem] font-bold tracking-[0.14em] uppercase text-ink-faint whitespace-nowrap";
  const td = "px-3 py-2.5 align-top";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[80rem] border-collapse text-sm">
        <thead className="bg-paper-alt">
          <tr className="border-b border-rule">
            <th className={th}>Wk</th>
            <th className={th}>Day</th>
            <th className={th}>Date</th>
            <th className={th}>Bucket</th>
            <th className={th}>Format</th>
            <th className={th}>Topic</th>
            <th className={th}>Caption</th>
            <th className={th}>Shoot</th>
            <th className={th}>Edit</th>
            <th className={th}>Posted</th>
            <th className={th}>Live link</th>
          </tr>
        </thead>

        {items.map((item) => {
          const isOpen = open === item.id;
          return (
            <tbody key={item.id} className="border-b border-rule last:border-b-0">
              <tr
                className={`transition-colors ${
                  isOpen ? "bg-paper-alt" : "hover:bg-paper-alt/70"
                }`}
                style={{
                  boxShadow: `inset 4px 0 0 0 ${BUCKET_COLOR[item.bucket]}`,
                }}
              >
                <td className={`${td} font-mono text-xs text-ink-faint`}>
                  {item.week}
                </td>
                <td className={`${td} text-ink-muted`}>{item.day.slice(0, 3)}</td>
                <td className={`${td} font-mono text-xs whitespace-nowrap`}>
                  {item.date.slice(8)}/{item.date.slice(5, 7)}
                </td>
                <td className={td}>
                  <BucketChip bucket={item.bucket} />
                </td>
                <td className={td}>
                  <FormatChip format={item.format} />
                </td>

                <td className={`${td} w-[18rem] min-w-[14rem]`}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : item.id)}
                    aria-expanded={isOpen}
                    className="group/topic text-left font-bold transition-colors hover:text-accent"
                  >
                    {item.topic}
                    <span className="ml-2 inline-flex items-center rounded-full border border-rule px-1.5 py-0.5 font-mono text-[0.5625rem] text-ink-faint transition-colors group-hover/topic:border-accent group-hover/topic:text-accent">
                      {isOpen ? "▲ hide" : "▼ open"}
                    </span>
                  </button>
                  {item.derivedFrom && (
                    <span className="mt-1 block text-[0.6875rem] font-semibold text-accent">
                      Repost of the Instagram reel — no extra shoot
                    </span>
                  )}
                </td>

                {/* Clamped so a long caption cannot blow the row height out; the
                    full text sits in the expanded panel. */}
                <td className={`${td} w-[24rem] min-w-[18rem]`}>
                  <p className="line-clamp-3 text-xs leading-relaxed text-ink-muted">
                    {item.caption}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <CopyButton
                      text={fullCaption(item)}
                      label={`Copy caption for ${item.topic}`}
                    />
                    {item.hashtags.length > 0 && (
                      <span className="font-mono text-[0.625rem] text-ink-faint">
                        +{item.hashtags.length} tags
                      </span>
                    )}
                  </div>
                </td>

                {(["shoot", "edit", "posted"] as const).map((stage) => (
                  <td key={stage} className={`${td} text-center`}>
                    <StatusToggle
                      monthId={monthId}
                      itemId={item.id}
                      stage={stage}
                      checked={item.production[stage]}
                      label={`${stage} for ${item.topic}`}
                    />
                  </td>
                ))}

                <td className={td}>
                  <LiveLinkCell
                    monthId={monthId}
                    itemId={item.id}
                    value={item.liveLink}
                  />
                </td>
              </tr>

              {isOpen && (
                <tr>
                  <td colSpan={11} className="p-0">
                    <ExpandedDetail item={item} />
                  </td>
                </tr>
              )}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
