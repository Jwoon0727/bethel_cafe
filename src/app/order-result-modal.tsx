"use client";

import type { Order } from "@/lib/types";

type OrderResultModalProps = {
  order: Order | null;
  onClose: () => void;
};

export function OrderResultModal({ order, onClose }: OrderResultModalProps) {
  if (!order) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-zinc-950 sm:p-8">
        <div className="space-y-2">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">주문번호 Order No.</p>
          <p className="text-6xl font-extrabold tracking-tight">{order.display_no}</p>
        </div>

        <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
          {order.items.map((item, i) => (
            <li key={`${item.code}-${i}`}>
              {item.name} × {item.qty}
            </li>
          ))}
        </ul>

        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          이 주문번호를 기억해주세요 번호를 찍어두세요
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          확인
        </button>
      </div>
    </div>
  );
}
