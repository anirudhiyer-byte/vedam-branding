"use client";

import { useRouter } from "next/navigation";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MonthPicker({
  year,
  month,
  years,
  platform,
}: {
  year: number;
  month: number;
  years: number[];
  /** Carried through so switching month keeps you on the same platform. */
  platform: string;
}) {
  const router = useRouter();

  const go = (y: number, m: number) =>
    router.push(`/studio?y=${y}&m=${m}&p=${platform}`);

  const selectClass =
    "card cursor-pointer px-4 py-2.5 text-sm font-bold focus:outline-accent";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="year">Year</label>
      <select
        id="year"
        className={selectClass}
        value={year}
        onChange={(e) => go(Number(e.target.value), month)}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor="month">Month</label>
      <select
        id="month"
        className={selectClass}
        value={month}
        onChange={(e) => go(year, Number(e.target.value))}
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
    </div>
  );
}
