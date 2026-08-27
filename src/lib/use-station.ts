"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getStoredStation, setStoredStation } from "@/lib/station";
import type { Station } from "@/lib/types";

// localStorage는 React 바깥의 "외부 저장소"이므로 useEffect + setState로 동기화하지 않고
// useSyncExternalStore로 구독한다 (react-hooks/set-state-in-effect가 권장하는 패턴).
// getServerSnapshot은 항상 null을 반환해 SSR/최초 hydration과 어긋나지 않는다.

type Listener = () => void;

const listeners = new Set<Listener>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

function getSnapshot(): Station | null {
  return getStoredStation();
}

function getServerSnapshot(): Station | null {
  return null;
}

export function useStation(): readonly [Station | null, (next: Station) => void] {
  const station = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setStation = useCallback((next: Station) => {
    setStoredStation(next);
    emitChange();
  }, []);

  return [station, setStation] as const;
}
