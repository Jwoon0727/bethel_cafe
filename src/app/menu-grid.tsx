"use client";

import { MENU, type MenuCode } from "@/lib/menu";

const MAX_QTY = 99;

type MenuGridProps = {
  cart: Partial<Record<MenuCode, number>>;
  onChangeQty: (code: MenuCode, qty: number) => void;
  disabled?: boolean;
};

export function MenuGrid({ cart, onChangeQty, disabled }: MenuGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {MENU.map((item) => {
        const qty = cart[item.code] ?? 0;

        return (
          <div
            key={item.code}
            className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="space-y-1">
              <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                {item.temp}
              </span>
              <p className="text-lg font-semibold">{item.nameKo}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {item.nameEn} · {item.temp}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={disabled || qty <= 0}
                onClick={() => onChangeQty(item.code, Math.max(0, qty - 1))}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 text-xl font-semibold transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900"
                aria-label={`${item.nameKo} ${item.temp} 수량 감소`}
              >
                −
              </button>
              <span className="w-8 text-center text-xl font-bold tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                disabled={disabled || qty >= MAX_QTY}
                onClick={() => onChangeQty(item.code, Math.min(MAX_QTY, qty + 1))}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 text-xl font-semibold transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900"
                aria-label={`${item.nameKo} ${item.temp} 수량 증가`}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
