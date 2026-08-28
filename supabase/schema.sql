-- cafe_order 스키마
-- Supabase Dashboard -> SQL Editor 에 붙여넣고 위에서부터 순서대로 실행하세요.
-- 참고: IMPLEMENTATION_PLAN.md 3장

-- =========================================================
-- 3-1. 확장 · ENUM · 공통 트리거
-- =========================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('pending', 'done', 'picked_up');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 3-2. 순번 카운터
-- =========================================================

create table if not exists public.order_counters (
  station  text    primary key check (station in ('A', 'B', 'C')),
  last_no  integer not null default 0 check (last_no >= 0)
);

insert into public.order_counters (station)
values ('A'), ('B'), ('C')
on conflict (station) do nothing;

-- =========================================================
-- 3-3. 주문
-- =========================================================

create table if not exists public.orders (
  id          uuid    primary key default gen_random_uuid(),
  station     text    not null check (station in ('A', 'B', 'C')),
  order_no    integer not null check (order_no > 0),
  -- 화면에 그대로 찍히는 번호: 'A' + 3 => 'A3'
  display_no  text    generated always as (station || order_no::text) stored,
  -- [{ "code": "LATTE_HOT", "name": "카페라떼 (HOT)", "qty": 3 }, ...]
  items       jsonb   not null check (jsonb_array_length(items) > 0),
  status      public.order_status not null default 'pending',
  done_at     timestamptz,
  picked_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint orders_station_no_uniq unique (station, order_no)
);

create or replace trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- /kitchen: 미처리 주문을 접수 순서대로
create index if not exists orders_pending_idx
  on public.orders (created_at)
  where status = 'pending';

-- /display: 가장 최근 준비완료 건
create index if not exists orders_done_idx
  on public.orders (done_at desc)
  where status = 'done';

-- =========================================================
-- 3-4. 주문 생성 RPC (순번 발급 + INSERT 를 한 트랜잭션에)
-- =========================================================

create or replace function public.create_order(
  p_station text,
  p_items   jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_no    integer;
  v_order public.orders;
  v_item  jsonb;
begin
  if p_station is null or p_station not in ('A', 'B', 'C') then
    raise exception '접수대가 올바르지 않습니다: %', p_station;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception '주문 항목이 비어 있습니다';
  end if;

  -- 허용된 메뉴 코드 / 수량인지 서버에서 재검증 (클라이언트 값을 믿지 않는다)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if (v_item->>'code') is null
       or (v_item->>'code') not in ('LATTE_HOT', 'LATTE_ICE', 'AMER_HOT', 'AMER_ICE') then
      raise exception '알 수 없는 메뉴입니다: %', v_item->>'code';
    end if;
    if coalesce((v_item->>'qty')::int, 0) not between 1 and 99 then
      raise exception '수량이 올바르지 않습니다: %', v_item->>'qty';
    end if;
  end loop;

  -- 접수대 행 하나만 잠그고 순번을 뽑는다 (A/B/C로 경합 분산, 빠짐없이 증가)
  update public.order_counters
     set last_no = last_no + 1
   where station = p_station
  returning last_no into v_no;

  insert into public.orders (station, order_no, items)
  values (p_station, v_no, p_items)
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.create_order(text, jsonb) to anon, authenticated;

-- =========================================================
-- 3-5. 상태 변경 RPC
-- =========================================================

create or replace function public.mark_order_done(p_id uuid)
returns public.orders
language sql
security definer
set search_path = public
as $$
  update public.orders
     set status = 'done', done_at = now()
   where id = p_id and status = 'pending'
  returning *;
$$;

create or replace function public.mark_order_picked(p_id uuid)
returns public.orders
language sql
security definer
set search_path = public
as $$
  update public.orders
     set status = 'picked_up', picked_at = now()
   where id = p_id and status = 'done'
  returning *;
$$;

grant execute on function public.mark_order_done(uuid)   to anon, authenticated;
grant execute on function public.mark_order_picked(uuid) to anon, authenticated;

-- `where ... and status = '이전상태'` 조건이 중복 클릭 방지 역할을 한다.
-- 두 번째 클릭은 0행을 반환하므로 done_at이 덮어써지지 않는다.

-- 취소(Undo): 주방에서 상태를 한 단계 되돌린다. 다른 RPC와 동일하게
-- security definer + `where ... and status = '이전상태'` 조건으로,
-- 이미 다른 곳에서 상태가 바뀐 경우 0행을 반환한다(클라이언트가 실패로 처리).
create or replace function public.revert_order_to_pending(p_id uuid)
returns public.orders
language sql
security definer
set search_path = public
as $$
  update public.orders
     set status = 'pending', done_at = null, picked_at = null
   where id = p_id and status = 'done'
  returning *;
$$;

create or replace function public.revert_order_to_done(p_id uuid)
returns public.orders
language sql
security definer
set search_path = public
as $$
  update public.orders
     set status = 'done', picked_at = null
   where id = p_id and status = 'picked_up'
  returning *;
$$;

grant execute on function public.revert_order_to_pending(uuid) to anon, authenticated;
grant execute on function public.revert_order_to_done(uuid)    to anon, authenticated;

-- =========================================================
-- 3-5b. 전체 초기화 RPC (행사 시작/종료 시 사용)
-- =========================================================
-- 모든 주문(picked_up 포함)과 순번을 초기화한다.
-- Kitchen 화면의 "초기화" 버튼에서 호출한다.
-- 반환값: 삭제된 주문 수(void 반환은 supabase-js에서 400이 나는 경우가 있어 int로).
-- 참고: Supabase는 WHERE 없는 DELETE/UPDATE를 기본적으로 막으므로 `where true`를 붙여 우회한다.
create or replace function public.reset_all_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.orders where true;
  get diagnostics v_deleted = row_count;

  update public.order_counters set last_no = 0 where true;

  return v_deleted;
end;
$$;

grant execute on function public.reset_all_orders() to anon, authenticated;

-- =========================================================
-- 3-6. RLS 정책
-- =========================================================

alter table public.orders         enable row level security;
alter table public.order_counters enable row level security;

-- 읽기: 공개 (주문 데이터에 개인정보가 없다 — 접수대/번호/메뉴/상태뿐)
--       Realtime(postgres_changes)도 RLS를 따르므로 select 정책이 반드시 필요하다.
drop policy if exists "orders_public_read" on public.orders;
create policy "orders_public_read"
  on public.orders
  for select
  using (true);

-- 쓰기: 직접 INSERT/UPDATE는 전면 차단.
--       모든 변경은 위의 security definer RPC를 통해서만 일어난다.
--       (정책을 만들지 않으면 기본 거부)

-- 카운터는 앱에서 직접 읽거나 쓸 일이 없다 (정책 없음 = 전면 차단, RPC만 접근)

-- =========================================================
-- 3-7. Realtime 활성화 (R7·R9의 핵심)
-- =========================================================

-- 재실행해도 안전하도록 이미 등록되어 있으면 건너뛴다
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- Dashboard -> Database -> Replication 에서 orders 토글로도 동일하게 설정할 수 있다.
-- /kitchen 과 /display 가 이 채널을 구독해 새로고침 없이 갱신된다.

-- =========================================================
-- 3-8. 운영용 조회 (참고 — 실행하지 않아도 됨)
-- =========================================================

-- -- 메뉴별 총 판매 잔수
-- select it->>'name' as menu, sum((it->>'qty')::int) as cups
-- from public.orders o, jsonb_array_elements(o.items) it
-- group by 1
-- order by cups desc;

-- -- 접수대별 주문 건수
-- select station, count(*) from public.orders group by 1 order by 1;

-- -- 행사 종료 후 초기화 (주의: 전체 삭제)
-- -- truncate public.orders;
-- -- update public.order_counters set last_no = 0;
