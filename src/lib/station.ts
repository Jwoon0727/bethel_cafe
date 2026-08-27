import type { Station } from "@/lib/types";

const STATION_STORAGE_KEY = "cafe_order.station";

function isStation(value: string | null): value is Station {
  return value === "A" || value === "B" || value === "C";
}

/** localStorage에 저장된 접수대 값을 읽는다. 값이 없거나 A|B|C가 아니면 null. */
export function getStoredStation(): Station | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(STATION_STORAGE_KEY);
    return isStation(value) ? value : null;
  } catch {
    // localStorage 접근 불가(프라이빗 모드 등) 시 선택 모달로 폴백
    return null;
  }
}

export function setStoredStation(station: Station): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STATION_STORAGE_KEY, station);
  } catch {
    // 저장 실패는 무시 — 다음 진입 시 다시 선택 모달이 뜬다
  }
}
