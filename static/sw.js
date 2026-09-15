importScripts("/assets/scramjet/scramjet.all.js");
importScripts("/assets/scramjet/scramjet.config.js");

const PATHS = {
  uv: "/uv/",
  scramjet: "/uv/scramjet/",
  eggs: "/uv/eggs/",
};

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
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

function ensureUltraviolet() {
  if (uv) return;
  importScripts("/assets/ultraviolet/uv.bundle.js");
  importScripts("/assets/ultraviolet/uv.config.js");
  importScripts(self.__uv$config.sw || "/assets/ultraviolet/uv.sw.js");
  uv = new UVServiceWorker();
}

function isEggsRequest(url) {
  return url.includes(PATHS.eggs);
}

function isLegacyUvRequest(url) {
  const origin = `${location.origin}${PATHS.uv}`;
  return url.startsWith(origin) && !url.includes(PATHS.scramjet) && !url.includes(PATHS.eggs);
}

self.addEventListener("fetch", event => {
  event.respondWith(
    (async () => {
      const url = event.request.url;
      self.__scramjet$config = {
        ...self.__scramjet$config,
        prefix: isEggsRequest(url) ? PATHS.eggs : PATHS.scramjet,
      };
      await sj.loadConfig();

      if (await sj.route(event)) return await sj.fetch(event);

      if (isLegacyUvRequest(url)) {
        ensureUltraviolet();
        return await uv.fetch(event);
      }

      return await fetch(event.request);
    })(),
  );
});
