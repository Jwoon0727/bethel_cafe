// The Branch Café — 최소 PWA service worker
// 오프라인 폴백만 제공한다. Supabase Realtime/RPC는 캐싱하지 않는다(신선한 데이터 우선).

const CACHE_VERSION = "branch-cafe-v1";
const OFFLINE_URL = "/offline";
const STATIC_ASSETS = ["/", "/manifest.webmanifest", "/icon-192.svg", "/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 오직 GET만 처리 — POST/PUT/PATCH/DELETE는 통과
  if (request.method !== "GET") return;

  // Supabase/API 호출은 캐싱하지 않는다 — 항상 네트워크 우선
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;

  // 네트워크 우선 + 실패 시 캐시로 폴백
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match(OFFLINE_URL))),
  );
});
