/**
 * All site copy lives here so it can be edited without touching layout code.
 * Everything below is placeholder content — swap in real client names,
 * projects, and contact details before launch.
 */

export const site = {
  name: "Vedam",
  unit: "School of Technology",
  // Brandbook tagline.
  tagline: "Learn Tech by building It",
  description:
    "Vedam School of Technology is an engineering school offering B.Tech in Computer Science & Artificial Intelligence — where you learn tech by building it.",
  email: "connect@vedam.org",
  location: "Bengaluru, India",
} as const;

export const nav = [
  { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "Process", href: "#process" },
  { label: "Studio", href: "#studio" },
] as const;

export const clients = [
  "Northwind",
  "Aperture Labs",
  "Kalyani Foods",
  "Meridian Health",
  "Studio Ora",
  "Halcyon",
  "Terra Ventures",
  "Bluebird Coffee",
] as const;

export const services = [
  {
    number: "01",
    title: "Brand strategy",
    description:
      "Positioning, naming, and messaging built on real research rather than a mood board. We find the sentence only you can say, then make everything else defend it.",
    tags: ["Research", "Positioning", "Naming", "Messaging"],
  },
  {
    number: "02",
    title: "Visual identity",
    description:
      "Wordmarks, type systems, colour, art direction, and the guidelines that keep it all intact once your team runs with it on their own.",
    tags: ["Logo", "Type system", "Art direction", "Guidelines"],
  },
  {
    number: "03",
    title: "Digital product",
    description:
      "Websites and interfaces designed and built end to end — accessible, fast, and handed over as code your engineers will actually want to maintain.",
    tags: ["Web design", "UI/UX", "Prototyping", "Front-end"],
  },
  {
    number: "04",
    title: "Design systems",
    description:
      "Component libraries and documentation that turn a one-off redesign into something your product teams can ship against for years.",
    tags: ["Components", "Tokens", "Documentation", "Handoff"],
  },
] as const;

export const work = [
  {
    client: "Northwind",
    project: "A rebrand for a 40-year-old logistics company",
    category: "Identity, Web",
    year: "2025",
    accent: "from-[#0c0931] to-[#2b135c]",
    initial: "N",
  },
  {
    client: "Aperture Labs",
    project: "Naming and identity for a research spin-out",
    category: "Strategy, Identity",
    year: "2025",
    accent: "from-[#f97d03] to-[#c200db]",
    initial: "A",
  },
  {
    client: "Kalyani Foods",
    project: "Packaging system across 60 SKUs",
    category: "Identity, Packaging",
    year: "2024",
    accent: "from-[#2b135c] to-[#8a18ff]",
    initial: "K",
  },
  {
    client: "Meridian Health",
    project: "Design system for a patient platform",
    category: "Product, Systems",
    year: "2024",
    accent: "from-[#1d1856] to-[#0c0931]",
    initial: "M",
  },
] as const;

export const process = [
  {
    step: "01",
    title: "Listen",
    description:
      "Two weeks of interviews, audits, and category mapping. We learn your business before we open a design tool.",
  },
  {
    step: "02",
    title: "Frame",
    description:
      "We define the strategy — who you're for, what you stand for, and the territory the design has to occupy.",
  },
  {
    step: "03",
    title: "Make",
    description:
      "Focused design sprints with weekly reviews. No surprise reveals, no forty-slide decks of options nobody wanted.",
  },
  {
    step: "04",
    title: "Hand over",
    description:
      "Guidelines, files, and code, plus the training your team needs to run the system without calling us.",
  },
] as const;

export const testimonial = {
  quote:
    "We'd been through two agencies that gave us a logo and left. Vedam gave us a way to explain ourselves — and then built the thing that proves it.",
  name: "Priya Raghunathan",
  role: "CEO, Northwind",
} as const;

export const stats = [
  { value: "40+", label: "Brands shipped" },
  { value: "9", label: "Years in practice" },
  { value: "6", label: "People in the studio" },
] as const;
