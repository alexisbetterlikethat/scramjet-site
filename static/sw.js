// v2: Scramjet-first, UV loaded only for /uv/ traffic
importScripts("/assets/scramjet/scramjet.all.js");
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const sj = new ScramjetServiceWorker();

let uv;

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function ensureUltraviolet() {
  if (uv) return;
  importScripts("/assets/ultraviolet/uv.bundle.js");
  importScripts("/assets/ultraviolet/uv.config.js");
  importScripts(self.__uv$config.sw || "/assets/ultraviolet/uv.sw.js");
  uv = new UVServiceWorker();
}

self.addEventListener("fetch", event => {
  event.respondWith(
    (async () => {
      await sj.loadConfig();

      if (await sj.route(event)) {
        return await sj.fetch(event);
      }

      const url = event.request.url;
      if (url.startsWith(`${location.origin}/uv/`) && !url.includes("/scramjet/")) {
        ensureUltraviolet();
        return await uv.fetch(event);
      }

      return await fetch(event.request);
    })(),
  );
});
