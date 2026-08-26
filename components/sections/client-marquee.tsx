import { clients } from "@/lib/content";

export function ClientMarquee() {
  // Rendered twice so the -50% translate loops seamlessly.
  const row = [...clients, ...clients];

  return (
    <section
      aria-label="Selected clients"
      className="border-b border-rule bg-paper-alt py-6"
    >
      <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <ul className="flex shrink-0 animate-marquee items-center gap-14 pr-14">
          {row.map((client, i) => (
            <li
              key={`${client}-${i}`}
              aria-hidden={i >= clients.length}
              className="font-display text-lg whitespace-nowrap text-ink-faint"
            >
              {client}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
