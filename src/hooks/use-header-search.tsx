"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface HeaderSearchCtx {
  visible: boolean;
  show: () => void;
  hide: () => void;
  query: string;
  setQuery: (q: string) => void;
  clear: () => void;
  placeholder: string;
  setPlaceholder: (p: string) => void;
}

const Ctx = createContext<HeaderSearchCtx | null>(null);

export function HeaderSearchProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("Search…");

  const clear = useCallback(() => setQuery(""), []);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => {
    setVisible(false);
    setQuery("");
  }, []);

  return (
    <Ctx.Provider value={{ visible, show, hide, query, setQuery, clear, placeholder, setPlaceholder }}>
      {children}
    </Ctx.Provider>
  );
}

export function useHeaderSearch() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHeaderSearch must be inside HeaderSearchProvider");
  return ctx;
}
