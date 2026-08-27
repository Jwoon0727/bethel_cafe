export type Station = "A" | "B" | "C";

export type OrderStatus = "pending" | "done" | "picked_up";

export type OrderItem = {
  code: string;
  name: string;
  qty: number;
};

export type Order = {
  id: string;
  station: Station;
  order_no: number;
  display_no: string;
  items: OrderItem[];
  status: OrderStatus;
  done_at: string | null;
  picked_at: string | null;
  created_at: string;
  updated_at: string;
};
