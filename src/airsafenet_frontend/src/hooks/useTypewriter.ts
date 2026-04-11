import { useEffect, useRef, useState } from "react";

type Options = {
  enabled?: boolean;
  speed?: number;
  chunkMin?: number;
  chunkMax?: number;
  onDone?: () => void;
};

function randomChunk(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function useTypewriter(
  fullText: string,
  options: Options = {}
) {
  const {
    enabled = true,
    speed = 18,
    chunkMin = 1,
    chunkMax = 4,
    onDone,
  } = options;

  const [displayed, setDisplayed] = useState("");

  const indexRef = useRef(0);
  const textRef = useRef(fullText);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: number | null = null;

    indexRef.current = 0;
    textRef.current = fullText;

    function tick() {
      if (cancelled) return;

      if (indexRef.current >= textRef.current.length) {
        onDone?.();
        return;
      }

      const size = randomChunk(chunkMin, chunkMax);
      const nextIndex = Math.min(
        indexRef.current + size,
        textRef.current.length
      );

      setDisplayed(textRef.current.slice(0, nextIndex));
      indexRef.current = nextIndex;

      timer = window.setTimeout(tick, speed);
    }

    timer = window.setTimeout(tick, speed);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [fullText, enabled, speed, chunkMin, chunkMax, onDone]);

  const finalDisplayed = enabled ? displayed : fullText;

  const done = finalDisplayed.length >= fullText.length;

  return { displayed: finalDisplayed, done };
}