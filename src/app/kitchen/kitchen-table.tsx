"use client";

import type { Order } from "@/lib/types";

type KitchenTableProps = {
  orders: Order[];
  onMarkDone: (order: Order) => void;
  onMarkPicked: (order: Order) => void;
};

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "대기중 Pending",
  done: "준비완료 Ready",
  picked_up: "수령완료 Picked up",
};

export function KitchenTable({ orders, onMarkDone, onMarkPicked }: KitchenTableProps) {
  if (orders.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
        대기 중인 주문이 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
            <th className="px-4 py-3 font-semibold">
              번호
              <span className="block text-xs font-normal text-zinc-500">No.</span>
            </th>
            <th className="px-4 py-3 font-semibold">
              메뉴
              <span className="block text-xs font-normal text-zinc-500">Menu</span>
            </th>
            <th className="px-4 py-3 font-semibold">
              상태
              <span className="block text-xs font-normal text-zinc-500">Status</span>
            </th>
            <th className="px-4 py-3 font-semibold">
              처리
              <span className="block text-xs font-normal text-zinc-500">Action</span>
            </th>
            <th className="px-4 py-3 font-semibold">
              수령
              <span className="block text-xs font-normal text-zinc-500">Pickup</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="px-4 py-3 align-top text-lg font-bold">{order.display_no}</td>
              <td className="px-4 py-3 align-top">
                {order.items.map((item, i) => (
                  <div key={`${order.id}-${item.code}-${i}`}>
                    {item.name} × {item.qty}
                  </div>
                ))}
              </td>
              <td className="px-4 py-3 align-top">{STATUS_LABEL[order.status]}</td>
              <td className="px-4 py-3 align-top">
                {order.status === "pending" ? (
                  <button
                    type="button"
                    onClick={() => onMarkDone(order)}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  >
                    완료 Done
                  </button>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-4 py-3 align-top">
                {order.status === "done" ? (
                  <button
                    type="button"
                    onClick={() => onMarkPicked(order)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    수령 Pickup
                  </button>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
