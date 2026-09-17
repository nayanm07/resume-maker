import type { Job, MissingSkill, Resume, SectionLocks } from "../types";

export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/* ------------------------------------------------------------------ */
/* Guard: the AI may reorder / rephrase but can NEVER drop experience   */
/* ------------------------------------------------------------------ */
export function mergeExperience(base: Job[], ai?: Job[]): Job[] {
  if (!Array.isArray(ai)) return base;
  const norm = (s: string) => (s || "").trim().toLowerCase();

  return base.map((b) => {
    const a = ai.find((x) => x && norm(x.company) === norm(b.company));
    if (!a) return b; // company missing from AI output -> keep base entirely
    const merged: Job = { ...b };

    if (b.groups) {
      if (Array.isArray(a.groups) && a.groups.length) {
        merged.groups = b.groups.map((bg, gi) => {
          const ag =
            a.groups!.find((x) => x && norm(x.track) === norm(bg.track)) ?? a.groups![gi];
          if (!ag || !Array.isArray(ag.projects)) return bg;
          const projects = bg.projects.map((bp) => {
            const ap = ag.projects.find((x) => x && norm(x.title) === norm(bp.title));
            // accept the tailored bullets only if none were dropped
            return ap && Array.isArray(ap.bullets) && ap.bullets.length >= bp.bullets.length
              ? { ...bp, bullets: ap.bullets }
              : bp;
          });
          return { ...bg, projects };
        });
      }
    } else if (b.bullets) {
      // accept a reordered/rephrased set only if no bullet was dropped
      if (Array.isArray(a.bullets) && a.bullets.length >= b.bullets.length) {
        merged.bullets = a.bullets;
      }
    }
    return merged;
  });
}

/** Keep the model's ordering, but put back any base skill or category it dropped. */
export function restoreSkills(base: Resume["skills"], ai: Resume["skills"]): Resume["skills"] {
  const out = ai
    .filter((c) => c && typeof c.label === "string" && Array.isArray(c.items))
    .map((c) => ({ label: c.label, items: [...c.items] }));
  const has = (items: string[], s: string) => items.some((i) => i.toLowerCase() === s.toLowerCase());
  base.forEach((bc) => {
    let cat = out.find((c) => c.label.toLowerCase() === bc.label.toLowerCase());
    if (!cat) { cat = { label: bc.label, items: [] }; out.push(cat); }
    bc.items.forEach((item) => {
      const anywhere = out.some((c) => has(c.items, item));
      if (!anywhere) cat!.items.push(item);
    });
  });
  return out.filter((c) => c.items.length);
}

export const ALL_UNLOCKED: SectionLocks = {
  headline: false, summary: true, skills: true, experience: true, strengths: true,
};

/**
 * Build the final resume from an AI response.
 * Hard-guards immutable fields AND restores any section the user locked,
 * so a lock is enforced client-side rather than trusted to the model.
 */
export function safeResume(
  base: Resume,
  ai: Partial<Resume> | undefined,
  approved: MissingSkill[],
  locks: SectionLocks = ALL_UNLOCKED
): Resume {
  const r: Resume = { ...clone(base), ...(ai ?? {}) } as Resume;

  // never let the model touch these
  r.name = base.name;
  r.contact = base.contact;
  r.education = base.education;

  // headline
  if (!locks.headline) { r.title = base.title; r.subtitle = base.subtitle; }

  // summary
  if (!locks.summary || !Array.isArray(r.summary) || !r.summary.length) r.summary = clone(base.summary);

  // skills — reordering is fine, but every original skill must survive
  if (!locks.skills || !Array.isArray(r.skills) || !r.skills.length) r.skills = clone(base.skills);
  else r.skills = restoreSkills(base.skills, r.skills);

  // strengths — reword/reorder allowed, dropping lines is not
  if (
    !locks.strengths || !Array.isArray(r.coreStrengths) ||
    r.coreStrengths.length < base.coreStrengths.length
  )
    r.coreStrengths = clone(base.coreStrengths);

  // experience — merge guard, or fully restored when locked
  r.experience = locks.experience
    ? mergeExperience(base.experience, ai?.experience)
    : clone(base.experience);

  // safety net: approved skills must appear in the skills list even if the
  // model forgot them (skills section is always allowed to receive them)
  approved.forEach((a) => {
    let cat = r.skills.find((s) => s.label.toLowerCase() === a.category.toLowerCase());
    if (!cat) { cat = { label: a.category, items: [] }; r.skills.push(cat); }
    if (!cat.items.some((i) => i.toLowerCase() === a.skill.toLowerCase())) cat.items.push(a.skill);
  });
  return r;
}

/** Selectable "where did you use this skill?" targets, built from the base resume. */
export function experienceTargets(base: Resume): string[] {
  const out: string[] = [];
  base.experience.forEach((j) => {
    if (j.groups) {
      j.groups.forEach((g) => g.projects.forEach((p) => out.push(`${j.company} › ${p.title}`)));
    } else {
      out.push(j.company);
    }
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Category inference for missing skills                               */
/* ------------------------------------------------------------------ */
const CATEGORY_RULES: [string, RegExp][] = [
  ["Frontend", /\b(react\b|next|html|css|tailwind|vue|angular|redux|frontend|sass|bootstrap|ui|axios|zod|formik|javascript)\b/],
  ["Mobile", /\b(react native|kotlin|swift|android|ios|flutter|mobile|jetpack|expo)\b/],
  ["Backend", /\b(node|nest|express|java|python|django|spring|php|laravel|graphql|rest|api|microservice|postgres|mysql|mongo|sql|prisma|redis|kafka|rabbit|websocket|socket)\b/],
  ["AI & Voice", /\b(ai|ml|llms?|openai|gpt|gemini|deepgram|elevenlabs|pinecone|rag|nlp|tensorflow|pytorch|embeddings?|vector|langchain|chunking|ocr|stt|tts)\b/],
  ["Payments & APIs", /\b(stripe|razorpay|paypal|coinbase|payment|whatsapp|twilio|maps|admob|firebase|oauth)\b/],
  ["Cloud & DevOps", /\b(aws|gcp|azure|docker|kubernetes|k8s|nginx|ci\/cd|cicd|jenkins|github actions|terraform|linux|vps|devops|cloud)\b/],
  ["Testing & Tools", /\b(jest|detox|cypress|playwright|postman|git\b|version control|swagger|jira|testing|junit|mocha)\b/],
];

export function guessCategory(skill: string): string {
  const s = (skill || "").toLowerCase();
  for (const [cat, re] of CATEGORY_RULES) if (re.test(s)) return cat;
  return "Backend";
}

export function normaliseMissing(missing: unknown, categories: string[]): MissingSkill[] {
  const list = Array.isArray(missing) ? missing : [];
  return list
    .map((m: any) => {
      if (typeof m === "string") return { skill: m, category: guessCategory(m) };
      const skill = m?.skill ?? m?.name ?? "";
      let category = m?.category ?? "";
      if (!categories.some((c) => c.toLowerCase() === String(category).toLowerCase())) {
        category = guessCategory(skill);
      }
      return { skill, category };
    })
    .filter((m) => m.skill);
}

/* ------------------------------------------------------------------ */
/* Version naming from the role                                        */
/* ------------------------------------------------------------------ */
const ROLE_RE =
  /(engineer|developer|designer|manager|architect|\blead\b|analyst|consultant|specialist|intern|programmer|administrator|scientist|full[\s-]?stack|frontend|front[\s-]?end|backend|back[\s-]?end|sde|devops)/i;

export function guessRoleFromJD(jd: string): string {
  const lines = (jd || "").split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (const l of lines.slice(0, 10)) {
    const c = l.replace(/^(role|position|job title|title)\s*[:\-]\s*/i, "").replace(/[.;:]+$/, "");
    if (ROLE_RE.test(c) && c.length <= 60) return c;
  }
  return "";
}

/** "NAYAN MEHTA" -> "Nayan Mehta" */
const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());

/**
 * PDF filename built from the job role, e.g.
 * "Nayan Mehta - Senior React Native Engineer at Acme".
 * Browsers use the document title as the "Save as PDF" name, so this
 * strips characters that are illegal in file names.
 */
export function pdfFileName(role: string, candidateName: string): string {
  const clean = (s: string) =>
    s.replace(/@/g, " at ")
      .replace(/[\\/:*?"<>|#%{}~&]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const r = clean(role).slice(0, 70);
  const n = clean(titleCase(candidateName || ""));
  const realName = n && n.toUpperCase() !== "YOUR NAME" ? n : "";
  if (!r) return realName || "Resume";
  return realName ? `${realName} - ${r}` : r;
}

export function defaultVersionName(target: string, jd: string, current: Resume): string {
  if (target.trim()) return target.trim();
  const r = guessRoleFromJD(jd);
  return r || current.title || "Resume";
}

/* ------------------------------------------------------------------ */
/* NEW: diff between base and tailored resume                          */
/* ------------------------------------------------------------------ */
export interface DiffEntry { where: string; kind: "changed" | "added"; before?: string; after: string; }

function bulletsOf(j: Job): { label: string; bullets: string[] }[] {
  if (j.groups) {
    return j.groups.flatMap((g) =>
      g.projects.map((p) => ({ label: `${j.company} › ${p.title}`, bullets: p.bullets }))
    );
  }
  return [{ label: j.company, bullets: j.bullets ?? [] }];
}

export function diffResume(base: Resume, next: Resume): DiffEntry[] {
  const out: DiffEntry[] = [];

  base.summary.forEach((p, i) => {
    const n = next.summary[i];
    if (n && n !== p) out.push({ where: `Summary ¶${i + 1}`, kind: "changed", before: p, after: n });
  });

  // skills added
  next.skills.forEach((cat) => {
    const b = base.skills.find((s) => s.label.toLowerCase() === cat.label.toLowerCase());
    const added = cat.items.filter(
      (i) => !b || !b.items.some((x) => x.toLowerCase() === i.toLowerCase())
    );
    added.forEach((a) => out.push({ where: `Skills › ${cat.label}`, kind: "added", after: a }));
  });

  // bullets changed
  const baseMap = new Map<string, string[]>();
  base.experience.forEach((j) => bulletsOf(j).forEach((g) => baseMap.set(g.label, g.bullets)));
  next.experience.forEach((j) =>
    bulletsOf(j).forEach((g) => {
      const b = baseMap.get(g.label);
      if (!b) return;
      g.bullets.forEach((nb, i) => {
        const ob = b[i];
        if (ob === undefined) out.push({ where: g.label, kind: "added", after: nb });
        else if (ob !== nb) out.push({ where: g.label, kind: "changed", before: ob, after: nb });
      });
    })
  );

  base.coreStrengths.forEach((s, i) => {
    const n = next.coreStrengths[i];
    if (n && n !== s) out.push({ where: `Core Strength ${i + 1}`, kind: "changed", before: s, after: n });
  });

  return out;
}

/* ------------------------------------------------------------------ */
/* Recruiter e-mail detection inside the JD                            */
/* ------------------------------------------------------------------ */
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const EMAIL_IGNORE = /^(example|test|sample|noreply|no-reply|donotreply|do-not-reply|postmaster|abuse|webmaster)[@.]/i;

export function detectEmails(text: string): string[] {
  const found = (text || "").match(EMAIL_RE) ?? [];
  return Array.from(new Set(found.filter((e) => !EMAIL_IGNORE.test(e))));
}
