"use client";

import { useState, useTransition } from "react";
import { saveLiveLink } from "@/app/studio/actions";

export function LiveLinkCell({
  monthId,
  itemId,
  value,
}: {
  monthId: string;
  itemId: string;
  value: string | null;
}) {
  const [link, setLink] = useState(value ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const commit = () => {
    if (link === (value ?? "")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("monthId", monthId);
      fd.set("itemId", itemId);
      fd.set("link", link);
      await saveLiveLink(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="url"
        inputMode="url"
        placeholder="Paste live link"
        aria-label="Live link"
        value={link}
        disabled={pending}
        onChange={(e) => setLink(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-40 rounded-lg border border-rule bg-paper-alt px-2.5 py-1.5 text-xs focus:border-accent focus:bg-paper disabled:opacity-50"
      />
      {saved && <span className="font-mono text-[0.625rem] text-accent">saved</span>}
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[0.625rem] text-ink-faint underline"
        >
          open
        </a>
      )}
    </div>
  );
}
