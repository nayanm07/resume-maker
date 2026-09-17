import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AtsReport, CoverEmail, GapResult, GenerateResult, MissingSkill, OutputKey,
  Profile, PromptTemplates, ProviderId, ProviderStore, QaItem, RelevantProject, Resume,
  RoleFocus, SavedVersion, SectionLocks, TrackedApp, WantMap,
} from "./types";
import { detectFocus, positionResume } from "./lib/positioning";
import { BASE, PROFILE_DEFAULT } from "./data/baseResume";
import { PROVIDERS } from "./lib/providers";
import { callLLM, parseJSON } from "./lib/llm";
import {
  gapPrompt, generatePrompt, parseSystem, qaAskSystem, qaContext, qaPredictSystem,
} from "./lib/prompts";
import {
  ALL_UNLOCKED, clone, defaultVersionName, detectEmails, diffResume, experienceTargets, fixNameCase, pdfFileName, titleCase,
  normaliseMissing, safeResume,
} from "./lib/resume";
import { KEYS, usePersisted } from "./lib/storage";
import { Button, Card, Toasts, useToasts } from "./components/ui";
import { Sidebar } from "./components/Sidebar";
import { ResumePreview, type PreviewHandle } from "./components/ResumePreview";
import { ResumeEditor } from "./components/ResumeEditor";
import { SkillGapTab } from "./components/tabs/SkillGapTab";
import { AtsTab, DiffTab, EmailTab, MessageTab } from "./components/tabs/SimpleTabs";
import { QaTab } from "./components/tabs/QaTab";
import { VersionsTab } from "./components/tabs/VersionsTab";
import { TrackerTab } from "./components/tabs/TrackerTab";
import { PromptsTab } from "./components/tabs/PromptsTab";
import { MyResumeTab } from "./components/tabs/MyResumeTab";
import {
  coerceResume, extractText, parseUserPrompt,
} from "./lib/resumeImport";

type TabId =
  | "mine" | "gap" | "resume" | "diff" | "ats" | "email"
  | "whatsapp" | "dm" | "comment" | "qa" | "versions" | "tracker" | "prompts";

const WANT_DEFAULT: WantMap = {
  resume: true, ats: true, email: false, whatsapp: false, dm: false, comment: false, qa: false,
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
  const focusPref = draft.focus ?? "auto";
  const setFocusPref = (f: RoleFocus | "auto") => setDraft({ ...draft, focus: f });
  const detectedFocus = useMemo(() => detectFocus(draft.target, draft.jd), [draft.target, draft.jd]);
  const focus: RoleFocus = focusPref === "auto" ? detectedFocus : focusPref;
  /** base resume with the role's headline/summary and relevance ordering applied */
  const positioned = useMemo(() => positionResume(base, focus), [base, focus]);
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
      if (want.whatsapp) setWa(fixNameCase(data.whatsappMessage, base.name));
      if (want.dm) setDm(fixNameCase(data.linkedinDM, base.name));
      if (want.comment) setComment(fixNameCase(data.linkedinComment, base.name));
      if (want.qa && Array.isArray(data.applicationQA)) setQa(data.applicationQA);

      const first: TabId = want.resume ? "resume" : want.ats ? "ats" : want.email ? "email"
        : want.whatsapp ? "whatsapp" : want.dm ? "dm" : want.comment ? "comment" : "qa";
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
  const useBuiltInResume = () => { setStoredBase(null); setTailored(false); setGap(null); setPicked({}); };

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
    { id: "gap", label: "🔍 Skill Gap" },
    { id: "resume", label: "📄 Resume" },
    { id: "diff", label: "🔀 Changes", badge: diff.length || undefined },
    { id: "ats", label: "✅ ATS" },
    { id: "email", label: "✉️ Email" },
    { id: "whatsapp", label: "💬 WhatsApp" },
    { id: "dm", label: "📩 DM" },
    { id: "comment", label: "💡 Comment" },
    { id: "qa", label: "🤖 Q&A", badge: qa.length || undefined },
    { id: "versions", label: "📚 Versions", badge: versions.length || undefined },
    { id: "tracker", label: "📊 Tracker", badge: apps.length || undefined },
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
            {tab === "prompts" && <PromptsTab prompts={prompts} setPrompts={setPrompts} />}
          </Card>
        </main>
      </div>

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
