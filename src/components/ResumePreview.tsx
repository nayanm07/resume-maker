import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Resume } from "../types";
import {
  A4_W, A4_H, renderResumeHtml, type EmphasisMode, type TemplateId,
} from "../lib/resumeHtml";

/* A4 at 96dpi, as Chrome's print output measures it (595 x 841.9pt). */
const PRINT_PAGE_H = 1122.5;

export interface PreviewHandle {
  /** Opens the print dialog. `filename` becomes the suggested "Save as PDF" name. */
  print: (filename?: string) => void;
}

/**
 * A4 resume rendered into an isolated iframe and scaled to fit its column.
 * Scaling is skipped while the container is hidden (width 0) so the page can
 * never collapse to scale(0).
 */
export function ResumePreview({
  resume, keywords = [], template = "classic", emphasis = "metrics", scale: textScale = 1, onReady, onPages,
}: {
  resume: Resume;
  keywords?: string[];
  template?: TemplateId;
  emphasis?: EmphasisMode;
  /** resume text size, 0.8–1.2; separate from the preview's fit-to-column scale */
  scale?: number;
  onReady?: (h: PreviewHandle) => void;
  /** reports the laid-out length in A4 pages (1.24 = a page and a quarter) after every render */
  onPages?: (pages: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  // latest callback without re-subscribing the iframe's load handler
  const onPagesRef = useRef(onPages);
  onPagesRef.current = onPages;

  /* Measured to the bottom of the last piece of content, not the document or
     the body. The document is never shorter than the iframe viewport, which
     would report every short resume as exactly one page; and the body ends in
     padding, which print drops at a page end — counting it called a resume
     that prints on one page "1.01 pages". */
  const measure = () => {
    const doc = frameRef.current?.contentDocument;
    const last = doc?.querySelector(".body")?.lastElementChild;
    if (!doc?.body || !last) return;
    const h = last.getBoundingClientRect().bottom - doc.body.getBoundingClientRect().top;
    /* The page keeps its bottom padding when it prints (box-decoration-break:
       clone), so content has to end that far above the page edge. Found by
       nudging a resume's height a few px at a time: it stayed on one page up
       to 1098px and went to two at 1102, with 24px of bottom padding. Text
       wraps identically on screen and in print, so no other allowance is needed.
       Padding is read unzoomed, hence the text-scale factor. */
    const wrapper = doc.querySelector(".body") as HTMLElement;
    const pad = (parseFloat(getComputedStyle(wrapper).paddingBottom) || 0) * textScale;
    if (h > 0) onPagesRef.current?.((h + pad) / PRINT_PAGE_H);
  };

  const html = useMemo(
    () => renderResumeHtml(resume, keywords, template, emphasis, textScale),
    [resume, keywords, template, emphasis, textScale]
  );

  const fit = () => {
    const w = wrapRef.current?.clientWidth ?? 0;
    if (!w) return; // hidden — keep last good scale
    setScale(Math.min(1.25, w / A4_W));
  };

  useLayoutEffect(fit);
  useEffect(() => {
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, []);

  useEffect(() => {
    onReady?.({
      print: (filename?: string) => {
        const w = frameRef.current?.contentWindow;
        if (!w) return;
        // Chrome/Edge suggest the document title as the PDF file name.
        // Set it on both the iframe and the top page, then restore.
        const prevTop = document.title;
        const prevFrame = w.document.title;
        if (filename) {
          document.title = filename;
          w.document.title = filename;
        }
        const restore = () => {
          document.title = prevTop;
          try { w.document.title = prevFrame; } catch { /* frame reloaded */ }
        };
        w.addEventListener("afterprint", restore, { once: true });
        w.focus();
        w.print();
        // print() blocks until the dialog closes in Chromium; restore as a fallback too
        setTimeout(restore, 1500);
      },
    });
  }, [onReady]);

  return (
    <div className="pvwrap" ref={wrapRef} style={{ height: A4_H * scale }}>
      <iframe
        ref={frameRef}
        title="Resume preview"
        srcDoc={html}
        onLoad={measure}
        style={{ transform: `scale(${scale})` }}
      />
    </div>
  );
}
