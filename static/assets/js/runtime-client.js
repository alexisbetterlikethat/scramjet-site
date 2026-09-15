const FALLBACK = {
  build: "dev",
  sw: "/sw.js",
  paths: {
    wisp: "/wisp/",
    uv: "/uv/",
    scramjet: "/uv/scramjet/",
    eggs: "/uv/eggs/",
  },
  pageRoutes: {
    games: "/g",
    apps: "/a",
    viewer: "/v",
  },
  externalWisp: null,
  gamesHost: null,
  scramjetOnly: true,
};

function getRuntime() {
  return self.__runtime ?? FALLBACK;
}

function getPaths() {
  return getRuntime().paths;
}

function getPageRoute(name) {
  const routes = getRuntime().pageRoutes ?? FALLBACK.pageRoutes;
  return routes[name];
}

function getViewerPath() {
  return getPageRoute("viewer");
}

function getWispUrl() {
  const custom = getTunnelUrl().trim();
  if (custom && /^wss?:\/\//i.test(custom)) return custom;

  const runtime = getRuntime();
  if (runtime.externalWisp) return runtime.externalWisp;

  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const path = getPaths().wisp;
  return `${protocol}://${location.host}${path}`;
}

function resolveGamesUrl(path) {
  const host = getRuntime().gamesHost;
  if (!host || !path.startsWith("/")) return path;
  return new URL(path, host).href;
}

function getRouteConfig() {
  return self.__scramjet$config;
}

function getRoutePrefix(alt = false) {
  const paths = getPaths();
  return alt ? paths.eggs : paths.scramjet;
}

function pickCtor(mod) {
  return Object.values(mod).find(value => typeof value === "function");
}

function loadSjController() {
  const globals = getRouteConfig()?.globals;
  const name = globals?.$scramjetLoadController ?? "$scramjetLoadController";
  const fn = self[name];
  if (typeof fn !== "function") throw new Error("Transport loader unavailable");
  return fn();
}

function importMuxModule() {
  const vendor = self.__vendor || {};
  return import(vendor.baremux);
}

window.getRuntime = getRuntime;
window.getPaths = getPaths;
window.getPageRoute = getPageRoute;
window.getViewerPath = getViewerPath;
window.getWispUrl = getWispUrl;
window.resolveGamesUrl = resolveGamesUrl;
window.getRouteConfig = getRouteConfig;
window.getRoutePrefix = getRoutePrefix;
window.pickCtor = pickCtor;
window.loadSjController = loadSjController;
window.importMuxModule = importMuxModule;
