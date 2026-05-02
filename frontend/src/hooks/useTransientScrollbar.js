import { useEffect, useRef, useState } from 'react';

const DEFAULT_SCROLLBAR_VISIBLE_MS = 720;

export default function useTransientScrollbar(timeoutMs = DEFAULT_SCROLLBAR_VISIBLE_MS) {
  const timerRef = useRef(null);
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);

  const markScrollbarVisible = () => {
    setIsScrollbarVisible(true);

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      setIsScrollbarVisible(false);
      timerRef.current = null;
    }, timeoutMs);
  };

  useEffect(() => () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  return {
    isScrollbarVisible,
    markScrollbarVisible,
  };
}