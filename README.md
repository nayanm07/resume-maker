# 🎯 Resume Tailor v2 — AI ATS Optimizer

A local-first React app that tailors your resume to any job description, scores ATS match,
drafts outreach, answers application questions, and tracks your applications — all in the
browser with your own AI key. No backend, no database, nothing leaves your machine except
the request to the AI provider you choose.

> Built with **React 18 + TypeScript + Vite**.
>
> 🔗 **Live:** https://resume-tailor-react.vercel.app

---

## ✨ Features

### Core pipeline
| Step | What it does |
|---|---|
| **① Analyze JD** | Compares the JD against your resume → lists skills you **already have** vs. **missing** |
| **Skill gap** | Missing skills are **auto-sorted into the right category**; tick only the ones you genuinely have. Nothing is added on its own |
| **⚙️ What to generate** | Pick which outputs you want — the AI prompt only requests those keys, so unticked items cost **zero output tokens**. Remembered between sessions |
| **② Generate** | Produces exactly what you selected |

### Outputs
- **📄 Tailored resume** — reordered/reworded for the JD, ticked skills added
- **✅ ATS report** — match score, matched vs. missing keywords, suggestions
- **✉️ Cover email** — names the 2-4 most relevant projects with their real metrics
- **💬 WhatsApp**, **📩 LinkedIn DM**, **💡 LinkedIn comment**
- **🤖 Application Q&A** — predicts screening questions and answers them in first person

### The safety guarantee
Your experience is **never deleted**. Three layers enforce it:
1. The prompt forbids dropping any entry, project or bullet.
2. `mergeExperience()` re-checks the AI output against your base — any missing company, project or shrunken bullet list is restored automatically.
3. `contact`, `education`, `name`, company names and dates are locked and never sent back from the model.

### Bring your own resume
- **👤 My Resume** — upload a **PDF / TXT** or paste text; the AI parses it into the app's structure (temperature 0, copies your wording, keeps Projects / Certifications / Awards). Or start from a blank template or import JSON. Each person's resume stays in their own browser.
- **🔒 Section locks** — choose which sections the AI may edit; locked ones are restored client-side.
- **🔗 Skill weaving** — for a ticked skill, pick the project you used it in and it's woven into that project's bullet.
- **🧩 Prompts tab** — every AI prompt is visible and editable, with reset-to-default.
- **⬇ PDF** is saved under the job role name, with no browser header/footer.

### Advanced (new in v2)
- **🔀 Changes tab** — a real diff showing every bullet the AI **reworded** and every skill it **added**, so you can sanity-check it in seconds
- **🖍 Keyword highlighting** — highlights JD keywords inside the resume preview
- **💰 Live token & cost estimate** — shows tokens and ≈ $ for your next run *before* you spend anything
- **📊 Application tracker** — every saved resume becomes a tracked application with status (Saved → Applied → Interview → Offer / Rejected), notes and its linked resume version
- **📚 Version history** — save/load/rename/delete, auto-named after the role, plus `.json` export & import for permanent backups
- **✏️ Live split editor** — edit any field with the preview updating **as you type**; per-section **↺ Base** revert
- **🌙 Dark mode**, toast notifications, keyboard shortcuts (`Ctrl+S` save version, `Ctrl+P` download PDF)
- **📧 Recruiter-email detection** — finds addresses in the JD and opens a pre-filled Gmail draft

---

## 🚀 Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build:
```bash
npm run build    # -> dist/
npm run preview
```

### Get a free AI key
| Provider | Where | Notes |
|---|---|---|
| **Groq** | console.groq.com/keys | Fastest, free. Best default: `llama-3.3-70b-versatile` |
| **OpenRouter** | openrouter.ai/keys | Best quality: `deepseek/deepseek-chat-v3-0324` (`:free` = no cost) |
| **Gemini** | aistudio.google.com/apikey | Free tier: `gemini-2.0-flash` |
| **OpenAI** | platform.openai.com/api-keys | Best value: `gpt-4.1-mini` |

Paste the key in **AI Configuration** — it's saved in `localStorage` only.

---

## 🗂 Structure

```
src/
├── data/baseResume.ts      # your resume + profile defaults (single source of truth)
├── lib/
│   ├── providers.ts        # provider configs + pricing for the estimator
│   ├── llm.ts              # unified callLLM + tolerant JSON parser
│   ├── prompts.ts          # gap / generate / Q&A prompt builders
│   ├── resume.ts           # merge guard, category inference, diff, email detection
│   ├── resumeHtml.ts       # A4 resume -> HTML (preview + print)
│   ├── tokens.ts           # token & cost estimator
│   └── storage.ts          # usePersisted() localStorage hook
├── components/
│   ├── ui.tsx              # Card, Button, CopyButton, toasts
│   ├── Sidebar.tsx         # config, JD, my details, cost bar
│   ├── ResumePreview.tsx   # auto-scaling A4 iframe + print
│   ├── ResumeEditor.tsx    # controlled live editor
│   └── tabs/               # SkillGap, SimpleTabs (ATS/Email/Message/Diff), QA, Versions, Tracker
└── App.tsx                 # state + orchestration
```

To change your baseline resume, edit **`src/data/baseResume.ts`** — everything else derives from it.

---

## 🔒 Privacy
API keys, versions, tracker and profile live in **your browser's localStorage**. The only
network calls are to the AI provider you select. Export your versions to `.json` for a
permanent backup that survives clearing browser data.
