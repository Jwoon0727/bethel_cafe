"use client";

import { useState } from "react";
import { MENU, buildOrderItems, type MenuCode } from "@/lib/menu";
import { createOrder } from "@/lib/orders";
import { useStation } from "@/lib/use-station";
import type { Order, Station } from "@/lib/types";
import { MenuGrid } from "./menu-grid";
import { OrderResultModal } from "./order-result-modal";
import { StationModal } from "./station-modal";

const RESET_DELAY_MS = 400;

export default function Home() {
  const [station, setStation] = useStation();
  const [changingStation, setChangingStation] = useState(false);
  const [cart, setCart] = useState<Partial<Record<MenuCode, number>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultOrder, setResultOrder] = useState<Order | null>(null);
  const [resetting, setResetting] = useState(false);

  // station이 아직 없으면(최초 진입) 닫을 수 없는 모달, 있으면 헤더에서 연 변경 모달
  const stationModalOpen = station === null || changingStation;
  const stationModalMode: "initial" | "change" = station === null ? "initial" : "change";

  function handleSelectStation(next: Station) {
    setStation(next);
    setChangingStation(false);
  }

  function openChangeStation() {
    setChangingStation(true);
  }

  function cancelChangeStation() {
    setChangingStation(false);
  }

  function handleChangeQty(code: MenuCode, qty: number) {
    setCart((prev) => ({ ...prev, [code]: qty }));
  }

  const totalQty = MENU.reduce((sum, item) => sum + (cart[item.code] ?? 0), 0);
  const canOrder = Boolean(station) && totalQty > 0 && !submitting;

  async function handleOrder() {
    if (!station || totalQty === 0 || submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const items = buildOrderItems(cart);
      const order = await createOrder(station, items);
      setResultOrder(order);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "주문 처리 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseResult() {
    setResultOrder(null);
    setResetting(true);
    setTimeout(() => {
      setCart({});
      setResetting(false);
    }, RESET_DELAY_MS);
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-10 sm:px-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">커피 주문</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Coffee Order</p>
          </div>

          {station && (
            <button
              type="button"
              onClick={openChangeStation}
              className="shrink-0 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              접수대 {station} ▾
            </button>
          )}
        </header>

        <MenuGrid cart={cart} onChangeQty={handleChangeQty} disabled={submitting} />

        {errorMessage && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          disabled={!canOrder}
          onClick={handleOrder}
          className="w-full rounded-xl bg-zinc-900 py-4 text-base font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {submitting ? "주문 처리 중..." : `주문하기${totalQty > 0 ? ` (${totalQty})` : ""}`}
        </button>
      </div>

      <StationModal
        open={stationModalOpen}
        mode={stationModalMode}
        onSelect={handleSelectStation}
        onCancel={cancelChangeStation}
      />

      <OrderResultModal order={resultOrder} onClose={handleCloseResult} />

      {resetting && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/70 dark:bg-black/70">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        </div>
      )}
    </div>
  );
}
