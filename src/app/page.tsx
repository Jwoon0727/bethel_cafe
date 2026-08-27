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
    <div className="flex min-h-screen flex-col bg-[#f5f1e8]">
      {/* Header */}
      <header className="bg-[#6b7c5b] px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌿</span>
            <h1 className="text-lg font-medium">The Branch Café</h1>
          </div>
          {station && (
            <button
              type="button"
              onClick={openChangeStation}
              className="rounded bg-white/20 px-2.5 py-1 text-xs transition hover:bg-white/30"
            >
              변경
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto flex w-full max-w-[820px] flex-1 flex-col px-6 py-6 md:px-8">
        {/* Menu Section */}
        <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm md:p-6">
          <h2 className="mb-4 text-base font-medium text-gray-700">
            메뉴 선택 (Menu)
          </h2>
          <MenuGrid cart={cart} onChangeQty={handleChangeQty} disabled={submitting} />
          <p className="mt-3 text-center text-sm text-gray-500">
            메뉴를 눌러 담아주세요
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          disabled={!canOrder}
          onClick={handleOrder}
          className="w-full rounded-xl bg-[#2D5A43] py-5 text-center text-lg font-medium text-white transition hover:bg-[#244a36] disabled:opacity-40"
        >
          <div>주문 등록</div>
          <div className="text-sm">Submit Order</div>
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/70">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
