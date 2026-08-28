"use client";

import { TempBadge } from "@/components/temp-badge";
import { MENU } from "@/lib/menu";
import type { Order } from "@/lib/types";

type KitchenTableProps = {
  orders: Order[];
  onMarkDone: (order: Order) => void;
  onMarkPicked: (order: Order) => void;
  onRevertToPending: (order: Order) => void;
  onRevertToDone: (order: Order) => void;
};

type ColumnConfig = {
  key: "pending" | "done" | "picked_up";
  labelKo: string;
  labelEn: string;
  headerBg: string;
  bodyBg: string;
  cardBg: string;
};

const COLUMNS: ColumnConfig[] = [
  {
    key: "pending",
    labelKo: "대기중",
    labelEn: "Pending",
    headerBg: "bg-[#3c2a21]",
    bodyBg: "bg-white",
    cardBg: "bg-white border-[#e8dcc8]",
  },
  {
    key: "done",
    labelKo: "준비완료",
    labelEn: "Ready",
    headerBg: "bg-[#2D5A43]",
    bodyBg: "bg-[#eef4e6]",
    cardBg: "bg-[#f8fbf5] border-[#c5d9b8]",
  },
  {
    key: "picked_up",
    labelKo: "수령완료",
    labelEn: "Picked up",
    headerBg: "bg-[#6b5a3a]",
    bodyBg: "bg-[#f0ebe0]",
    cardBg: "bg-[#f7f3ec] border-[#ddd4c4]",
  },
];

function getMenuTemp(code: string) {
  return MENU.find((item) => item.code === code)?.temp;
}

function OrderCard({
  order,
  onMarkDone,
  onMarkPicked,
  onRevertToPending,
  onRevertToDone,
}: {
  order: Order;
  onMarkDone: (order: Order) => void;
  onMarkPicked: (order: Order) => void;
  onRevertToPending: (order: Order) => void;
  onRevertToDone: (order: Order) => void;
}) {
  const column = COLUMNS.find((c) => c.key === order.status)!;

  return (
    <div className={`rounded-xl border-2 p-4 shadow-sm ${column.cardBg}`}>
      <div className="mb-3 text-2xl font-bold text-[#3c2a21]">{order.display_no}</div>

      <div className="mb-4 space-y-2">
        {order.items.map((item, i) => {
          const temp = getMenuTemp(item.code);
          const nameKo = item.name.replace(/ \((HOT|ICE)\)$/, "");
          return (
            <div
              key={`${order.id}-${item.code}-${i}`}
              className="flex flex-wrap items-center gap-2 font-bold text-black"
            >
              <span>{nameKo}</span>
              {temp && <TempBadge temp={temp} />}
              <span>× {item.qty}</span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        {order.status === "pending" && (
          <button
            type="button"
            onClick={() => onMarkDone(order)}
            className="flex-1 rounded-md bg-[#2D5A43] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#244a36]"
          >
            완료
            <span className="block text-[10px] font-normal">Done</span>
          </button>
        )}

        {order.status === "done" && (
          <>
            <button
              type="button"
              onClick={() => onRevertToPending(order)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              취소
              <span className="block text-[10px] font-normal">Undo</span>
            </button>
            <button
              type="button"
              onClick={() => onMarkPicked(order)}
              className="flex-1 rounded-md bg-[#2D5A43] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#244a36]"
            >
              수령
              <span className="block text-[10px] font-normal">Pickup</span>
            </button>
          </>
        )}

        {order.status === "picked_up" && (
          <>
            <span className="rounded-md bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-400">
              완료
              <span className="block text-[10px] font-normal">Done</span>
            </span>
            <button
              type="button"
              onClick={() => onRevertToDone(order)}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              취소
              <span className="block text-[10px] font-normal">Undo</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function KitchenColumn({
  config,
  orders,
  onMarkDone,
  onMarkPicked,
  onRevertToPending,
  onRevertToDone,
}: {
  config: ColumnConfig;
  orders: Order[];
  onMarkDone: (order: Order) => void;
  onMarkPicked: (order: Order) => void;
  onRevertToPending: (order: Order) => void;
  onRevertToDone: (order: Order) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl shadow-sm">
      <div className={`shrink-0 ${config.headerBg} px-5 py-4 text-white`}>
        <div className="text-lg font-semibold">
          {config.labelKo}{" "}
          <span className="text-sm font-normal text-white/70">{config.labelEn}</span>
        </div>
        <div className="mt-1 text-3xl font-bold">{orders.length}</div>
      </div>

      <div className={`min-h-0 flex-1 space-y-3 overflow-y-auto p-4 ${config.bodyBg}`}>
        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">주문 없음</p>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onMarkDone={onMarkDone}
              onMarkPicked={onMarkPicked}
              onRevertToPending={onRevertToPending}
              onRevertToDone={onRevertToDone}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function KitchenTable({
  orders,
  onMarkDone,
  onMarkPicked,
  onRevertToPending,
  onRevertToDone,
}: KitchenTableProps) {
  // 대기중: 오래된 주문이 위, 새 주문이 아래(created_at 오름차순)
  const pendingOrders = orders
    .filter((o) => o.status === "pending")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  // 준비완료: 오래 대기 중인 게 위(done_at 오름차순)
  const readyOrders = orders
    .filter((o) => o.status === "done")
    .sort((a, b) => (a.done_at ?? "").localeCompare(b.done_at ?? ""));
  // 수령완료: 방금 수령된 게 위(picked_at 내림차순)
  const pickedUpOrders = orders
    .filter((o) => o.status === "picked_up")
    .sort((a, b) => (b.picked_at ?? "").localeCompare(a.picked_at ?? ""));

  const ordersByColumn: Record<ColumnConfig["key"], Order[]> = {
    pending: pendingOrders,
    done: readyOrders,
    picked_up: pickedUpOrders,
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-3 gap-4">
      {COLUMNS.map((config) => (
        <KitchenColumn
          key={config.key}
          config={config}
          orders={ordersByColumn[config.key]}
          onMarkDone={onMarkDone}
          onMarkPicked={onMarkPicked}
          onRevertToPending={onRevertToPending}
          onRevertToDone={onRevertToDone}
        />
      ))}
    </div>
  );
}
