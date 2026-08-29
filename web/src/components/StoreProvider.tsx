"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { nowSimulated, toggleDemoSpeed } from "@/lib/demoClock";
import { loadState, recordMetric, saveState } from "@/lib/store/db";
import { emptyState, type AuraState, type DemoId } from "@/lib/store/schema";
import { buildSeedState } from "@/lib/store/seed";
import { wipeToEmpty } from "@/lib/store/wipe";

type StoreApi = {
  ready: boolean;
  state: AuraState;
  now: () => number;
  setState: (next: AuraState | ((prev: AuraState) => AuraState)) => void;
  seedWeek: () => Promise<void>;
  reset: () => Promise<void>;
  setDemoSpeed: (enabled: boolean) => void;
  track: (demoId: DemoId, name: string) => void;
};

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<AuraState>(() => emptyState(Date.now()));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadState(Date.now()).then((loaded) => {
      setStateRaw(loaded);
      setReady(true);
    });
  }, []);

  const persist = useCallback((next: AuraState) => {
    setStateRaw(next);
    void saveState(next);
  }, []);

  const setState = useCallback(
    (next: AuraState | ((prev: AuraState) => AuraState)) => {
      setStateRaw((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        void saveState(resolved);
        return resolved;
      });
    },
    [],
  );

  const now = useCallback(
    () => nowSimulated(state.clock, Date.now()),
    [state.clock],
  );

  const seedWeek = useCallback(async () => {
    const next = buildSeedState(Date.now());
    persist(next);
  }, [persist]);

  const reset = useCallback(async () => {
    const next = await wipeToEmpty(Date.now());
    persist(next);
  }, [persist]);

  const setDemoSpeed = useCallback(
    (enabled: boolean) => {
      const realNow = Date.now();
      persist({
        ...state,
        clock: toggleDemoSpeed(state.clock, realNow, enabled),
      });
    },
    [persist, state],
  );

  const track = useCallback(
    (demoId: DemoId, name: string) => {
      persist(recordMetric(state, demoId, name, Date.now()));
    },
    [persist, state],
  );

  const api = useMemo<StoreApi>(
    () => ({
      ready,
      state,
      now,
      setState,
      seedWeek,
      reset,
      setDemoSpeed,
      track,
    }),
    [ready, state, now, setState, seedWeek, reset, setDemoSpeed, track],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
