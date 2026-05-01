"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const defaultOptions: IntersectionObserverInit = {
  root: null,
  rootMargin: "0px 0px -80px 0px",
  threshold: 0.1,
};

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = {}
) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  const { root, rootMargin, threshold } = options;
  const resolvedOptions = useMemo<IntersectionObserverInit>(
    () => ({
      root: root ?? defaultOptions.root,
      rootMargin: rootMargin ?? defaultOptions.rootMargin,
      threshold: threshold ?? defaultOptions.threshold,
    }),
    [root, rootMargin, threshold],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setIsVisible(true);
      }
    }, resolvedOptions);

    observer.observe(el);
    return () => observer.disconnect();
  }, [resolvedOptions]);

  return { ref, isVisible };
}
