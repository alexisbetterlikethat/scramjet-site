function splitPayload(url = "") {
  const index = url.search(/[?#]/);
  return index < 0 ? [url, ""] : [url.slice(0, index), url.slice(index)];
}

function xorKeyValue(key) {
  const value = /^\d+$/.test(key) ? Number(key) : parseInt(key, 36);
  return Number.isFinite(value) && value > 1 ? (value % 30) + 2 : 2;
}

const encoder = {
  // biome-ignore format: compact
  xor: { encode: (url, key) => url && encodeURIComponent(url.split("").map((char, index) => (index % xorKeyValue(key) ? String.fromCharCode(char.charCodeAt(0) ^ xorKeyValue(key)) : char)).join("")), decode: (url, key) => { const [value, tail] = splitPayload(url); if (!value) return value; const xorKey = xorKeyValue(key); return decodeURIComponent(value).split("").map((char, index) => (index % xorKey ? String.fromCharCode(char.charCodeAt(0) ^ xorKey) : char)).join("") + tail } },
};

window.encode = { xor: encoder.xor.encode };
window.decode = { xor: encoder.xor.decode };

let swReady = false;
let swReadyResolve;
const swReadyPromise = new Promise(resolve => {
  swReadyResolve = resolve;
});

function isViewerPage() {
  return document.body?.id === "no" || Boolean(document.getElementById("frame-container"));
}

window.addEventListener("load", async () => {
  if (!("serviceWorker" in navigator)) {
    swReady = true;
    swReadyResolve();
    return;
  }

  const runtime = getRuntime();
  const swPath = runtime.sw.startsWith("/") ? runtime.sw : `/${runtime.sw}`;

  try {
    const registration = await navigator.serviceWorker.register(`${swPath}?b=${runtime.build}`, {
      scope: getPaths().uv,
    });

    if (registration.active) {
      swReady = true;
      swReadyResolve();
      return;
    }

    const worker = registration.installing || registration.waiting;
    if (worker) {
      worker.addEventListener("statechange", function onStateChange() {
        if (this.state === "activated") {
          swReady = true;
          swReadyResolve();
          worker.removeEventListener("statechange", onStateChange);
        }
      });
    } else {
      swReady = true;
      swReadyResolve();
    }
  } catch (err) {
    console.error("[SW] registration failed:", err);
    swReady = true;
    swReadyResolve();
  }
});

async function waitForServiceWorker() {
  if (swReady) return;
  await Promise.race([swReadyPromise, new Promise(resolve => setTimeout(resolve, 4000))]);
}

const form = document.getElementById("fv");
const input = document.getElementById("input");

if (form && input && !isViewerPage()) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const viewer = getViewerPath();
    try {
      if (isInTabMode) await navigate(input.value, "");
      else await navigate(input.value, viewer);
    } catch {
      await navigate(input.value, viewer);
    }
  });
}

async function encodeUrl(url) {
  if (window._sjBoot) await window._sjBoot;
  if (window._sjEnc?.encodeUrl) return window._sjEnc.encodeUrl(url);
  throw new Error("Route is not ready");
}

async function navigate(value, path) {
  await waitForServiceWorker();
  if (window.waitForBoot) await window.waitForBoot();

  let url = value.trim();
  const engine = localStorage.getItem("engine");
  const searchUrl = engine ? engine : "https://search.brave.com/search?q=";

  if (!isValidUrl(url)) {
    url = searchUrl + url;
  } else if (!(url.startsWith("https://") || url.startsWith("http://"))) {
    url = `https://${url}`;
  }

  const targetUrl = await encodeUrl(url);
  sessionStorage.setItem("GoUrl", targetUrl);

  if (path) location.href = path;
  else window.location.href = targetUrl;
}

function go(value) {
  return navigate(value, getViewerPath());
}

function blank(value) {
  return navigate(value, "");
}

function isValidUrl(val = "") {
  return /^http(s?):\/\//.test(val) || (val.includes(".") && val[0] !== " ");
}

(() => {
  const vendor = self.__vendor || {};

  async function ensureTransport(connection, transportPath, options, signature) {
    let current = "";
    try {
      current = await connection.getTransport();
    } catch {}

    if (current === transportPath && localStorage.getItem("transport-signature") === signature) return;

    await connection.setTransport(transportPath, options);
    localStorage.setItem("transport-signature", signature);
  }

  async function init() {
    const [muxMod, sjMod] = await Promise.all([importMuxModule(), loadSjController()]);
    const MuxConnection = pickCtor(muxMod);
    const RouteController = pickCtor(sjMod);
    const routeConfig = getRouteConfig();

    const primary = new RouteController(routeConfig);
    await primary.init();

    window._sjEnc = {
      encodeUrl: url => primary.encodeUrl(url),
      decodeUrl: url => primary.decodeUrl(url),
    };

    const tunnel = getWispUrl();
    const connection = new MuxConnection(vendor.baremuxWorker);
    const transport = localStorage.getItem("transport") === "relay" ? "relay" : "standard";
    if (transport === "relay") {
      await ensureTransport(connection, vendor.epoxy, [{ wisp: tunnel }], `${vendor.epoxy}|${tunnel}`);
    } else {
      await ensureTransport(connection, vendor.libcurl, [{ websocket: tunnel }], `${vendor.libcurl}|${tunnel}`);
    }
  }

  async function boot() {
    if (!getRouteConfig()) return;
    try {
      await init();
    } catch (error) {
      console.error("Transport failed to start:", error);
    }
  }

  const domReady =
    document.readyState === "loading" ? new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true })) : Promise.resolve();

  window._sjBoot = domReady.then(boot);
})();

window.waitForBoot = async function waitForBoot(timeout) {
  const wait = timeout ?? 12000;
  if (!window._sjBoot) return;
  await Promise.race([window._sjBoot.catch(() => {}), new Promise(resolve => setTimeout(resolve, wait))]);
};
