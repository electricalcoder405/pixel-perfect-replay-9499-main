import { useEffect, useState } from "react";

/** The current time, refreshed every `intervalMs`. Client-side only (routes using it have ssr: false). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
