import type { Resume } from "../types";

/* ------------------------------------------------------------------ */
/* Text extraction from an uploaded file                               */
/* ------------------------------------------------------------------ */
export const ACCEPTED = ".pdf,.txt,.md,.json,application/pdf,text/plain,application/json";

async function pdfToText(file: File): Promise<string> {
  // lazy-loaded so pdf.js is not in the initial bundle
  const pdfjs = await import("pdfjs-dist");
  // worker shipped with the package; Vite resolves this URL at build time
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // group items into lines by their y position so structure survives
    const rows = new Map<number, string[]>();
    for (const item of content.items as any[]) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push(item.str);
    }
    const lines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.join(" ").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    pages.push(lines.join("\n"));
  }
  return pages.join("\n\n");
}

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return pdfToText(file);
  if (name.endsWith(".docx"))
    throw new Error(
      "DOCX isn't supported directly — open it and 'Save as PDF', or paste the text instead."
    );
  return file.text(); // .txt / .md / anything plain
}

/* ------------------------------------------------------------------ */
/* AI prompt: raw resume text -> structured Resume JSON                */
/* ------------------------------------------------------------------ */
/* The parser prompt itself lives in prompts.ts (DEFAULT_PROMPTS.parseSystem) so it is editable. */
export const parseUserPrompt = (text: string) => `=== RAW RESUME TEXT ===\n${text}`;

/* ------------------------------------------------------------------ */
/* Validation / repair of whatever the model returns                   */
/* ------------------------------------------------------------------ */
const S = (v: unknown) => (typeof v === "string" ? v : "");
const A = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function coerceResume(raw: any): Resume {
  const c = raw?.contact ?? {};
  return {
    name: S(raw?.name) || "YOUR NAME",
    title: S(raw?.title),
    subtitle: S(raw?.subtitle),
    contact: {
      phone: S(c.phone), email: S(c.email), location: S(c.location),
      linkedin: S(c.linkedin), linkedinUrl: S(c.linkedinUrl),
      portfolio: S(c.portfolio), portfolioUrl: S(c.portfolioUrl),
    },
    summary: A<string>(raw?.summary).map(S).filter(Boolean),
    skills: A<any>(raw?.skills)
      .map((s) => ({ label: S(s?.label) || "Skills", items: A<string>(s?.items).map(S).filter(Boolean) }))
      .filter((s) => s.items.length),
    experience: A<any>(raw?.experience).map((j) => {
      const job: Resume["experience"][number] = {
        company: S(j?.company), role: S(j?.role), date: S(j?.date),
      };
      if (S(j?.place)) job.place = S(j.place);
      const groups = A<any>(j?.groups);
      if (groups.length) {
        job.groups = groups.map((g) => ({
          track: S(g?.track),
          projects: A<any>(g?.projects).map((p) => ({
            title: S(p?.title), meta: S(p?.meta) || undefined,
            bullets: A<string>(p?.bullets).map(S).filter(Boolean),
          })),
        }));
      } else {
        job.bullets = A<string>(j?.bullets).map(S).filter(Boolean);
      }
      return job;
    }).filter((j) => j.company || j.role),
    coreStrengths: A<string>(raw?.coreStrengths).map(S).filter(Boolean),
    education: A<any>(raw?.education)
      .map((e) => ({ deg: S(e?.deg), inst: S(e?.inst), date: S(e?.date) }))
      .filter((e) => e.deg || e.inst),
  };
}

/** A blank resume so someone can start from scratch. */
export const EMPTY_RESUME: Resume = {
  name: "YOUR NAME",
  title: "Your Professional Title",
  subtitle: "Skill | Skill | Skill",
  contact: {
    phone: "", email: "", location: "",
    linkedin: "", linkedinUrl: "", portfolio: "", portfolioUrl: "",
  },
  summary: ["Write a 2-3 sentence professional summary here."],
  skills: [{ label: "Skills", items: ["Add your skills"] }],
  experience: [
    { company: "Company", role: "Your Role", date: "Year – Year", bullets: ["What you built and its impact."] },
  ],
  coreStrengths: [],
  education: [{ deg: "Your Degree", inst: "Your Institution", date: "Year – Year" }],
};

export function resumeStats(r: Resume) {
  const bullets = r.experience.reduce(
    (n, j) => n + (j.bullets?.length ?? 0) + (j.groups?.reduce((m, g) => m + g.projects.reduce((k, p) => k + p.bullets.length, 0), 0) ?? 0),
    0
  );
  const skills = r.skills.reduce((n, s) => n + s.items.length, 0);
  return { jobs: r.experience.length, bullets, skills, education: r.education.length };
}
