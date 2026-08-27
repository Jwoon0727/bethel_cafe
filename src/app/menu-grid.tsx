"use client";

import { MENU } from "@/lib/menu";
import { TempBadge } from "@/components/temp-badge";
import type { MenuCode } from "@/lib/menu";

const MAX_QTY = 99;

// 메뉴별 컬러 팔레트 — HOT은 따뜻한 톤, ICE는 시원한 톤으로 구분
const MENU_COLORS: Record<MenuCode, { bg: string; border: string; selectedBg: string; selectedBorder: string }> = {
  LATTE_HOT: {
    bg: "bg-[#fbe9d0]",
    border: "border-[#e0b884]",
    selectedBg: "bg-[#f5d5a3]",
    selectedBorder: "border-[#b8823f]",
  },
  LATTE_ICE: {
    bg: "bg-[#dde9f7]",
    border: "border-[#9cb8dc]",
    selectedBg: "bg-[#c0d5ee]",
    selectedBorder: "border-[#5a80b8]",
  },
  AMER_HOT: {
    bg: "bg-[#efd9c4]",
    border: "border-[#c48f5f]",
    selectedBg: "bg-[#e0be9c]",
    selectedBorder: "border-[#8b5a3c]",
  },
  AMER_ICE: {
    bg: "bg-[#d5e9ef]",
    border: "border-[#7fb4c4]",
    selectedBg: "bg-[#b5d8e2]",
    selectedBorder: "border-[#4a8ea0]",
  },
};

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
          const colors = MENU_COLORS[item.code];

          return (
            <button
              key={item.code}
              type="button"
              disabled={disabled}
              onClick={() => onChangeQty(item.code, isSelected ? qty : 1)}
              className={`flex min-h-[135px] flex-col items-center justify-center rounded-2xl border-[3.5px] px-3 py-4 transition md:min-h-[155px] ${
                isSelected
                  ? `${colors.selectedBorder} ${colors.selectedBg} shadow-md`
                  : `${colors.border} ${colors.bg} hover:brightness-95`
              } disabled:opacity-40`}
            >
              <div className="mb-2 text-xl font-bold text-gray-800 md:text-2xl">
                {item.nameKo}
              </div>
              <div className="mb-2.5 text-base text-gray-600 md:text-lg">{item.nameEn}</div>
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
