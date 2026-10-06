import manifest from "../content/interview-topics/index.json";

/** One interview-notes file. `file` is its path inside content/interview-topics. */
export interface Topic {
  file: string;
  stage: string;
  title: string;
  /** self-check tick boxes in the file */
  checks: number;
}

/** Every topic, in study order. Written by `npm run sync:topics`. */
export const TOPICS: Topic[] = manifest;

/* One lazy chunk per file: the notes are close to 1 MB of markdown, and nobody
   tailoring a resume should download them. A topic is fetched when it is opened. */
const loaders = import.meta.glob("../content/interview-topics/**/*.md", {
  query: "?raw",
  import: "default",
}) as Record<string, () => Promise<string>>;

export async function loadTopic(file: string): Promise<string> {
  const load = loaders[`../content/interview-topics/${file}`];
  if (!load) throw new Error(`Topic not found: ${file}`);
  return load();
}

/** GitHub's heading-anchor rule, so the notes' own "#section" links keep working. */
export const slug = (text: string) =>
  text.trim().toLowerCase().replace(/[^\p{L}\p{N} -]/gu, "").replace(/ /g, "-");

/** ids are prefixed so a heading can never collide with an element of the app itself */
export const anchorId = (hash: string) => `prep-${hash}`;

/** A relative ".md" link, resolved against the file it appears in; null if it leaves the notes. */
export function resolveTopicLink(fromFile: string, href: string): string | null {
  const path = href.split("#")[0];
  if (!/\.md$/i.test(path) || /^[a-z]+:/i.test(path)) return null;
  const parts = fromFile.split("/").slice(0, -1);
  for (const seg of path.split("/")) {
    if (seg === "..") {
      if (!parts.length) return null; // points outside the notes folder
      parts.pop();
    } else if (seg && seg !== ".") parts.push(seg);
  }
  const file = parts.join("/");
  return TOPICS.some((t) => t.file === file) ? file : null;
}

export interface RenderedTopic {
  html: string;
  /** the h2 headings, for the "jump to section" list */
  sections: { id: string; text: string }[];
}

/**
 * Turn the markdown renderer's HTML into what the tab shows: headings get
 * anchors, links between notes become in-app navigation, tick boxes become
 * live, and wide tables get their own scroll container.
 *
 * The HTML is injected as-is. That is safe only because the markdown is the
 * app's own bundled content, never user or network input — do not reuse this
 * for anything else without sanitising.
 */
export function prepareTopic(rawHtml: string, file: string): RenderedTopic {
  const doc = new DOMParser().parseFromString(rawHtml, "text/html");

  const seen = new Map<string, number>();
  const sections: RenderedTopic["sections"] = [];
  doc.querySelectorAll("h1, h2, h3, h4").forEach((h) => {
    const text = (h.textContent ?? "").trim();
    let id = slug(text);
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    if (n) id = `${id}-${n}`; // GitHub numbers repeated headings the same way
    h.id = anchorId(id);
    if (h.tagName === "H2") sections.push({ id, text });
  });

  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") ?? "";
    if (href.startsWith("#")) return; // same-page anchor, handled on click
    if (/^https?:/i.test(href)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      return;
    }
    const target = resolveTopicLink(file, href);
    if (target) {
      a.setAttribute("data-topic", target);
      const hash = href.split("#")[1];
      if (hash) a.setAttribute("data-hash", hash);
      a.setAttribute("href", "#");
    } else {
      // a link to a file that is not part of the notes: keep the words, drop the dead link
      a.replaceWith(doc.createTextNode(a.textContent ?? ""));
    }
  });

  doc.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((box, i) => {
    box.removeAttribute("disabled");
    box.removeAttribute("checked"); // the saved state, not the file, decides what is ticked
    box.setAttribute("data-check", String(i));
  });

  doc.querySelectorAll("table").forEach((table) => {
    const wrap = doc.createElement("div");
    wrap.className = "tablewrap";
    table.replaceWith(wrap);
    wrap.appendChild(table);
  });

  return { html: doc.body.innerHTML, sections };
}
