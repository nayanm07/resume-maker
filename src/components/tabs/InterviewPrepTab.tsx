import { useEffect, useMemo, useRef, useState } from "react";
import { KEYS, usePersisted } from "../../lib/storage";
import {
  TOPICS, anchorId, loadTopic, prepareTopic, type RenderedTopic,
} from "../../lib/topics";

type Loaded = RenderedTopic & { file: string };

/**
 * The interview notes as a reader: topics in study order on the left, the
 * open topic on the right. Notes are fetched one topic at a time, links
 * between notes navigate in place, and the self-check tick boxes are saved in
 * this browser.
 */
export function InterviewPrepTab() {
  const [saved, setSaved] = usePersisted<string>(KEYS.prepTopic, TOPICS[0]?.file ?? "");
  const [ticks, setTicks] = usePersisted<Record<string, number[]>>(KEYS.prepChecks, {});
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const docRef = useRef<HTMLDivElement>(null);
  /** where to land once the next topic has rendered: a heading, or the top */
  const landing = useRef<string | null>(null);
  const firstRender = useRef(true);

  // a saved file name can go stale when the notes are renamed
  const file = TOPICS.some((t) => t.file === saved) ? saved : TOPICS[0]?.file ?? "";
  const topic = TOPICS.find((t) => t.file === file);

  useEffect(() => {
    if (!file) return;
    let alive = true;
    setError("");
    Promise.all([loadTopic(file), import("marked")])
      .then(([md, { marked }]) => {
        if (!alive) return;
        const html = marked.parse(md, { gfm: true, async: false }) as string;
        setLoaded({ file, ...prepareTopic(html, file) });
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => { alive = false; };
  }, [file]);

  const jump = (hash: string) =>
    docRef.current
      ?.querySelector(`#${CSS.escape(anchorId(hash))}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  // latest ticks without making the effect below re-run (and re-scroll) on every tick
  const ticksRef = useRef(ticks);
  ticksRef.current = ticks;

  /* The article is injected HTML, so React does not own its inputs: restore
     the saved ticks by hand whenever a topic's HTML lands, then scroll. */
  useEffect(() => {
    const root = docRef.current;
    if (!loaded || !root) return;
    const done = new Set(ticksRef.current[loaded.file] ?? []);
    root.querySelectorAll<HTMLInputElement>("input[data-check]").forEach((box) => {
      box.checked = done.has(Number(box.dataset.check));
    });
    if (landing.current) jump(landing.current);
    else if (!firstRender.current) root.scrollIntoView({ block: "start" });
    landing.current = null;
    firstRender.current = false;
  }, [loaded]);

  const open = (next: string, hash: string | null = null) => {
    if (next === file) { if (hash) jump(hash); return; }
    landing.current = hash;
    setSaved(next);
  };

  const onDocClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (el instanceof HTMLInputElement && el.dataset.check !== undefined) {
      const i = Number(el.dataset.check);
      const on = el.checked;
      // built from the previous state, not this render's copy: two ticks landing
      // before a re-render would otherwise each start from the same list and one would be lost
      setTicks((prev) => {
        const next = new Set(prev[file] ?? []);
        if (on) next.add(i); else next.delete(i);
        return { ...prev, [file]: [...next].sort((a, b) => a - b) };
      });
      return;
    }
    const link = el.closest("a");
    if (!link) return;
    const target = link.getAttribute("data-topic");
    if (target) { e.preventDefault(); open(target, link.getAttribute("data-hash")); return; }
    const href = link.getAttribute("href") ?? "";
    if (href.startsWith("#") && href.length > 1) { e.preventDefault(); jump(decodeURIComponent(href.slice(1))); }
  };

  const resetTicks = () => {
    setTicks(({ [file]: _dropped, ...rest }) => rest);
    docRef.current
      ?.querySelectorAll<HTMLInputElement>("input[data-check]")
      .forEach((box) => { box.checked = false; });
  };

  /** topics matching the search, grouped under their stage in study order */
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: { stage: string; topics: typeof TOPICS }[] = [];
    for (const t of TOPICS) {
      if (q && !t.title.toLowerCase().includes(q) && !t.stage.toLowerCase().includes(q)) continue;
      const last = out[out.length - 1];
      if (last?.stage === t.stage) last.topics.push(t);
      else out.push({ stage: t.stage, topics: [t] });
    }
    return out;
  }, [query]);

  const totalChecks = TOPICS.reduce((n, t) => n + t.checks, 0);
  const totalDone = TOPICS.reduce((n, t) => n + Math.min(t.checks, ticks[t.file]?.length ?? 0), 0);
  const done = Math.min(topic?.checks ?? 0, ticks[file]?.length ?? 0);
  const ready = loaded?.file === file;

  if (!TOPICS.length) return <div className="empty">No interview notes are bundled with this build.</div>;

  return (
    <div className="prep">
      <nav className="prepnav" aria-label="Interview topics">
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a topic…" aria-label="Find a topic"
        />
        <div className="prepsum">
          Self-check: <b>{totalDone}</b> / {totalChecks} ticked
        </div>
        {groups.map((g) => (
          <div key={g.stage}>
            <div className="prepstage">{g.stage}</div>
            {g.topics.map((t) => {
              const d = Math.min(t.checks, ticks[t.file]?.length ?? 0);
              return (
                <button
                  key={t.file}
                  className={`prepitem ${t.file === file ? "on" : ""}`}
                  onClick={() => open(t.file)}
                >
                  <span className="grow">{t.title}</span>
                  {t.checks > 0 && (
                    <span className={`prepcount ${d === t.checks ? "full" : ""}`}>
                      {d === t.checks ? "✓" : `${d}/${t.checks}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
        {!groups.length && <div className="muted" style={{ padding: "8px 2px" }}>No topic matches “{query}”.</div>}
      </nav>

      <div className="prepmain">
        <div className="prepbar">
          <select
            value="" aria-label="Jump to a section"
            disabled={!ready || !loaded?.sections.length}
            onChange={(e) => e.target.value && jump(e.target.value)}
          >
            <option value="">Jump to a section…</option>
            {ready && loaded?.sections.map((s) => <option key={s.id} value={s.id}>{s.text}</option>)}
          </select>
          {!!topic?.checks && (
            <span className="prepsum">
              <b>{done}</b> / {topic.checks} ticked
              {done > 0 && <button className="btn sm ghost" onClick={resetTicks} style={{ marginLeft: 8 }}>Clear</button>}
            </span>
          )}
        </div>

        {error && <div className="empty">Couldn't load this topic: {error}</div>}
        {!error && !ready && <div className="empty">Loading {topic?.title}…</div>}
        {/* unmounted while the next topic loads, so the previous topic's ticks never flash onto it */}
        {!error && ready && loaded && (
          <div
            ref={docRef} className="prepdoc" onClick={onDocClick}
            dangerouslySetInnerHTML={{ __html: loaded.html }}
          />
        )}
      </div>
    </div>
  );
}
