import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Resume } from "../types";
import { A4_W, A4_H, renderResumeHtml } from "../lib/resumeHtml";

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
  resume, keywords = [], onReady,
}: {
  resume: Resume;
  keywords?: string[];
  onReady?: (h: PreviewHandle) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);

  const html = useMemo(() => renderResumeHtml(resume, keywords), [resume, keywords]);

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
        style={{ transform: `scale(${scale})` }}
      />
    </div>
  );
}
