import { useCallback, useRef, useState } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutoSave<T>(
  saveFn: (data: T) => Promise<void>,
  delay = 1200
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (data: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus("saving");
      timerRef.current = setTimeout(async () => {
        try {
          await saveFn(data);
          setStatus("saved");
          setTimeout(() => setStatus("idle"), 2000);
        } catch (e) {
          console.error("Auto-save failed:", e);
          setStatus("error");
          setTimeout(() => setStatus("idle"), 3000);
        }
      }, delay);
    },
    [saveFn, delay]
  );

  const saveNow = useCallback(
    async (data: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus("saving");
      try {
        await saveFn(data);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } catch (e) {
        console.error("Auto-save (saveNow) failed:", e);
        setStatus("error");
      }
    },
    [saveFn]
  );

  return { save, saveNow, status };
}


