importScripts("/assets/scramjet/scramjet.all.js");
importScripts("/assets/scramjet/scramjet.config.js");

const PATHS = {
  uv: "/uv/",
  scramjet: "/uv/scramjet/",
  eggs: "/uv/eggs/",
};

function routeConfig() {
  return self.__scramjet$config;
}

function loadWorker() {
  const globals = routeConfig()?.globals;
  const name = globals?.$scramjetLoadWorker ?? "$scramjetLoadWorker";
  const fn = self[name];
  if (typeof fn !== "function") throw new Error("Worker loader unavailable");
  return fn();
}

const workerMod = loadWorker();
const RouteWorker = Object.values(workerMod).find(value => typeof value === "function");
const sj = new RouteWorker();

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    (async () => {
      const url = event.request.url;
      const eggs = url.includes(PATHS.eggs);
      const cfg = routeConfig() ?? {};
      self.__scramjet$config = {
        ...cfg,
        prefix: eggs ? PATHS.eggs : PATHS.scramjet,
      };
      await sj.loadConfig();
      if (await sj.route(event)) return await sj.fetch(event);
      return await fetch(event.request);
    })(),
  );
});
