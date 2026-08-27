"use client";

import { MENU } from "@/lib/menu";
import { TempBadge } from "@/components/temp-badge";
import type { MenuCode } from "@/lib/menu";

const MAX_QTY = 99;

type MenuGridProps = {
  cart: Partial<Record<MenuCode, number>>;
  onChangeQty: (code: MenuCode, qty: number) => void;
  disabled?: boolean;
};

export function MenuGrid({ cart, onChangeQty, disabled }: MenuGridProps) {
  return (
    <>
      {/* Menu Selection */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {MENU.map((item) => {
          const qty = cart[item.code] ?? 0;
          const isSelected = qty > 0;

          return (
            <button
              key={item.code}
              type="button"
              disabled={disabled}
              onClick={() => onChangeQty(item.code, isSelected ? qty : 1)}
              className={`flex min-h-[120px] flex-col items-center justify-center rounded-2xl border-2 px-3 py-4 transition md:min-h-[140px] ${
                isSelected
                  ? "border-[#6b7c5b] bg-[#6b7c5b]/10"
                  : "border-gray-300 bg-white hover:border-gray-400"
              } disabled:opacity-40`}
            >
              <div className="mb-1.5 text-lg font-semibold text-gray-800 md:text-xl">
                {item.nameKo}
              </div>
              <div className="mb-2 text-sm text-gray-500">{item.nameEn}</div>
              <TempBadge temp={item.temp} size="lg" />
            </button>
          );
        })}
      </div>

      {/* Selected Items */}
      {MENU.some((item) => (cart[item.code] ?? 0) > 0) && (
        <div className="mt-4 space-y-2">
          {MENU.filter((item) => (cart[item.code] ?? 0) > 0).map((item) => {
            const qty = cart[item.code] ?? 0;
            return (
              <div
                key={item.code}
                className="flex items-center justify-between rounded-lg bg-[#e8dcc8] px-4 py-2"
              >
                <span className="flex items-center gap-2 text-base font-medium text-gray-800">
                  {item.nameKo}
                  <TempBadge temp={item.temp} />
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChangeQty(item.code, Math.max(0, qty - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5a4a3a] text-base text-white transition hover:bg-[#4a3a2a] disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-base font-semibold tabular-nums text-[#3c2a21]">
                    {qty}
                  </span>
                  <button
                    type="button"
                    disabled={disabled || qty >= MAX_QTY}
                    onClick={() => onChangeQty(item.code, Math.min(MAX_QTY, qty + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5a4a3a] text-base text-white transition hover:bg-[#4a3a2a] disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
