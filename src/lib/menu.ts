import type { OrderItem } from "@/lib/types";

export type MenuCode = "LATTE_HOT" | "LATTE_ICE" | "AMER_HOT" | "AMER_ICE";

export type MenuTemp = "HOT" | "ICE";

export type MenuItem = {
  code: MenuCode;
  nameKo: string;
  nameEn: string;
  temp: MenuTemp;
};

// 메뉴는 고정 4종이므로 DB에 두지 않는다 (IMPLEMENTATION_PLAN.md 판단 1).
export const MENU: MenuItem[] = [
  { code: "LATTE_HOT", nameKo: "카페라떼", nameEn: "Latte", temp: "HOT" },
  { code: "LATTE_ICE", nameKo: "카페라떼", nameEn: "Latte", temp: "ICE" },
  { code: "AMER_HOT", nameKo: "아메리카노", nameEn: "Americano", temp: "HOT" },
  { code: "AMER_ICE", nameKo: "아메리카노", nameEn: "Americano", temp: "ICE" },
];

export function menuDisplayName(item: Pick<MenuItem, "nameKo" | "temp">): string {
  return `${item.nameKo} (${item.temp})`;
}

/**
 * 장바구니(수량 맵)를 create_order RPC에 보낼 items 배열로 변환한다.
 * 수량이 0 이하인 메뉴는 제외한다.
 */
export function buildOrderItems(
  cart: Partial<Record<MenuCode, number>>,
): OrderItem[] {
  return MENU.filter((item) => (cart[item.code] ?? 0) > 0).map((item) => ({
    code: item.code,
    name: menuDisplayName(item),
    qty: cart[item.code]!,
  }));
}
