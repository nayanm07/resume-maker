import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AtsReport, CoverEmail, GapResult, GenerateResult, MissingSkill, OutputKey,
  Profile, PromptTemplates, ProviderId, ProviderStore, QaItem, RelevantProject, Resume,
  RoleFocus, SavedVersion, SectionLocks, TrackedApp, WantMap,
} from "./types";
import {
  DEPTHS, FOCUS_IDS, FOCUS_LABEL, detectFocus, isDepth, isFocus, positionResume, type Depth,
} from "./lib/positioning";
import { BASE, PROFILE_DEFAULT } from "./data/baseResume";
import { PROVIDERS } from "./lib/providers";
import { callLLM, parseJSON } from "./lib/llm";
import {
  gapPrompt, generatePrompt, jobQueryPrompt, parseSystem, qaAskSystem, qaContext, qaPredictSystem,
} from "./lib/prompts";
import {
  ALL_UNLOCKED, clone, defaultVersionName, detectEmails, diffResume, experienceTargets, fixNameCase, pdfFileName, titleCase,
  normaliseMissing, safeResume,
} from "./lib/resume";
import { KEYS, usePersisted } from "./lib/storage";
import { Button, Card, Toasts, useToasts } from "./components/ui";
import { Sidebar } from "./components/Sidebar";
import { ResumePreview, type PreviewHandle } from "./components/ResumePreview";
import {
  EMPHASIS, SCALE_MAX, SCALE_MIN, SCALE_STEP, TEMPLATES, clampScale, isEmphasis, isTemplate,
  type EmphasisMode, type TemplateId,
} from "./lib/resumeHtml";
import { ResumeEditor } from "./components/ResumeEditor";
import { SkillGapTab } from "./components/tabs/SkillGapTab";
import { AtsTab, CoverLetterTab, DiffTab, EmailTab, MessageTab } from "./components/tabs/SimpleTabs";
import { QaTab } from "./components/tabs/QaTab";
import { VersionsTab } from "./components/tabs/VersionsTab";
import { TrackerTab } from "./components/tabs/TrackerTab";
import { PromptsTab } from "./components/tabs/PromptsTab";
import { MyResumeTab } from "./components/tabs/MyResumeTab";
import { JobSearchTab } from "./components/tabs/JobSearchTab";
import { InterviewPrepTab } from "./components/tabs/InterviewPrepTab";
import { JOB_PREFS_DEFAULT, type JobPrefs } from "./lib/jobSearch";
import {
  coerceResume, extractText, parseUserPrompt,
} from "./lib/resumeImport";

type TabId =
  | "mine" | "jobs" | "gap" | "resume" | "diff" | "ats" | "email" | "letter"
  | "whatsapp" | "dm" | "comment" | "qa" | "versions" | "tracker" | "prep" | "prompts";

const WANT_DEFAULT: WantMap = {
  resume: true, ats: true, email: false, letter: false,
  whatsapp: false, dm: false, comment: false, qa: false,
};

export default function App() {
  /* ---------------- persisted config ---------------- */
  const [theme, setTheme] = usePersisted<"light" | "dark">(KEYS.theme, "light");
  const [provider, setProvider] = usePersisted<ProviderId>(KEYS.provider, "groq");
  const [store, setStore] = usePersisted<ProviderStore>(KEYS.providers, {});
  const [profile, setProfile] = usePersisted<Profile>(KEYS.profile, PROFILE_DEFAULT, true);
  const [want, setWant] = usePersisted<WantMap>(KEYS.want, WANT_DEFAULT, true);
  const [versions, setVersions] = usePersisted<SavedVersion[]>(KEYS.versions, []);
  const [apps, setApps] = usePersisted<TrackedApp[]>(KEYS.tracker, []);
  const [draft, setDraft] = usePersisted<{ jd: string; target: string; tone: string; focus: RoleFocus | "auto" }>(
    KEYS.draft, { jd: "", target: "", tone: "Professional", focus: "auto" }, true
  );
  const [locks, setLocks] = usePersisted<SectionLocks>(KEYS.locks, ALL_UNLOCKED, true);
  const [prompts, setPrompts] = usePersisted<Partial<PromptTemplates>>(KEYS.prompts, {});
  const [jobPrefs, setJobPrefs] = usePersisted<JobPrefs>(KEYS.jobPrefs, JOB_PREFS_DEFAULT, true);
  const [templateRaw, setTemplate] = usePersisted<TemplateId>(KEYS.template, "classic");
  const [emphasisRaw, setEmphasis] = usePersisted<EmphasisMode>(KEYS.emphasis, "metrics");
  // guards against an old or hand-edited localStorage value naming an option that no longer exists
  const template: TemplateId = isTemplate(templateRaw) ? templateRaw : "classic";
  const emphasis: EmphasisMode = isEmphasis(emphasisRaw) ? emphasisRaw : "metrics";
  const [scaleRaw, setScale] = usePersisted<number>(KEYS.scale, 1);
  const scale = clampScale(scaleRaw);
  const nudgeScale = (d: number) => setScale(clampScale(scale + d));
  /** length of the previewed resume in A4 pages, reported by the preview after each render */
  const [pages, setPages] = useState<number | null>(null);
  const [suggestingRoles, setSuggestingRoles] = useState(false);

  /** The user's master resume. Falls back to the bundled sample until they add their own. */
  const [storedBase, setStoredBase] = usePersisted<Resume | null>(KEYS.baseResume, null);
  const base = storedBase ?? BASE;
  const isOwn = storedBase !== null;
  const [parsing, setParsing] = useState(false);

  const jd = draft.jd, target = draft.target, tone = draft.tone;
  const setJd = (v: string) => setDraft({ ...draft, jd: v });
  const setTarget = (v: string) => setDraft({ ...draft, target: v });
  const setTone = (v: string) => setDraft({ ...draft, tone: v });

  /* ---------------- role positioning (no AI, instant) ---------------- */
  // an older build could have saved a role id that no longer exists ("ai")
  const focusPref: RoleFocus | "auto" = isFocus(draft.focus) ? draft.focus : "auto";
  const [depthRaw, setDepth] = usePersisted<Depth>(KEYS.depth, "focused");
  const depth: Depth = isDepth(depthRaw) ? depthRaw : "focused";
  const setFocusPref = (f: RoleFocus | "auto") => setDraft({ ...draft, focus: f });
  const detectedFocus = useMemo(() => detectFocus(draft.target, draft.jd), [draft.target, draft.jd]);
  const focus: RoleFocus = focusPref === "auto" ? detectedFocus : focusPref;
  /** base resume with the role's headline/summary and relevance ordering applied */
  const positioned = useMemo(() => positionResume(base, focus, depth), [base, focus, depth]);
  /** true once the resume was generated, edited or loaded — then it stops following `positioned` */
  const [tailored, setTailored] = useState(false);

  /* ---------------- session state ---------------- */
  const [tab, setTab] = useState<TabId>(storedBase ? "gap" : "mine");
  const [gap, setGap] = useState<GapResult | null>(null);
  const [picked, setPicked] = useState<Record<string, MissingSkill | undefined>>({});
  const [resume, setResume] = useState<Resume>(positioned);
  const [ats, setAts] = useState<AtsReport | null>(null);
  const [email, setEmail] = useState<CoverEmail | null>(null);
  const [projects, setProjects] = useState<RelevantProject[]>([]);
  const [letter, setLetter] = useState("");
  const [wa, setWa] = useState("");
  const [dm, setDm] = useState("");
  const [comment, setComment] = useState("");
  const [qa, setQa] = useState<QaItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [preEdit, setPreEdit] = useState<Resume | null>(null);
  const [highlight, setHighlight] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [asking, setAsking] = useState(false);

  const { toasts, toast, dismiss } = useToasts();
  const previewRef = useRef<PreviewHandle | null>(null);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  // until the user tailors it, the preview follows the chosen role
  useEffect(() => { if (!tailored) setResume(positioned); }, [positioned, tailored]);

  const cfg = store[provider] ?? { key: "", model: PROVIDERS[provider].models[0] };
  const approved = useMemo(
    () => Object.values(picked).filter(Boolean) as MissingSkill[],
    [picked]
  );
  const diff = useMemo(() => diffResume(positioned, resume), [positioned, resume]);
  const keywords = useMemo(
    () => (highlight ? [...(ats?.matchedKeywords ?? []), ...approved.map((a) => a.skill)] : []),
    [highlight, ats, approved]
  );
  const verName = useMemo(
    () => defaultVersionName(target, jd, resume),
    [target, jd, resume]
  );
  /** "Save as PDF" name, e.g. "Nayan Mehta - Senior React Native Engineer at Acme" */
  const pdfName = useMemo(() => pdfFileName(verName, resume.name), [verName, resume.name]);
  /** recruiter addresses found in the pasted JD */
  const jdEmails = useMemo(() => detectEmails(jd), [jd]);

  /** temperature per task: 0 = copy faithfully (import), low = consistent analysis, higher = natural writing */
  const ask = useCallback(
    (system: string, user: string, temperature = 0.3) =>
      callLLM({ provider, apiKey: cfg.key, model: cfg.model, system, user, temperature }),
    [provider, cfg.key, cfg.model]
  );

  /* ---------------- step 1: analyze ---------------- */
  const onAnalyze = async () => {
    if (!cfg.key) return toast.err(`Add your ${PROVIDERS[provider].label} API key first.`);
    if (jd.trim().length < 40) return toast.err("Paste a fuller job description.");
    setAnalyzing(true);
    try {
      const { system, user } = gapPrompt(base, jd.trim(), prompts);
      const data = parseJSON<any>(await ask(system, user, 0.1));
      const cats = base.skills.map((s) => s.label);
      const g: GapResult = {
        roleSummary: data.roleSummary,
        matched: Array.isArray(data.matched) ? data.matched : [],
        missing: normaliseMissing(data.missing, cats),
      };
      setGap(g);
      setPicked({});
      setTab("gap");
      toast.ok(`Found ${g.missing.length} missing skill(s). Tick the ones you genuinely have.`);
    } catch (e: any) {
      toast.err(`Analyze failed: ${e.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  /* ---------------- step 2: generate ---------------- */
  const onGenerate = async () => {
    if (!cfg.key) return toast.err(`Add your ${PROVIDERS[provider].label} API key first.`);
    if (!Object.values(want).some(Boolean)) return toast.err("Pick at least one thing to generate.");
    setGenerating(true);
    try {
      const { system, user } = generatePrompt({
        base: positioned, jd: jd.trim(), want, approved, tone, target, profile, locks, prompts, focus,
      });
      const data = parseJSON<GenerateResult>(await ask(system, user, 0.4));

      if (want.resume) {
        setResume(safeResume(positioned, data.resume, approved, locks));
        setTailored(true);
        setEditing(false);
      }
      if (want.ats && data.atsReport) setAts(data.atsReport);
      if (want.email && data.coverEmail) {
        setEmail({
          subject: fixNameCase(data.coverEmail.subject, base.name),
          body: fixNameCase(data.coverEmail.body, base.name),
        });
        setProjects(data.relevantProjects ?? []);
      }
      if (want.letter) setLetter(fixNameCase(data.coverLetter, base.name));
      if (want.whatsapp) setWa(fixNameCase(data.whatsappMessage, base.name));
      if (want.dm) setDm(fixNameCase(data.linkedinDM, base.name));
      if (want.comment) setComment(fixNameCase(data.linkedinComment, base.name));
      if (want.qa && Array.isArray(data.applicationQA)) setQa(data.applicationQA);

      const first: TabId = want.resume ? "resume" : want.ats ? "ats" : want.email ? "email"
        : want.letter ? "letter" : want.whatsapp ? "whatsapp" : want.dm ? "dm"
        : want.comment ? "comment" : "qa";
      setTab(first);
      const score = want.ats && data.atsReport ? ` Score ${data.atsReport.matchScore}/100.` : "";
      toast.ok(`Done!${score} Only the selected outputs were generated.`);
    } catch (e: any) {
      toast.err(`Generate failed: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  /* ---------------- Q&A ---------------- */
  const onPredict = async () => {
    if (!cfg.key) return toast.err(`Add your ${PROVIDERS[provider].label} API key first.`);
    setPredicting(true);
    try {
      const data = parseJSON<{ qa: QaItem[] }>(
        await ask(qaPredictSystem(prompts), qaContext(positioned, jd.trim(), profile), 0.4)
      );
      const items = (data.qa ?? []).filter((x) => x?.q && x?.a);
      if (!items.length) throw new Error("No questions returned.");
      setQa(items);
      setTab("qa");
      toast.ok(`Generated ${items.length} likely questions with answers.`);
    } catch (e: any) {
      toast.err(`Failed: ${e.message}`);
    } finally {
      setPredicting(false);
    }
  };

  const onAsk = async (q: string) => {
    if (!cfg.key) return toast.err(`Add your ${PROVIDERS[provider].label} API key first.`);
    setAsking(true);
    try {
      const data = parseJSON<{ a?: string; answer?: string }>(
        await ask(qaAskSystem(prompts), `${qaContext(positioned, jd.trim(), profile)}\n\n=== QUESTION TO ANSWER ===\n${q}`, 0.4)
      );
      const a = data.a ?? data.answer ?? "";
      if (!a) throw new Error("Empty answer.");
      setQa((prev) => [...prev, { q, a, user: true }]);
      toast.ok("Answer ready — copy it into the application.");
    } catch (e: any) {
      toast.err(`Failed: ${e.message}`);
    } finally {
      setAsking(false);
    }
  };

  /* ---------------- versions & tracker ---------------- */
  const saveVersion = (name: string) => {
    const v: SavedVersion = {
      id: `v${Date.now()}`, name, savedAt: Date.now(),
      data: clone(resume), jd: jd.trim() || undefined, atsScore: ats?.matchScore ?? null,
    };
    setVersions([v, ...versions]);
    toast.ok(`Saved version "${name}".`);
  };

  const loadVersion = (v: SavedVersion) => {
    setResume(clone(v.data));
    setTailored(true);
    setEditing(false);
    setTab("resume");
    toast.ok(`Loaded "${v.name}".`);
  };

  const trackVersion = (v: SavedVersion) => {
    const [role, company] = v.name.split("@").map((s) => s.trim());
    setApps([
      {
        id: `a${Date.now()}`, company: company ?? "", role: role ?? v.name,
        status: "saved", createdAt: Date.now(), updatedAt: Date.now(),
        versionId: v.id, atsScore: v.atsScore ?? null,
      },
      ...apps,
    ]);
    setTab("tracker");
    toast.ok("Added to your application tracker.");
  };

  const quickApply = (to: string, editedSubject?: string, editedBody?: string) => {
    const subject = editedSubject || email?.subject || `Application for ${verName} — ${titleCase(base.name)}`;
    const body = editedBody || email?.body ||
      `Hello,\n\nI'd like to apply for the ${target || "role"}.\n\nExperience: ${profile.exp}\nNotice period: ${profile.notice}\nCurrent CTC: ${profile.current}\nExpected CTC: ${profile.expected}\n\nPortfolio: ${base.contact.portfolioUrl}\n\nBest regards,\n${titleCase(base.name)}\n${base.contact.phone}`;
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      "_blank"
    );
  };

  /* ---------------- import my resume ---------------- */
  const applyParsed = (raw: unknown) => {
    const r = coerceResume(raw);
    if (!r.experience.length && !r.skills.length)
      throw new Error("Couldn't find any experience or skills in that file.");
    setStoredBase(r);
    setTailored(false);
    setGap(null);
    setPicked({});
    toast.ok(`Imported "${r.name}" — ${r.experience.length} jobs. Review it below, then analyze a JD.`);
  };

  const parseResumeText = async (text: string) => {
    if (!cfg.key) return toast.err(`Add your ${PROVIDERS[provider].label} API key first (left panel).`);
    setParsing(true);
    try {
      applyParsed(parseJSON(await ask(parseSystem(prompts), parseUserPrompt(text), 0)));
    } catch (e: any) {
      toast.err(`Import failed: ${e.message}`);
    } finally {
      setParsing(false);
    }
  };

  const importResumeFile = async (f: File) => {
    setParsing(true);
    try {
      if (f.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(await f.text());
        applyParsed(parsed?.data ?? parsed);
        return;
      }
      const text = await extractText(f);
      if (text.trim().length < 80)
        throw new Error("Couldn't read enough text from that file — it may be a scanned image. Paste the text instead.");
      if (!cfg.key) throw new Error(`Add your ${PROVIDERS[provider].label} API key first (left panel).`);
      applyParsed(parseJSON(await ask(parseSystem(prompts), parseUserPrompt(text), 0)));
    } catch (e: any) {
      toast.err(`Import failed: ${e.message}`);
    } finally {
      setParsing(false);
    }
  };

  const setMyResume = (r: Resume) => { setStoredBase(r); setTailored(false); };

  /* ---------------- find jobs ---------------- */
  // My Details defaults to the built-in roles; don't suggest those for someone else's resume
  const useProfileRoles = !isOwn || profile.roles !== PROFILE_DEFAULT.roles;
  const suggestJobRoles = async () => {
    if (!cfg.key) return toast.err(`Add your ${PROVIDERS[provider].label} API key first (left panel).`);
    setSuggestingRoles(true);
    try {
      const { system, user } = jobQueryPrompt(base, profile, prompts);
      const d = parseJSON<{ roles?: unknown; skills?: unknown }>(await ask(system, user, 0.2));
      const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : []);
      const roles = strings(d.roles).slice(0, 8);
      if (!roles.length) throw new Error("No roles returned.");
      setJobPrefs({ ...jobPrefs, aiRoles: roles, aiSkills: strings(d.skills).slice(0, 8), picked: roles.slice(0, 3) });
      toast.ok(`Suggested ${roles.length} search roles from your resume.`);
    } catch (e: any) {
      toast.err(`Suggest failed: ${e.message}`);
    } finally {
      setSuggestingRoles(false);
    }
  };
  const useRoleAsTarget = (role: string) => {
    setTarget(role);
    toast.ok(`Target role set to "${role}" — your resume is now positioned and named for it.`);
  };
  const useBuiltInResume = () => { setStoredBase(null); setTailored(false); setGap(null); setPicked({}); };

  /** Role buttons in the Resume tab. A tailored or hand-edited resume no longer
   *  follows the role, so say so instead of silently appearing to do nothing. */
  const pickRole = (f: RoleFocus | "auto") => {
    setFocusPref(f);
    if (tailored)
      toast.info("You're viewing a tailored / edited resume — press ↺ Base to rebuild it for this role.");
  };

  /** "One page" only fits in the Compact template — measured: every other
   *  template runs 15–20% over at the same content — so choosing it brings
   *  Compact along rather than leaving a button that does not do what it says. */
  const pickDepth = (d: Depth) => {
    setDepth(d);
    if (d === "tight" && template !== "compact") {
      setTemplate("compact");
      toast.info("Switched to the Compact template — that is what lets it fit one page.");
    }
    if (tailored)
      toast.info("You're viewing a tailored / edited resume — press ↺ Base to rebuild it at this depth.");
  };

  /* ---------------- editor helpers ---------------- */
  const revertSection = (s: "summary" | "skills" | "experience" | "strengths") => {
    const next = clone(resume);
    if (s === "summary") next.summary = clone(positioned.summary);
    if (s === "skills") next.skills = clone(positioned.skills);
    if (s === "experience") next.experience = clone(positioned.experience);
    if (s === "strengths") next.coreStrengths = clone(positioned.coreStrengths);
    setResume(next);
    toast.info(`${s} restored from your base resume.`);
  };

  /* ---------------- keyboard shortcuts ---------------- */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "s") { e.preventDefault(); saveVersion(verName); }
      if (e.key === "p") { e.preventDefault(); previewRef.current?.print(pdfName); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  /* ---------------- tabs ---------------- */
  const TABS: { id: TabId; label: string; badge?: number }[] = [
    { id: "mine", label: isOwn ? "👤 My Resume" : "👤 My Resume ⚠️" },
    { id: "jobs", label: "🔎 Find Jobs" },
    { id: "gap", label: "🔍 Skill Gap" },
    { id: "resume", label: "📄 Resume" },
    { id: "diff", label: "🔀 Changes", badge: diff.length || undefined },
    { id: "ats", label: "✅ ATS" },
    { id: "email", label: "✉️ Email" },
    { id: "letter", label: "📝 Cover Letter" },
    { id: "whatsapp", label: "💬 WhatsApp" },
    { id: "dm", label: "📩 DM" },
    { id: "comment", label: "💡 Comment" },
    { id: "qa", label: "🤖 Q&A", badge: qa.length || undefined },
    { id: "versions", label: "📚 Versions", badge: versions.length || undefined },
    { id: "tracker", label: "📊 Tracker", badge: apps.length || undefined },
    { id: "prep", label: "🎓 Interview Prep" },
    { id: "prompts", label: "🧩 Prompts", badge: Object.keys(prompts).length || undefined },
  ];

  const promptChars = useMemo(
    () => JSON.stringify(base).length + jd.length + 4200,
    [base, jd]
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🎯</span>
          <span>
            Resume Tailor
            <small>AI ATS optimizer · your experience is never removed</small>
          </span>
        </div>
        <div className="spacer" />
        <span className="muted" style={{ display: "none" }} />
        <Button size="sm" variant="ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </Button>
      </header>

      <div className="shell">
        <Sidebar
          provider={provider} setProvider={setProvider}
          store={store} setStore={setStore}
          jd={jd} setJd={setJd}
          target={target} setTarget={setTarget}
          tone={tone} setTone={setTone}
          focusPref={focusPref} setFocusPref={setFocusPref} detectedFocus={detectedFocus}
          profile={profile} setProfile={setProfile}
          want={want}
          analyzing={analyzing}
          onAnalyze={onAnalyze}
          promptChars={promptChars}
          onQuickApply={quickApply}
        />

        <main>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
                {t.label}
                {t.badge ? <span className="badge">{t.badge}</span> : null}
              </button>
            ))}
          </div>

          <Card>
            {tab === "mine" && (
              <MyResumeTab
                base={base}
                setBase={setMyResume}
                isOwn={isOwn}
                parsing={parsing}
                onImportFile={importResumeFile}
                onParseText={parseResumeText}
                onUseBuiltIn={useBuiltInResume}
                onError={(m) => toast.err(m)}
              />
            )}

            {tab === "jobs" && (
              <JobSearchTab
                base={base}
                profile={profile}
                prefs={jobPrefs}
                setPrefs={setJobPrefs}
                useProfileRoles={useProfileRoles}
                suggesting={suggestingRoles}
                onSuggest={suggestJobRoles}
                onUseRole={useRoleAsTarget}
              />
            )}

            {tab === "gap" && (
              <SkillGapTab
                gap={gap}
                categories={base.skills.map((s) => s.label)}
                targets={experienceTargets(base)}
                picked={picked} setPicked={setPicked}
                want={want} setWant={setWant}
                locks={locks} setLocks={setLocks}
                generating={generating}
                onGenerate={onGenerate}
              />
            )}

            {tab === "resume" && (
              <>
                <div className="row-between" style={{ marginBottom: 12 }}>
                  <b>Resume Preview</b>
                  <span style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    <Button size="sm" variant="ghost" onClick={() => setHighlight((h) => !h)}>
                      {highlight ? "🖍 Highlights on" : "🖍 Highlight keywords"}
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => {
                        if (editing) { setEditing(false); return; }
                        setPreEdit(clone(resume)); setTailored(true); setEditing(true);
                      }}>
                      {editing ? "✕ Close editor" : "✏️ Edit"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => saveVersion(verName)}>💾 Save version</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setResume(positioned); setTailored(false); setEditing(false); }}>↺ Base</Button>
                    <Button size="sm" variant="accent" onClick={() => previewRef.current?.print(pdfName)} title={`Saves as "${pdfName}.pdf"`}>⬇ PDF</Button>
                  </span>
                </div>

                <div className="tplbar">
                  <span className="tpllbl">Role</span>
                  <button
                    className={`tplbtn ${focusPref === "auto" ? "on" : ""}`}
                    title="Pick the role from the job description / target role"
                    onClick={() => pickRole("auto")}
                  >
                    Auto{focusPref === "auto" ? ` · ${FOCUS_LABEL[detectedFocus]}` : ""}
                  </button>
                  {FOCUS_IDS.map((f) => (
                    <button
                      key={f}
                      className={`tplbtn ${focusPref === f ? "on" : ""}`}
                      onClick={() => pickRole(f)}
                    >
                      {FOCUS_LABEL[f]}
                    </button>
                  ))}
                </div>

                {focus !== "balanced" && (
                  <div className="tplbar">
                    <span className="tpllbl">Depth</span>
                    {DEPTHS.map((d) => (
                      <button
                        key={d.id}
                        className={`tplbtn ${depth === d.id ? "on" : ""}`}
                        title={d.note}
                        onClick={() => pickDepth(d.id)}
                      >
                        {d.label}
                      </button>
                    ))}
                    <span className="tplnote">{DEPTHS.find((d) => d.id === depth)?.note}</span>
                  </div>
                )}

                <div className="tplbar">
                  <span className="tpllbl">Template</span>
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      className={`tplbtn ${template === t.id ? "on" : ""}`}
                      title={t.note}
                      onClick={() => setTemplate(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                  <span className="tplnote">
                    {TEMPLATES.find((t) => t.id === template)?.note}
                  </span>
                </div>

                <div className="tplbar">
                  <span className="tpllbl">Auto-bold</span>
                  {EMPHASIS.map((e) => (
                    <button
                      key={e.id}
                      className={`tplbtn ${emphasis === e.id ? "on" : ""}`}
                      title={e.note}
                      onClick={() => setEmphasis(e.id)}
                    >
                      {e.label}
                    </button>
                  ))}
                  <span className="tplnote">
                    {EMPHASIS.find((e) => e.id === emphasis)?.note}
                  </span>
                </div>

                <div className="tplbar">
                  <span className="tpllbl">Text size</span>
                  <button
                    className="tplbtn" title="Smaller text — fits more on the page"
                    disabled={scale <= SCALE_MIN}
                    onClick={() => nudgeScale(-SCALE_STEP)}
                  >
                    A−
                  </button>
                  <span className="tplpct">{Math.round(scale * 100)}%</span>
                  <button
                    className="tplbtn" title="Bigger text — easier to read"
                    disabled={scale >= SCALE_MAX}
                    onClick={() => nudgeScale(SCALE_STEP)}
                  >
                    A+
                  </button>
                  {scale !== 1 && (
                    <button className="tplbtn" onClick={() => setScale(1)}>↺ Reset</button>
                  )}
                  {pages !== null && (
                    <span
                      className={`pgmeter ${pages <= 1 ? "ok" : pages <= 1.15 ? "near" : "over"}`}
                      title="Length of this resume in A4 pages, measured from the preview"
                    >
                      {pages <= 1
                        ? `✓ Fits 1 page · ${Math.round(pages * 100)}% full`
                        : `${pages.toFixed(2)} pages · ${Math.round((pages - 1) * 100)}% over one`}
                    </span>
                  )}
                  <span className="tplnote">
                    Re-wraps the text, so the printed page count really changes.
                  </span>
                </div>

                <div className={`stage ${editing ? "editing" : ""}`}>
                  {editing && (
                    <ResumeEditor
                      value={resume}
                      onChange={setResume}
                      onDone={() => { setEditing(false); toast.ok("Edits kept."); }}
                      onCancel={() => { if (preEdit) setResume(preEdit); setEditing(false); }}
                      onRevertSection={revertSection}
                    />
                  )}
                  <ResumePreview
                    resume={resume}
                    keywords={keywords}
                    template={template}
                    emphasis={emphasis}
                    scale={scale}
                    onPages={setPages}
                    onReady={(h) => { previewRef.current = h; }}
                  />
                </div>
              </>
            )}

            {tab === "diff" && <DiffTab entries={diff} />}
            {tab === "ats" && <AtsTab report={ats} />}
            {tab === "email" && (
              <EmailTab email={email} projects={projects} recruiterEmails={jdEmails}
                onQuickApply={quickApply} />
            )}
            {tab === "letter" && (
              <CoverLetterTab letter={letter} resume={resume} target={target} />
            )}
            {tab === "whatsapp" && (
              <MessageTab title="WhatsApp Message" text={wa} waLink
                empty="Generate with WhatsApp ticked to draft a message." />
            )}
            {tab === "dm" && (
              <MessageTab title="LinkedIn DM" text={dm}
                empty="Generate with LinkedIn DM ticked to draft a message." />
            )}
            {tab === "comment" && (
              <MessageTab title="LinkedIn Post Comment" text={comment}
                empty="Generate with LinkedIn Comment ticked to draft one." />
            )}
            {tab === "qa" && (
              <QaTab items={qa} predicting={predicting} asking={asking}
                onPredict={onPredict} onAsk={onAsk} />
            )}
            {tab === "versions" && (
              <VersionsTab
                versions={versions} setVersions={setVersions}
                defaultName={verName}
                onSave={saveVersion} onLoad={loadVersion} onTrack={trackVersion}
              />
            )}
            {tab === "tracker" && (
              <TrackerTab apps={apps} setApps={setApps} versions={versions} onLoadVersion={loadVersion} />
            )}
            {tab === "prep" && <InterviewPrepTab />}
            {tab === "prompts" && <PromptsTab prompts={prompts} setPrompts={setPrompts} />}
          </Card>
        </main>
      </div>

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
