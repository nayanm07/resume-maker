import { useCallback, useEffect, useState } from "react";

export const KEYS = {
  providers: "rt2_providers",
  provider: "rt2_provider",
  profile: "rt2_profile",
  want: "rt2_want",
  versions: "rt2_versions",
  tracker: "rt2_tracker",
  theme: "rt2_theme",
  draft: "rt2_draft",
  locks: "rt2_locks",
  prompts: "rt2_prompts",
  baseResume: "rt2_base_resume",
} as const;

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...(fallback as any), ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}
/** read without merging (for arrays / primitives) */
export function readRaw<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Persisted state hook. `merge` shallow-merges defaults (for objects). */
export function usePersisted<T>(key: string, initial: T, merge = false) {
  const [value, setValue] = useState<T>(() =>
    merge ? read<T>(key, initial) : readRaw<T>(key, initial)
  );
  useEffect(() => {
    write(key, value);
  }, [key, value]);
  const reset = useCallback(() => setValue(initial), [initial]);
  return [value, setValue, reset] as const;
}
