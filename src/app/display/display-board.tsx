"use client";

import type { Order } from "@/lib/types";

const MAX_REST_VISIBLE = 8;

type DisplayBoardProps = {
  orders: Order[];
};

export function DisplayBoard({ orders }: DisplayBoardProps) {
  const [latest, ...rest] = orders;
  const visibleRest = rest.slice(0, MAX_REST_VISIBLE);

  return (
    <div className="flex flex-1 flex-col items-center gap-10 px-6 py-10 text-center">
      <div className="space-y-2">
        <p className="text-2xl font-semibold sm:text-3xl">
          주문하신 음료가 준비되었습니다
        </p>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 sm:text-xl">
          Your order is ready!
        </p>
        <p className="pt-2 text-base text-zinc-600 dark:text-zinc-300">
          번호를 확인하고 픽업대에서 받아가세요
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Please check your number and collect it at the pickup counter
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        {latest ? (
          <div
            key={latest.id}
            style={{ animation: "display-pop 0.5s ease-out" }}
            className="flex flex-col items-center gap-3"
          >
            <p className="text-xl font-medium text-zinc-500 dark:text-zinc-400 sm:text-2xl">
              방금 나왔어요 Just made
            </p>
            <p className="text-8xl font-extrabold tracking-tight sm:text-9xl">
              {latest.display_no}
            </p>
          </div>
        ) : (
          <p className="text-2xl text-zinc-400 dark:text-zinc-600">
            준비 중인 주문이 없습니다
          </p>
        )}
      </div>

      {visibleRest.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          {visibleRest.map((order) => (
            <span
              key={order.id}
              className="rounded-full bg-zinc-100 px-4 py-2 text-lg font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {order.display_no}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
