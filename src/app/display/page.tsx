"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";
import { DisplayBoard } from "./display-board";

const POLL_INTERVAL_MS = 60_000;
const RECONNECT_DELAY_MS = 2_000;
const MAX_ORDERS = 20;

function sortByDoneAtDesc(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
}

// 최신순 정렬 후 상한을 넘는 오래된 항목은 잘라낸다 — 화면이 무한정 쌓이는 것을 방지
function sortAndCap(orders: Order[]): Order[] {
  return sortByDoneAtDesc(orders).slice(0, MAX_ORDERS);
}

export default function DisplayPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [reconnectKey, setReconnectKey] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function fetchDoneOrders() {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "done")
        .order("done_at", { ascending: false })
        .limit(MAX_ORDERS);

      if (cancelled || error) return;
      setOrders((data ?? []) as Order[]);
    }

    fetchDoneOrders();

    const channel = supabase
      .channel("display-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const row = payload.old as Order;
            setOrders((prev) => prev.filter((o) => o.id !== row.id));
            return;
          }

          const row = payload.new as Order;

          if (row.status === "done") {
            setOrders((prev) => {
              const withoutRow = prev.filter((o) => o.id !== row.id);
              return sortAndCap([row, ...withoutRow]);
            });
          } else {
            // pending으로 되돌아가거나 picked_up으로 넘어간 경우 목록에서 제거
            setOrders((prev) => prev.filter((o) => o.id !== row.id));
          }
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setTimeout(() => {
            if (!cancelled) setReconnectKey((k) => k + 1);
          }, RECONNECT_DELAY_MS);
        }
      });

    // 장시간 방치 대비: Realtime 이벤트를 놓쳤을 경우를 위한 폴백 재조회
    const pollId = setInterval(fetchDoneOrders, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [reconnectKey]);

  return (
    <div className="flex flex-1 flex-col">
      <DisplayBoard orders={orders} />
    </div>
  );
}
