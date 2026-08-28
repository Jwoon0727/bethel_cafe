"use client";

import { TempBadge } from "@/components/temp-badge";
import { MENU } from "@/lib/menu";
import type { Order } from "@/lib/types";

type OrderResultModalProps = {
  order: Order | null;
  onClose: () => void;
};

function getMenuTemp(code: string) {
  return MENU.find((item) => item.code === code)?.temp;
}

export function OrderResultModal({ order, onClose }: OrderResultModalProps) {
  if (!order) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[#fdfcf8] px-6 py-8 text-center shadow-xl sm:px-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#2D5A43]">
          <svg
            className="h-7 w-7 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <p className="text-sm text-[#6b5a3a]">주문번호 Order No.</p>
        <p className="mt-1 text-7xl font-extrabold tracking-tight text-[#3c2a21]">
          {order.display_no}
        </p>

        <p className="mt-4 text-lg font-bold text-[#3c2a21]">주문이 접수되었습니다</p>
        <p className="mt-1 text-sm text-[#6b5a3a]">Your order has been received</p>

        <ul className="mt-5 space-y-2">
          {order.items.map((item, i) => {
            const temp = getMenuTemp(item.code);
            const nameKo = item.name.replace(/ \((HOT|ICE)\)$/, "");
            return (
              <li
                key={`${item.code}-${i}`}
                className="flex items-center justify-center gap-2 text-base font-medium text-[#3c2a21]"
              >
                <span>{nameKo}</span>
                {temp && <TempBadge temp={temp} />}
                <span>× {item.qty}</span>
              </li>
            );
          })}
        </ul>

        <div className="neon-border-wrap mt-5">
          <div className="neon-border-inner px-5 py-4">
            <p className="text-lg font-bold leading-snug text-[#3c2a21]">
              이 주문번호를 기억해주세요!
            </p>
            <p className="mt-1 text-base font-semibold text-[#8b5a3c]">
              번호를 찍어두세요.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-[#2D5A43] py-3.5 text-base font-semibold text-white transition hover:bg-[#244a36]"
        >
          확인
        </button>
      </div>
    </div>
  );
}
