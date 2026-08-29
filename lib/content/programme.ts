/**
 * What the school actually offers, and how it teaches.
 *
 * Everything here describes the programme's design and philosophy — claims
 * Vedam makes about itself, drawn from the same standing brief the content
 * strategist works from (lib/social/strategy/brand.ts). Nothing here asserts an
 * outcome, a number, or a third party's words; that material lives in
 * `pending.ts` and stays unrendered until it is real.
 */

export const hero = {
  eyebrow: "B.Tech · Computer Science & Artificial Intelligence",
  /** Split so "build it" can carry the brand gradient. */
  headlineLead: "Learn tech by",
  headlineAccent: "building it",
  body: "Vedam School of Technology is an engineering school for people who would rather ship than memorise. Four years of Computer Science and AI, taught by people who have built things, in cohorts small enough that someone notices when you are stuck.",
} as const;

/** The four pillars — what makes the programme what it is. */
export const pillars = [
  {
    number: "01",
    title: "Built around projects",
    description:
      "The curriculum is organised around things you build, not chapters you finish. You leave with a portfolio and the habits that produced it, because that is what the next person asks to see.",
    tags: ["Studio work", "Portfolio", "Version control", "Code review"],
  },
  {
    number: "02",
    title: "Computer science, properly",
    description:
      "Data structures, algorithms, systems, networks, and the mathematics under machine learning. AI on top of shaky fundamentals is a party trick — the fundamentals are the point.",
    tags: ["Algorithms", "Systems", "Mathematics", "Networks"],
  },
  {
    number: "03",
    title: "AI you actually implement",
    description:
      "From gradient descent by hand to training, evaluating, and deploying real models. You will read papers, reproduce results, and find out where they break.",
    tags: ["Machine learning", "Deep learning", "MLOps", "Evaluation"],
  },
  {
    number: "04",
    title: "Taught by people who have shipped",
    description:
      "Faculty and mentors who have built software in industry, in small cohorts with high contact time. Close enough that the feedback is specific and arrives while it still matters.",
    tags: ["Small cohorts", "Mentorship", "Industry faculty", "Contact time"],
  },
] as const;

/** How four years are actually spent. Replaces the agency "process". */
export const journey = [
  {
    step: "Year 01",
    title: "Foundations",
    description:
      "Programming, discrete mathematics, and computer organisation. You build small things constantly, and the first ones are meant to be bad.",
  },
  {
    step: "Year 02",
    title: "Core CS",
    description:
      "Data structures, algorithms, operating systems, databases, and networks — the layer everything above it depends on.",
  },
  {
    step: "Year 03",
    title: "AI and specialisation",
    description:
      "Machine learning, deep learning, and a track you pick. Real datasets, real evaluation, and results you have to defend.",
  },
  {
    step: "Year 04",
    title: "Build and ship",
    description:
      "A capstone, an internship, and work that leaves the building. The year the portfolio stops being coursework.",
  },
] as const;

/**
 * Curriculum areas, shown as a scrolling strip.
 *
 * This replaces the client-logo marquee, which listed eight companies that do
 * not exist. These are subject areas in a CS & AI degree — descriptive of the
 * programme, not a claim about anyone else.
 */
export const curriculumAreas = [
  "Data Structures",
  "Algorithms",
  "Operating Systems",
  "Computer Networks",
  "Databases",
  "Machine Learning",
  "Deep Learning",
  "Computer Vision",
  "Natural Language Processing",
  "Distributed Systems",
  "Linear Algebra",
  "Probability & Statistics",
] as const;

export const admissions = {
  eyebrow: "Admissions",
  headline: "Applications for the next cohort.",
  body: "If you are in Class 11 or 12 and this sounds like how you want to spend four years, get in touch. Real questions get real answers — including the ones about fees, placements, and what we have not figured out yet.",
  cta: "Talk to admissions",
} as const;
