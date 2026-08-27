"use client";

import { useEffect, useState } from "react";
import { markOrderDone, markOrderPicked } from "@/lib/orders";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";
import { KitchenTable } from "./kitchen-table";

function sortByCreatedAt(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadInitial() {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .neq("status", "picked_up")
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        setLoadError(error.message);
      } else {
        setOrders((data ?? []) as Order[]);
      }
      setLoading(false);
    }

    loadInitial();

    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Order;
            if (row.status === "picked_up") return;
            setOrders((prev) =>
              prev.some((o) => o.id === row.id) ? prev : sortByCreatedAt([...prev, row]),
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Order;
            setOrders((prev) => {
              if (row.status === "picked_up") {
                return prev.filter((o) => o.id !== row.id);
              }
              if (!prev.some((o) => o.id === row.id)) {
                return sortByCreatedAt([...prev, row]);
              }
              return prev.map((o) => (o.id === row.id ? row : o));
            });
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as Order;
            setOrders((prev) => prev.filter((o) => o.id !== row.id));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleMarkDone(order: Order) {
    // 배열 전체가 아니라 이 주문 1건만 스냅샷 — 대기 중 Realtime으로 들어온
    // 다른 신규 주문까지 롤백에 휩쓸리지 않도록 한다.
    const previous = order;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { ...o, status: "done", done_at: new Date().toISOString() }
          : o,
      ),
    );

    try {
      const result = await markOrderDone(order.id);
      if (result === null) {
        // 0행 반환 = 이미 완료 처리됨(중복 클릭 등) — 실패가 아니라 성공으로 간주
        return;
      }
    } catch {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? previous : o)));
      showToast("완료 처리에 실패했습니다. 다시 시도해주세요.");
    }
  }

  async function handleMarkPicked(order: Order) {
    const previous = order;
    setOrders((prev) => prev.filter((o) => o.id !== order.id));

    try {
      const result = await markOrderPicked(order.id);
      if (result === null) {
        // 0행 반환 = 이미 수령 처리됨 — 목록에서 빠진 채로 두는 게 맞다
        return;
      }
    } catch {
      // Realtime이 먼저 다시 채워놨을 수 있으니 중복 삽입은 피한다
      setOrders((prev) =>
        prev.some((o) => o.id === previous.id) ? prev : sortByCreatedAt([...prev, previous]),
      );
      showToast("수령 처리에 실패했습니다. 다시 시도해주세요.");
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-10 sm:px-6">
        <header>
          <h1 className="text-2xl font-semibold">주방 화면</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Kitchen</p>
        </header>

        {toast && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {toast}
          </p>
        )}

        {loadError && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            목록을 불러오지 못했습니다: {loadError}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-zinc-500">불러오는 중...</p>
        ) : (
          <KitchenTable orders={orders} onMarkDone={handleMarkDone} onMarkPicked={handleMarkPicked} />
        )}
      </div>
    </div>
  );
}
