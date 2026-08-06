import { useCallback, useEffect, useRef, useState } from "react";
import { decodeCodeShareHash } from "./file-io";

export const STORAGE_KEY = "ise-studio-code";
export const SAVE_DELAY_MS = 500;

export const DEFAULT_CODE = `// OpenSCAD: hollow cube shell
difference() {
  cube([40, 40, 40], center=true);
  translate([0, 0, 4])
    cube([32, 32, 32], center=true);
}`;

export function loadCode(storage?: Pick<Storage, "getItem">): string {
  const source = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);
  try {
    const sharedCode = typeof window === "undefined" ? null : decodeCodeShareHash(window.location.hash);
    if (sharedCode != null) return sharedCode;
    return source?.getItem(STORAGE_KEY) ?? DEFAULT_CODE;
  } catch {
    return DEFAULT_CODE;
  }
}

export function persistCode(code: string, storage?: Pick<Storage, "setItem">): boolean {
  const target = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);
  try {
    target?.setItem(STORAGE_KEY, code);
    return Boolean(target);
  } catch (err) {
    console.error("Failed to save code:", err);
    return false;
  }
}

export function useSingleFile() {
  const [code, setCode] = useState(loadCode);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistCode(code), SAVE_DELAY_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [code]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  return { code, setCode: handleCodeChange };
}
