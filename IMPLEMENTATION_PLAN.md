# cafe_order 구현 계획

> 요구사항 원본: `plan.md`
> 작성: team-lead / 구현 담당: devJayce
> 작성일: 2026-08-27 · 결정사항 반영: 2026-08-27 (8장 D1~D3)
> **본 문서는 계획서이며 코드는 아직 작성하지 않았다**

---

## 0. 요구사항 요약

| # | 요구 | 화면 |
|---|---|---|
| R1 | 첫 진입 시 "이 기기의 접수대를 선택해주세요" 모달 (A/B/C), 이후 변경 가능 | `/` |
| R2 | 커피 4종(라떼 HOT/ICE, 아메리카노 HOT/ICE) 박스 + 수량 + 주문하기 | `/` |
| R3 | 주문 시 모달에 **접수대별 순번** 주문번호(A1, A2… / B1, B2…) | `/` |
| R4 | 모달 하단 문구 "이 주문번호를 기억해주세요 번호를 찍어두세요" | `/` |
| R5 | 모달 닫고 메인 복귀 시 짧은 로딩 스피너 | `/` |
| R6 | 주문 목록(번호/메뉴/상태/처리/수령), 완료 처리 | `/kitchen` |
| R7 | 완료 처리 즉시 반영되는 대형 안내 화면 | `/display` |
| R8 | **2시간 / 700명** 동시 주문에도 병목 없을 것 | 전체 |
| R9 | **새로고침 없이** 버튼 누르면 UI 즉시 반응 | 전체 |

---

## 1. 핵심 설계 판단

R8·R9가 나머지 모든 결정을 지배한다. 다음 4가지를 먼저 못박고 시작한다.

### 판단 1 — 메뉴는 DB에 두지 않는다
메뉴가 **고정 4종**이므로 `src/lib/menu.ts` 상수로 둔다.

- 주문 화면이 완전 정적(static)이 되어 **DB 조회 0회, SSR 0회**
- 700명이 페이지를 열어도 DB에 아무 부하가 없다 (CDN에서 그대로 서빙)
- 메뉴 테이블·조인·캐시 무효화가 전부 사라진다

```ts
// src/lib/menu.ts (예정)
export const MENU = [
  { code: 'LATTE_HOT',  nameKo: '카페라떼', nameEn: 'Latte',      temp: 'HOT' },
  { code: 'LATTE_ICE',  nameKo: '카페라떼', nameEn: 'Latte',      temp: 'ICE' },
  { code: 'AMER_HOT',   nameKo: '아메리카노', nameEn: 'Americano', temp: 'HOT' },
  { code: 'AMER_ICE',   nameKo: '아메리카노', nameEn: 'Americano', temp: 'ICE' },
] as const;
```

### 판단 2 — 주문 1건 = 행 1개 (`items`를 JSONB로)
`order_items` 자식 테이블을 만들지 않는다.

- 주문 INSERT가 **단일 행 쓰기 1회** → 가장 빠른 쓰기 경로
- `/kitchen` 목록이 **조인 없이** 한 번의 SELECT로 끝난다
- 주문 시점 메뉴명이 행 안에 스냅샷으로 남는다

> 정규화(`order_items` 분리)는 메뉴별 판매 집계가 주 목적일 때 유리하다.
> 700건 규모에서는 `jsonb_array_elements`로 집계해도 즉시 나오므로 JSONB가 낫다.

### 판단 3 — 주문 번호는 **카운터 테이블 + UPDATE … RETURNING**
접수대별로 1번부터 빠짐없이 증가해야 한다(R3).

| 방식 | 빠짐없음 | 동시성 | 판단 |
|---|---|---|---|
| `sequence` (접수대별 3개) | ✗ (롤백 시 구멍) | 최상 | 탈락 — 번호가 건너뛰면 현장 혼란 |
| **카운터 행 `UPDATE … RETURNING`** | **✓** | 접수대별 행 락 | **채택** |
| 앱에서 `max(order_no)+1` | ✗ | 경합 시 중복 | 탈락 — 번호 중복 발생 |

카운터 행이 A/B/C 3개로 나뉘어 있어 락 경합이 1/3로 분산되고, 트랜잭션이 수 ms라
초당 수십 건까지 여유가 있다. 700건/2시간(평균 0.1건/초)에는 과분한 마진이다.

### 판단 4 — 주문은 **브라우저에서 Supabase RPC 직접 호출** (서버 액션 미사용)
`"use server"` 액션을 쓰면 `브라우저 → Next 서버 → Supabase`로 홉이 하나 늘고,
서버리스 콜드스타트가 지연·병목 지점이 된다.

- 주문: 브라우저 `supabase.rpc('create_order', …)` → **1홉**
- Next 서버는 정적 페이지 서빙만 담당 → 부하 지점에서 제외
- 기존 `src/lib/supabase/client.ts`를 그대로 재사용 (AGENTS.md 규칙)

---

## 2. 데이터 모델

```
order_counters (station PK)     -- A/B/C 각 1행, 순번 발급기
orders (id PK)                  -- 주문 1건 = 1행, items는 JSONB
```

### 상태 전이

```
pending ──[/kitchen 완료]──▶ done ──[/kitchen 수령]──▶ picked_up
   대기중                    준비완료                   수령완료
                               │
                               └─▶ /display 에 노출되는 구간
```

---

## 3. Supabase SQL

> Supabase Dashboard → **SQL Editor**에 붙여넣고 위에서부터 순서대로 실행한다.
> 파일은 기존 컨벤션대로 `supabase/schema.sql`에 저장할 예정(아직 미작성).

### 3-1. 확장 · ENUM · 공통 트리거

```sql
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
```

### 3-2. 순번 카운터

```sql
create table if not exists public.order_counters (
  station  text    primary key check (station in ('A', 'B', 'C')),
  last_no  integer not null default 0 check (last_no >= 0)
);

insert into public.order_counters (station)
values ('A'), ('B'), ('C')
on conflict (station) do nothing;
```

### 3-3. 주문

```sql
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
```

### 3-4. 주문 생성 RPC (순번 발급 + INSERT 를 한 트랜잭션에)

```sql
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
```

### 3-5. 상태 변경 RPC

```sql
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
```

> `where … and status = '이전상태'` 조건이 **중복 클릭 방지** 역할을 한다.
> 두 번째 클릭은 0행을 반환하므로 `done_at`이 덮어써지지 않는다.

### 3-6. RLS 정책

```sql
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
```

### 3-7. Realtime 활성화 (R7·R9의 핵심)

```sql
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
```

> Dashboard → Database → Replication 에서 `orders` 토글로도 동일하게 설정할 수 있다.
> `/kitchen`과 `/display`가 이 채널을 구독해 **새로고침 없이** 갱신된다.

### 3-8. 운영용 조회 (참고)

```sql
-- 메뉴별 총 판매 잔수
select it->>'name' as menu, sum((it->>'qty')::int) as cups
from public.orders o, jsonb_array_elements(o.items) it
group by 1
order by cups desc;

-- 접수대별 주문 건수
select station, count(*) from public.orders group by 1 order by 1;

-- 행사 종료 후 초기화 (주의: 전체 삭제)
-- truncate public.orders;
-- update public.order_counters set last_no = 0;
```

---

## 4. 화면 · 파일 구조

```
src/
  lib/
    menu.ts                  # 메뉴 4종 상수 (DB 아님)
    station.ts               # 접수대 localStorage 읽기/쓰기
    supabase/client.ts       # (기존 재사용)
    supabase/server.ts       # (기존 재사용)
    orders.ts                # rpc 래퍼: createOrder / markDone / markPicked
    types.ts                 # Order, OrderItem, Station 타입
  app/
    layout.tsx
    page.tsx                 # 주문 화면 (정적)
      station-modal.tsx      #   R1 접수대 선택 모달
      menu-grid.tsx          #   R2 메뉴 4박스 + 수량
      order-result-modal.tsx #   R3·R4·R5 주문번호 모달
    kitchen/page.tsx         # R6 주방 목록
      kitchen-table.tsx
    display/page.tsx         # R7 대형 안내 화면
      display-board.tsx
```

### `/` — 주문 화면
- **완전 정적**. DB 조회·SSR 없음 → 700명이 동시에 열어도 부하 0
- 진입 시 `localStorage`의 접수대 값 확인 → 없으면 A/B/C 선택 모달(R1)
  - 최초 선택 모달은 닫을 수 없다 (접수대 없이는 주문 불가)
  - 선택 후에는 헤더의 `접수대 A ▾`를 눌러 **언제든 변경 가능** (D3, 9장 참고)
- 메뉴 4박스, 각 박스에 `− 수량 +`. 합계 0이면 주문하기 비활성
- 주문하기 → 버튼 즉시 비활성(중복 제출 차단) → `create_order` RPC → 번호 모달(R3·R4)
- 모달 닫기 → 300~500ms 스피너(R5) → 수량 초기화된 주문 화면
  - **`router.refresh()`나 페이지 이동을 쓰지 않는다** (R9). 상태만 리셋

### `/kitchen` — 주방
- 초기 1회 SELECT(`status <> 'picked_up'`) 후 **Realtime 구독**
- 컬럼: `번호 No. / 메뉴 Menu / 상태 Status / 처리 Action / 수령 Pickup`
- 한 행에 메뉴 여러 줄: `카페라떼 (HOT) × 3` 형태로 `items`를 그대로 렌더
- `완료 Done` 클릭 → 낙관적 업데이트로 행이 즉시 바뀌고, 뒤에서 RPC 전송
  - 실패하면 롤백 + 토스트
- 완료된 행의 `수령 Pickup` 열에 수령 버튼 활성 → 누르면 목록에서 사라짐

### `/display` — 대형 화면
- Realtime으로 `status: done` 전이를 수신
- 최신 완료 건을 초대형으로: `방금 나왔어요 Just made` + `B2`
- 상단 고정 문구:
  - `주문하신 음료가 준비되었습니다 / Your order is ready!`
  - `번호를 확인하고 픽업대에서 받아가세요 / Please check your number and collect it at the pickup counter`
- 하단에 아직 안 가져간 준비완료 번호들을 작게 나열
- 번호 바뀔 때 애니메이션 + (선택) 알림음
- 장시간 방치 대비: 재연결 로직 + 60초마다 가벼운 폴백 재조회

---

## 5. 부하 대응 정리 (R8)

**규모 추정** — 700건 / 2시간 = 평균 0.1건/초. 다만 행사는 몰린다.
피크를 평균의 30배인 **3건/초**로 잡아도 아래 설계에서는 여유롭다.

| 잠재 병목 | 대응 |
|---|---|
| 페이지 로드 시 DB 조회 | 메뉴를 상수화 → 주문 화면 DB 조회 **0회** |
| Next 서버리스 콜드스타트 | 주문을 브라우저→Supabase 직접 RPC로 (Next 서버 우회) |
| 주문 INSERT | 단일 행 + JSONB → 쓰기 1회, 조인 없음 |
| 순번 발급 경합 | 카운터를 A/B/C 3행으로 분산, 트랜잭션 수 ms |
| Realtime 커넥션 수 | **주문 기기는 구독하지 않는다.** kitchen 1~2 + display 1 = 커넥션 3~4개 |
| 중복 주문 | 버튼 즉시 비활성 + RPC 상태 조건(`and status = 'pending'`) |
| 체감 지연 | 낙관적 UI — 응답을 기다리지 않고 화면 먼저 반응 |
| 목록 조회 | 부분 인덱스(`where status = 'pending'`)로 인덱스 크기 최소화 |
| Wi-Fi 불안정 | RPC 실패 시 1회 자동 재시도 + 실패 토스트, 번호 모달은 성공 후에만 표시 |

**행사 전 점검**
- [ ] `orders` Realtime publication 활성 확인
- [ ] A/B/C 3대에서 동시에 주문 눌러 번호 중복·건너뜀 없는지 확인
- [ ] `/display`를 2시간 켜두고 재연결 정상 동작 확인
- [ ] 리허설 후 `orders` 비우고 `order_counters.last_no` 0으로 초기화

---

## 6. 작업 순서 (devJayce 할당 단위)

| 단계 | 내용 | 검증 |
|---|---|---|
| **T1** | `supabase/schema.sql` 작성 (위 3장 전체) + Dashboard 실행 | 3-8 조회로 테이블·RPC 확인 |
| **T2** | `src/lib/`: `menu.ts`, `station.ts`, `types.ts`, `orders.ts` | `npm run lint` |
| **T3** | `/` 접수대 모달(선택+변경, 9장) + 메뉴 4박스 + 수량 | 새로고침 후 접수대 유지, 헤더에서 변경 동작 |
| **T4** | 주문 RPC 연결 + 번호 모달 + 스피너 복귀 | 3대 동시 주문 시 번호 정상 |
| **T5** | `/kitchen` 목록 + Realtime + 완료/수령 (낙관적 UI) | 새 주문이 새로고침 없이 뜸 |
| **T6** | `/display` 대형 화면 + Realtime 반영 | kitchen 완료 → display 즉시 변경 |
| **T7** | 정리: `src/app/test/`·`supabase/test_messages.sql` 제거, 부하 리허설 | `npm run lint` + `npm run build` |

> T1이 끝나야 T2~T6이 의미가 있다. T5와 T6은 병렬 가능.

---

## 7. 착수 전 확인 규칙

1. 코드 작성 전 `node_modules/next/dist/docs/01-app/` 의 관련 가이드를 읽는다
   (Next.js 16.3.3은 학습 데이터와 다른 breaking change 버전)
2. Supabase 클라이언트는 `src/lib/supabase/` 의 것을 재사용한다 (새로 만들지 않는다)
3. 스키마는 `supabase/*.sql` 파일로 관리하고 **RLS를 빠뜨리지 않는다**
4. 각 단계 종료 시 `npm run lint` + `npm run build` 결과를 있는 그대로 보고한다
5. 커밋/푸시는 명시적 지시가 있을 때만 한다

---

## 8. 확정된 결정사항

사용자 확정 (2026-08-27).

| # | 결정 | 계획 반영 |
|---|---|---|
| D1 | **결제·가격 없음** | `orders`에 금액 컬럼 없음. 주문 화면에 합계 금액 표시 없음. 수량만 다룬다 |
| D2 | **주문자 이름·연락처를 받지 않는다** | 주문 식별은 접수대+번호(`A3`)뿐. **개인정보가 없으므로** `orders` 공개 읽기 RLS를 그대로 유지하고, Realtime도 추가 RPC 없이 직접 구독한다 |
| D3 | **접수대는 기기당 선택 후 나중에 변경 가능** | `localStorage`에 저장하되 헤더에서 언제든 재선택. 상세는 4장 `/` 화면 참고 |

> D2가 설계를 크게 단순화한다. 개인정보가 생겼다면 공개 SELECT 정책을 없애고
> 토큰 기반 `security definer` 조회 RPC를 따로 만들어야 했지만, 그럴 필요가 없다.

---

## 9. 접수대 선택·변경 사양 (D3)

**저장** — `localStorage` 키 `cafe_order.station`, 값 `"A" | "B" | "C"`

**최초 진입**
- 값이 없으면 배경을 가리는 모달: `이 기기의 접수대를 선택해주세요`
- A / B / C 큰 버튼 3개. 고르면 저장 후 모달 닫힘
- 이 모달은 **닫기 없이 선택해야만 넘어간다** (접수대 없이는 주문번호를 만들 수 없으므로)

**변경**
- 헤더 우측에 현재 접수대를 항상 표시: `접수대 A ▾`
- 누르면 같은 A/B/C 모달이 다시 열리고, 이때는 **취소로 닫을 수 있다**
- 변경해도 이미 발급된 주문번호에는 영향 없다 (번호는 발급 시점에 DB에 확정됨)
- 장바구니에 담긴 수량이 있으면 변경 시 초기화할지 확인 → **유지**한다
  (수량은 접수대와 무관하고, 주문 시점의 접수대 값이 RPC로 전달된다)

**잘못된 값 방어**
- `localStorage` 값이 `A|B|C`가 아니면 없는 것으로 간주하고 선택 모달을 띄운다
- 서버에서도 `create_order`가 `check (station in ('A','B','C'))`로 재검증한다

---

## 10. 남은 확인 항목

아래는 아직 답을 못 받았다. 현재 기본값으로 진행하되, 다르면 알려주면 반영한다.
셋 다 화면 동작이라 나중에 바꿔도 스키마에는 영향이 없다.

| # | 기본값 | 다를 경우 |
|---|---|---|
| A3 | 인증 없음 — 같은 Wi-Fi의 내부 행사용 | 외부에 공개된다면 `/kitchen`·`/display`에 접근 제한 필요 |
| A4 | `수령 Pickup`은 완료된 주문을 목록·`/display`에서 내리는 동작 | 다르면 T5·T6 수정 |
| A5 | `/display`는 최신 1건을 크게 + 나머지 준비완료를 작게 | 최신 1건만 원하면 하단 목록 제거 |
