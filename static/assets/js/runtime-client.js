const FALLBACK = {
  build: "dev",
  sw: "/sw.js",
  paths: {
    wisp: "/wisp/",
    uv: "/uv/",
    scramjet: "/uv/scramjet/",
    eggs: "/uv/eggs/",
  },
  externalWisp: null,
  gamesHost: null,
  scramjetOnly: false,
};

function getRuntime() {
  return self.__runtime ?? FALLBACK;
}

function getPaths() {
  return getRuntime().paths;
}

function getWispUrl() {
  const custom = localStorage.getItem("wisp-url")?.trim();
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

window.getRuntime = getRuntime;
window.getPaths = getPaths;
window.getWispUrl = getWispUrl;
window.resolveGamesUrl = resolveGamesUrl;
