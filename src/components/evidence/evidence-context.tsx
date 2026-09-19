"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/** Where a citation points. `nonce` makes re-clicking the same chip jump again. */
export interface EvidenceTarget {
  type: "turn" | "file";
  ref: string;
  quote?: string;
  nonce: number;
}

interface EvidenceContextValue {
  target: EvidenceTarget | null;
  jump: (type: "turn" | "file", ref: string, quote?: string) => void;
}

const EvidenceContext = createContext<EvidenceContextValue>({ target: null, jump: () => undefined });

/**
 * Lets any citation chip on the page steer the evidence explorer: switch to the
 * right tab, select the file or turn, and highlight the quoted text.
 */
export function EvidenceProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<EvidenceTarget | null>(null);
  const jump = useCallback((type: "turn" | "file", ref: string, quote?: string) => {
    setTarget((prev) => ({ type, ref, quote, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);
  const value = useMemo(() => ({ target, jump }), [target, jump]);
  return <EvidenceContext value={value}>{children}</EvidenceContext>;
}

export const useEvidence = () => useContext(EvidenceContext);
