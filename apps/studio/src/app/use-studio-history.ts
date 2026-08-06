import { useCallback, useEffect, useRef, useState } from "react";

export interface StudioHistoryEntry {
  id: string;
  code: string;
  reason: "edit" | "preview";
  createdAt: number;
}

const HISTORY_KEY = "ise-studio-code-history";
const MAX_ENTRIES = 40;

export function useStudioHistory(code: string) {
  const [entries, setEntries] = useState<StudioHistoryEntry[]>(loadHistory);
  const initialCodeRef = useRef(code);
  const lastCodeRef = useRef(code);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const record = useCallback((nextCode: string, reason: StudioHistoryEntry["reason"]) => {
    if (!nextCode || nextCode === lastCodeRef.current) return;
    lastCodeRef.current = nextCode;
    setEntries((current) => {
      const next = [{ id: crypto.randomUUID(), code: nextCode, reason, createdAt: Date.now() }, ...current].slice(0, MAX_ENTRIES);
      persistHistory(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (code === initialCodeRef.current || code === lastCodeRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => record(code, "edit"), 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [code, record]);

  return { entries, record };
}

function loadHistory(): StudioHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isHistoryEntry).slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function persistHistory(entries: StudioHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // History is an enhancement; a full localStorage bucket must not block editing.
  }
}

function isHistoryEntry(value: unknown): value is StudioHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<StudioHistoryEntry>;
  return typeof entry.id === "string" && typeof entry.code === "string" &&
    (entry.reason === "edit" || entry.reason === "preview") && typeof entry.createdAt === "number";
}
