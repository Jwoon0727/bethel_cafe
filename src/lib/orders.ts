import { createClient } from "@/lib/supabase/client";
import type { Order, OrderItem, Station } from "@/lib/types";

/**
 * 주문 생성. 브라우저에서 Supabase RPC를 직접 호출한다 (서버 액션 미사용).
 * IMPLEMENTATION_PLAN.md 판단 4 — 홉을 늘리지 않기 위해 Next 서버를 거치지 않는다.
 */
export async function createOrder(
  station: Station,
  items: OrderItem[],
): Promise<Order> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc("create_order", {
      p_station: station,
      p_items: items,
    })
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    // 주문번호를 못 받은 경우는 진짜 실패다 (성공 간주 불가)
    throw new Error("주문 생성에 실패했습니다. 다시 시도해 주세요.");
  }

  return data as Order;
}

/**
 * 완료 처리. RPC가 `where status = 'pending'` 조건으로 0행을 반환하면
 * (이미 완료 처리된 중복 클릭 등) null을 돌려준다 — 이는 실패가 아니라
 * "이미 처리됨"이므로 호출부에서 성공으로 간주해야 한다.
 */
export async function markOrderDone(id: string): Promise<Order | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc("mark_order_done", { p_id: id })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Order) ?? null;
}

/** markOrderDone과 동일한 이유로 0행(null)은 실패가 아니다. */
export async function markOrderPicked(id: string): Promise<Order | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc("mark_order_picked", { p_id: id })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Order) ?? null;
}

/**
 * 상태 되돌리기(취소). mark_order_done/picked과 동일하게 security definer RPC를
 * 통해서만 UPDATE한다 — orders 테이블에는 SELECT 정책만 있고 직접 UPDATE는
 * RLS로 전면 차단되어 있으므로(3-6절), 직접 .update()를 쓰면 조용히 0행만
 * 돌아오고 DB에는 아무 변화도 없다.
 * done → pending: 준비완료를 다시 대기중으로
 * picked_up → done: 수령완료를 다시 준비완료로
 * RPC의 `where ... and status = '이전상태'` 조건 때문에 그 사이 다른 곳에서
 * 이미 상태가 바뀐 경우 0행(null)이 반환된다 — 이건 "이미 처리됨"이 아니라
 * "취소가 더 이상 유효하지 않음"이므로 호출부에서 실패로 다뤄야 한다.
 */
export async function revertOrderToPending(id: string): Promise<Order | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc("revert_order_to_pending", { p_id: id })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Order) ?? null;
}

export async function revertOrderToDone(id: string): Promise<Order | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc("revert_order_to_done", { p_id: id })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Order) ?? null;
}

/**
 * 전체 초기화(행사 시작/종료 시 사용). 모든 주문(picked_up 포함)과 순번 카운터를 리셋한다.
 */
export async function resetAllOrders(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("reset_all_orders");
  if (error) {
    throw error;
  }
}
