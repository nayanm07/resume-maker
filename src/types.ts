export interface Contact {
  phone: string; email: string; location: string;
  linkedin: string; linkedinUrl: string;
  portfolio: string; portfolioUrl: string;
}
export interface SkillGroup { label: string; items: string[]; }
export interface Project { title: string; meta?: string; bullets: string[]; }
export interface TrackGroup { track: string; projects: Project[]; }
export interface Job {
  company: string; role: string; date: string; place?: string;
  groups?: TrackGroup[]; bullets?: string[];
}
export interface Education { deg: string; inst: string; date: string; }

/** Which kind of role the resume is being positioned for. */
export type RoleFocus = "balanced" | "fullstack" | "backend" | "mobile" | "ai";

/** Hand-written, fact-checked headline/summary for one role focus. */
export interface RoleVariant { title?: string; subtitle?: string; summary?: string[]; }

export interface Resume {
  name: string; title: string; subtitle: string;
  contact: Contact;
  summary: string[];
  skills: SkillGroup[];
  experience: Job[];
  coreStrengths: string[];
  education: Education[];
  /** optional per-role headline + summary; applied by positionResume() */
  positioning?: Partial<Record<RoleFocus, RoleVariant>>;
}

/* ---------- AI payloads ---------- */
export interface MissingSkill {
  skill: string;
  category: string;
  /** optional: the project/company where the user actually used this skill.
   *  When set, the AI weaves it into that project's bullets too. */
  usedIn?: string;
}
export interface GapResult {
  roleSummary?: string;
  matched: string[];
  missing: MissingSkill[];
}
export interface AtsReport {
  matchScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
}
export interface RelevantProject { name: string; match: string; highlight: string; }
export interface CoverEmail { subject: string; body: string; }
export interface QaItem { q: string; a: string; user?: boolean; }

export interface GenerateResult {
  resume?: Resume;
  atsReport?: AtsReport;
  relevantProjects?: RelevantProject[];
  coverEmail?: CoverEmail;
  whatsappMessage?: string;
  linkedinDM?: string;
  linkedinComment?: string;
  applicationQA?: QaItem[];
}

/* ---------- app state ---------- */
export type ProviderId = "groq" | "openrouter" | "gemini" | "openai";
export interface ProviderCfg { key: string; model: string; }
export type ProviderStore = Partial<Record<ProviderId, ProviderCfg>>;

export interface Profile {
  exp: string; notice: string; current: string; expected: string; roles: string;
}

export type OutputKey = "resume" | "ats" | "email" | "whatsapp" | "dm" | "comment" | "qa";
export type WantMap = Record<OutputKey, boolean>;

/** Which resume sections the AI is allowed to rewrite. Locked ones are
 *  restored from the base resume client-side after generation. */
export type SectionKey = "headline" | "summary" | "skills" | "experience" | "strengths";
export type SectionLocks = Record<SectionKey, boolean>;

/** Every editable prompt fragment used by the app. */
export type PromptKey =
  | "parseSystem"
  | "gapSystem"
  | "generateIntro"
  | "roleFocusRule"
  | "resumeRule"
  | "skillWeaveRule"
  | "atsRule"
  | "emailRule"
  | "outreachRule"
  | "qaSectionRule"
  | "qaRules";
export type PromptTemplates = Record<PromptKey, string>;

export interface SavedVersion {
  id: string; name: string; savedAt: number;
  data: Resume;
  jd?: string;
  atsScore?: number | null;
}

export type AppStatus = "saved" | "applied" | "interview" | "offer" | "rejected";
export interface TrackedApp {
  id: string;
  company: string;
  role: string;
  status: AppStatus;
  createdAt: number;
  updatedAt: number;
  versionId?: string;
  notes?: string;
  atsScore?: number | null;
}

export interface Toast { id: number; kind: "ok" | "err" | "info"; text: string; }
