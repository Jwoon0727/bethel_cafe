"use client";

import type { Station } from "@/lib/types";

const STATIONS: Station[] = ["A", "B", "C"];

type StationModalProps = {
  open: boolean;
  mode: "initial" | "change";
  onSelect: (station: Station) => void;
  onCancel: () => void;
};

export function StationModal({ open, mode, onSelect, onCancel }: StationModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      onClick={mode === "change" ? onCancel : undefined}
    >
      <div
        className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-950 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1 text-center">
          <h2 className="text-lg font-semibold">이 기기의 접수대를 선택해주세요</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Please select this device&apos;s pickup station
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {STATIONS.map((station) => (
            <button
              key={station}
              type="button"
              onClick={() => onSelect(station)}
              className="flex aspect-square flex-col items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50 text-3xl font-bold transition hover:border-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-100 dark:hover:bg-zinc-800"
            >
              {station}
            </button>
          ))}
        </div>

        {mode === "change" && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}
