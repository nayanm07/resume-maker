import React, { useCallback, useRef, useState } from "react";
import type { Toast } from "../types";

/* ---------------- Card ---------------- */
export function Card({
  title, num, right, children, className = "",
}: {
  title?: React.ReactNode; num?: number; right?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <header className="card-head">
          {num !== undefined && <span className="num">{num}</span>}
          <span>{title}</span>
          {right && <span style={{ marginLeft: "auto", textTransform: "none", letterSpacing: 0 }}>{right}</span>}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

/* ---------------- Button ---------------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "ghost" | "danger";
  size?: "md" | "sm";
  busy?: boolean;
  block?: boolean;
};
export function Button({
  variant = "primary", size = "md", busy, block, className = "", children, disabled, ...rest
}: BtnProps) {
  const cls = [
    "btn",
    variant === "accent" ? "accent" : variant === "ghost" ? "ghost" : variant === "danger" ? "danger" : "",
    size === "sm" ? "sm" : "",
    block ? "block" : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <button className={cls} disabled={disabled || busy} {...rest}>
      {busy && <span className="spin" />}
      {children}
    </button>
  );
}

/* ---------------- Field ---------------- */
export function Field({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <>
      <label className="lbl">{label}</label>
      {children}
    </>
  );
}

/* ---------------- Copy button ---------------- */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? "✓ Copied" : `📋 ${label}`}
    </Button>
  );
}

/* ---------------- Toasts ---------------- */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const push = useCallback((kind: Toast["kind"], text: string, ms = 4200) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }, []);
  const api = {
    ok: (t: string) => push("ok", t),
    err: (t: string) => push("err", t, 7000),
    info: (t: string) => push("info", t),
  };
  return { toasts, toast: api, dismiss: (id: number) => setToasts((t) => t.filter((x) => x.id !== id)) };
}

export function Toasts({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => dismiss(t.id)} role="status">
          {t.text}
        </div>
      ))}
    </div>
  );
}
