"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type NfcStatus = "idle" | "starting" | "active" | "error";

/** Wraps Web NFC. start() must be called from a user gesture (button tap). */
export function useNfc(onTag: (uid: string) => void) {
  const [status, setStatus] = useState<NfcStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const handler = useRef(onTag);
  useEffect(() => { handler.current = onTag; }, [onTag]);

  const stop = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (typeof window === "undefined" || !("NDEFReader" in window)) {
      setStatus("error");
      setError("Web NFC is not supported here. Open this site in Chrome on an Android phone over HTTPS.");
      return;
    }
    try {
      setStatus("starting");
      setError(null);
      abort.current?.abort();
      abort.current = new AbortController();
      const reader = new NDEFReader();
      reader.onreadingerror = () => setError("Couldn't read that card. Hold it against the back of the phone and try again.");
      reader.onreading = (e) => { setError(null); handler.current(e.serialNumber.toUpperCase()); };
      await reader.scan({ signal: abort.current.signal });
      setStatus("active");
    } catch (e) {
      const name = (e as DOMException).name;
      setStatus("error");
      setError(
        name === "NotAllowedError" ? "NFC permission was denied. Allow NFC for this site in Chrome's site settings, then try again."
        : name === "NotReadableError" ? "NFC is turned off or unavailable. Enable NFC in your phone settings, then try again."
        : `Couldn't start the scanner: ${(e as Error).message}`
      );
    }
  }, []);

  useEffect(() => () => abort.current?.abort(), []);
  return { status, error, start, stop };
}
