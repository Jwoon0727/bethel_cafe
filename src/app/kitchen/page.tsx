"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  markOrderDone,
  markOrderPicked,
  resetAllOrders,
  revertOrderToDone,
  revertOrderToPending,
} from "@/lib/orders";
import { createClient } from "@/lib/supabase/client";
import { MENU } from "@/lib/menu";
import { TempBadge } from "@/components/temp-badge";
import type { Order } from "@/lib/types";
import { KitchenTable } from "./kitchen-table";

const AUTO_PICKUP_MS = 3 * 60 * 1000;
const RESET_PIN = "1914";

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
            setOrders((prev) =>
              prev.some((o) => o.id === row.id) ? prev : sortByCreatedAt([...prev, row]),
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Order;
            setOrders((prev) => {
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
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { ...o, status: "picked_up", picked_at: new Date().toISOString() }
          : o,
      ),
    );

    try {
      const result = await markOrderPicked(order.id);
      if (result === null) {
        // 0행 반환 = 이미 수령 처리됨 — 낙관적 업데이트를 그대로 둔다
        return;
      }
    } catch {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? previous : o)));
      showToast("수령 처리에 실패했습니다. 다시 시도해주세요.");
    }
  }

  async function handleRevertToPending(order: Order) {
    const previous = order;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id ? { ...o, status: "pending", done_at: null } : o,
      ),
    );

    try {
      const result = await revertOrderToPending(order.id);
      if (result === null) {
        // mark_order_done/picked의 null과 달리 "이미 처리됨"이 아니라
        // "이 취소는 더 이상 유효하지 않음" — 낙관적 업데이트를 되돌린다.
        setOrders((prev) => prev.map((o) => (o.id === order.id ? previous : o)));
        showToast("이미 상태가 변경된 주문입니다.");
      }
    } catch {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? previous : o)));
      showToast("취소 처리에 실패했습니다. 다시 시도해주세요.");
    }
  }

  async function handleRevertToDone(order: Order) {
    const previous = order;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id ? { ...o, status: "done", picked_at: null } : o,
      ),
    );

    try {
      const result = await revertOrderToDone(order.id);
      if (result === null) {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? previous : o)));
        showToast("이미 상태가 변경된 주문입니다.");
      }
    } catch {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? previous : o)));
      showToast("취소 처리에 실패했습니다. 다시 시도해주세요.");
    }
  }

  // 준비완료 3분 초과 시 자동 수령 처리 — 개별 done 주문마다 남은 시간으로 setTimeout 예약
  const handleMarkPickedRef = useRef(handleMarkPicked);
  useEffect(() => {
    handleMarkPickedRef.current = handleMarkPicked;
  });

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = Date.now();

    orders.forEach((order) => {
      if (order.status !== "done" || !order.done_at) return;
      const remaining = AUTO_PICKUP_MS - (now - new Date(order.done_at).getTime());
      if (remaining <= 0) {
        handleMarkPickedRef.current(order);
      } else {
        timers.push(
          setTimeout(() => handleMarkPickedRef.current(order), remaining),
        );
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [orders]);

  // 메뉴별 수령완료 총 잔 수 통계
  const pickedUpStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const order of orders) {
      if (order.status !== "picked_up") continue;
      for (const item of order.items) {
        counts[item.code] = (counts[item.code] ?? 0) + item.qty;
      }
    }
    return counts;
  }, [orders]);

  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (resetting) return;

    const pin = window.prompt(
      "초기화를 진행하려면 PIN 번호를 입력하세요.\n(모든 주문 데이터와 순번이 삭제되며 되돌릴 수 없습니다.)",
    );
    if (pin === null) return; // 사용자가 취소
    if (pin !== RESET_PIN) {
      showToast("PIN 번호가 올바르지 않습니다.");
      return;
    }

    setResetting(true);
    try {
      await resetAllOrders();
      setOrders([]);
      showToast("초기화가 완료되었습니다.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      showToast(`초기화에 실패했습니다: ${message}`);
      console.error("[reset_all_orders]", err);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f5f1e8]">
      <header className="shrink-0 bg-[#6b7c5b] px-6 py-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌿</span>
            <h1 className="text-lg font-medium">The Branch Café — Kitchen</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20"
            >
              새로고침
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="rounded-md border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20 disabled:opacity-50"
            >
              {resetting ? "초기화 중..." : "초기화하기"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-hidden px-6 py-6">
        {/* 메뉴별 수령완료 통계 */}
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
          {MENU.map((item) => (
            <div
              key={item.code}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">
                    {item.nameKo}
                  </span>
                  <TempBadge temp={item.temp} />
                </div>
                <div className="text-xs text-gray-500">수령완료 Picked up</div>
              </div>
              <div className="text-2xl font-bold text-[#3c2a21]">
                {pickedUpStats[item.code] ?? 0}
                <span className="ml-0.5 text-sm font-normal text-gray-500">잔</span>
              </div>
            </div>
          ))}
        </div>

        {toast && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {toast}
          </p>
        )}

        {loadError && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            목록을 불러오지 못했습니다: {loadError}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-zinc-500">불러오는 중...</p>
        ) : (
          <div className="min-h-0 flex-1">
            <KitchenTable
              orders={orders}
              onMarkDone={handleMarkDone}
              onMarkPicked={handleMarkPicked}
              onRevertToPending={handleRevertToPending}
              onRevertToDone={handleRevertToDone}
            />
          </div>
        )}
      </div>
    </div>
  );
}
