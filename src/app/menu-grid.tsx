"use client";

import { MENU } from "@/lib/menu";
import { TempBadge } from "@/components/temp-badge";
import type { MenuCode } from "@/lib/menu";

const MAX_QTY = 99;

// 화면 배치 순서: 1행 카페라떼(HOT) | 아메리카노(HOT), 2행 카페라떼(ICE)
const MENU_GRID_ORDER: MenuCode[] = ["LATTE_HOT", "AMER_HOT", "LATTE_ICE"];

const MENU_BY_CODE = Object.fromEntries(MENU.map((item) => [item.code, item])) as Record<
  MenuCode,
  (typeof MENU)[number]
>;

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
        {MENU_GRID_ORDER.map((code) => {
          const item = MENU_BY_CODE[code];
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
        <div className="mt-4 space-y-3">
          {MENU.filter((item) => (cart[item.code] ?? 0) > 0).map((item) => {
            const qty = cart[item.code] ?? 0;
            return (
              <div
                key={item.code}
                className="flex min-h-[56px] items-center justify-between rounded-xl bg-[#e8dcc8] px-4 py-3.5 md:min-h-[64px] md:px-5 md:py-4"
              >
                <span className="flex items-center gap-2.5 text-lg font-semibold text-gray-800 md:gap-3 md:text-xl">
                  {item.nameKo}
                  <TempBadge temp={item.temp} size="lg" />
                </span>
                <div className="flex items-center gap-3.5 md:gap-4">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChangeQty(item.code, Math.max(0, qty - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5a4a3a] text-lg text-white transition hover:bg-[#4a3a2a] disabled:opacity-40 md:h-11 md:w-11 md:text-xl"
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-lg font-semibold tabular-nums text-[#3c2a21] md:w-8 md:text-xl">
                    {qty}
                  </span>
                  <button
                    type="button"
                    disabled={disabled || qty >= MAX_QTY}
                    onClick={() => onChangeQty(item.code, Math.min(MAX_QTY, qty + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5a4a3a] text-lg text-white transition hover:bg-[#4a3a2a] disabled:opacity-40 md:h-11 md:w-11 md:text-xl"
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
