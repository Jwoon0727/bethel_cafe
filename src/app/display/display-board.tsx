"use client";

import type { Order } from "@/lib/types";

const MAX_REST_VISIBLE = 8;

type DisplayBoardProps = {
  orders: Order[];
};

// 배경색 의논 중 - 블랙 or 다크브라운으로

const BRICK_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' width='160' height='80' viewBox='0 0 160 80'>
  <rect width='160' height='80' fill='#8b2f24'/>
  <g fill='none' stroke='#2a0806' stroke-width='3'>
    <rect x='0' y='0' width='80' height='40'/>
    <rect x='80' y='0' width='80' height='40'/>
    <rect x='-40' y='40' width='80' height='40'/>
    <rect x='40' y='40' width='80' height='40'/>
    <rect x='120' y='40' width='80' height='40'/>
  </g>
  <g fill='rgba(255,255,255,0.03)'>
    <rect x='4' y='4' width='72' height='32'/>
    <rect x='84' y='4' width='72' height='32'/>
    <rect x='44' y='44' width='72' height='32'/>
    <rect x='124' y='44' width='72' height='32'/>
  </g>
</svg>
`.trim();

const BRICK_BG = `url("data:image/svg+xml;utf8,${encodeURIComponent(BRICK_SVG)}")`;

export function DisplayBoard({ orders }: DisplayBoardProps) {
  const [latest, ...rest] = orders;
  const visibleRest = rest.slice(0, MAX_REST_VISIBLE);

  return (
    <div
      className="relative min-h-screen w-full"
      style={{
        backgroundImage: BRICK_BG,
        backgroundSize: "240px 120px",
        backgroundColor: "#8b2f24",
      }}
    >
      {/* Dark overlay to keep text legible over brick */}
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1800px] flex-col items-center gap-10 px-10 py-12 text-center 2xl:gap-14 2xl:px-16 2xl:py-16">
        <div className="space-y-3">
          <p className="text-5xl font-bold text-[#d4a76a] sm:text-6xl 2xl:text-7xl">
            주문하신 음료가 준비되었습니다!
          </p>
          <p className="text-3xl font-semibold text-white sm:text-4xl 2xl:text-5xl">
            Your order is ready!
          </p>
         
        </div>

        <div className="flex w-full flex-col items-center gap-6">
          {latest ? (
            <>
              <p className="text-3xl font-medium sm:text-4xl 2xl:text-5xl">
             
              </p>
              <div
                key={latest.id}
                style={{ animation: "display-pop 0.5s ease-out" }}
                className="flex w-full items-center justify-center rounded-[2.5rem] border-[6px] border-[#d4a76a] bg-[#3a2a1f]/80 py-20 shadow-[0_0_100px_rgba(212,167,106,0.4)] 2xl:py-28"
              >
                <p className="text-[16rem] font-extrabold leading-none tracking-tight text-[#d4a76a] sm:text-[20rem] 2xl:text-[24rem]">
                  {latest.display_no}
                </p>
              </div>
            </>
          ) : (
            <p className="text-4xl text-white/50 2xl:text-5xl">준비 중인 주문이 없습니다</p>
          )}
        </div>

        {visibleRest.length > 0 && (
          <div className="w-full space-y-6 pt-6">
       
  
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 2xl:gap-8">
              {visibleRest.map((order) => (
                <div
                  key={order.id}
                  className="rounded-3xl border border-white/10 bg-[#2a1f18]/80 py-14 text-center shadow-lg 2xl:py-20"
                >
                  <p className="text-[8rem] font-extrabold leading-none tracking-tight text-[#f0e4d0] 2xl:text-[10rem]">
                    {order.display_no}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
