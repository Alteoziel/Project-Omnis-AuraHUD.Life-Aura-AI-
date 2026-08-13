"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type HomeChatSessionLock = {
  locked: boolean;
  setLocked: (locked: boolean) => void;
};

const HomeChatSessionLockContext = createContext<HomeChatSessionLock | null>(
  null,
);

export function HomeChatSessionLockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locked, setLockedState] = useState(false);
  const setLocked = useCallback((next: boolean) => {
    setLockedState(next);
  }, []);
  const value = useMemo(
    () => ({ locked, setLocked }),
    [locked, setLocked],
  );

  useEffect(() => {
    if (!locked) return;
    const stay = () => {
      window.history.pushState({ homeChatLock: true }, "", window.location.href);
    };
    stay();
    window.addEventListener("popstate", stay);
    return () => {
      window.removeEventListener("popstate", stay);
    };
  }, [locked]);

  return (
    <HomeChatSessionLockContext.Provider value={value}>
      {children}
    </HomeChatSessionLockContext.Provider>
  );
}

export function useHomeChatSessionLock(): HomeChatSessionLock {
  return (
    useContext(HomeChatSessionLockContext) ?? {
      locked: false,
      setLocked: () => undefined,
    }
  );
}
