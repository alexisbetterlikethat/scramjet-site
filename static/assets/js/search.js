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

function isTabsPage() {
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

if (form && input && !isTabsPage()) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      if (isInTabMode) await navigate(input.value, "");
      else await navigate(input.value, "/tabs");
    } catch {
      await navigate(input.value, "/tabs");
    }
  });
}

function proxyChoice(proxyOverride) {
  return proxyOverride ?? localStorage.getItem("proxy") ?? "sj";
}

function isScramjet(proxyOverride) {
  const choice = proxyChoice(proxyOverride);
  return choice !== "uv";
}

function isEggs(proxyOverride) {
  return proxyChoice(proxyOverride) === "eggs";
}

async function ensureUltraviolet() {
  if (self.__uv$config) return;
  const load = src =>
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  await load("/assets/ultraviolet/uv.bundle.js");
  await load("/assets/ultraviolet/uv.config.js");
}
window.ensureUltraviolet = ensureUltraviolet;

async function encodeUrl(url, proxyOverride) {
  const paths = getPaths();

  if (isEggs(proxyOverride)) {
    if (window.scramjetReady) await window.scramjetReady;
    if (window.eggs?.encodeUrl) return window.eggs.encodeUrl(url);
    if (window.scramjet?.encodeUrl) return window.scramjet.encodeUrl(url);
    throw new Error("Scrambled Eggs is not ready");
  }

  if (isScramjet(proxyOverride)) {
    if (window.scramjetReady) await window.scramjetReady;
    if (window.scramjet?.encodeUrl) return window.scramjet.encodeUrl(url);
    throw new Error("Scramjet is not ready");
  }

  if (getRuntime().scramjetOnly) {
    if (window.scramjetReady) await window.scramjetReady;
    if (window.scramjet?.encodeUrl) return window.scramjet.encodeUrl(url);
    throw new Error("Scramjet is not ready");
  }

  await ensureUltraviolet();
  return `${paths.uv}${__uv$config.encodeUrl ? __uv$config.encodeUrl(url) : window.encode.xor(url)}`;
}

async function navigate(value, path, proxyOverride) {
  await waitForServiceWorker();
  if (window.waitForProxyBoot) await window.waitForProxyBoot();

  let url = value.trim();
  const engine = localStorage.getItem("engine");
  const searchUrl = engine ? engine : "https://search.brave.com/search?q=";

  if (!isValidUrl(url)) {
    url = searchUrl + url;
  } else if (!(url.startsWith("https://") || url.startsWith("http://"))) {
    url = `https://${url}`;
  }

  const proxyUrl = await encodeUrl(url, proxyOverride);
  sessionStorage.setItem("GoUrl", proxyUrl);

  if (path) location.href = path;
  else window.location.href = proxyUrl;
}

function go(value, proxyOverride) {
  navigate(value, "/tabs", proxyOverride);
}

function blank(value, proxyOverride) {
  navigate(value, "", proxyOverride);
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
    const [{ BareMuxConnection }, { ScramjetController }] = await Promise.all([import(vendor.baremux), window.$scramjetLoadController()]);

    const paths = getPaths();
    const scramjet = new ScramjetController(self.__scramjet$config);
    await scramjet.init();

    window.scramjet = {
      encodeUrl: url => scramjet.encodeUrl(url),
      decodeUrl: url => scramjet.decodeUrl(url),
    };

    try {
      const eggs = new ScramjetController({
        ...self.__scramjet$config,
        prefix: paths.eggs,
        flags: {
          rewriterLogs: false,
          scramitize: false,
          cleanErrors: true,
          sourcemaps: false,
        },
      });
      await eggs.init();
      window.eggs = {
        encodeUrl: url => eggs.encodeUrl(url),
        decodeUrl: url => eggs.decodeUrl(url),
      };
    } catch (error) {
      window.eggs = {
        encodeUrl: url => scramjet.encodeUrl(url).replace(paths.scramjet, paths.eggs),
        decodeUrl: url => scramjet.decodeUrl(String(url).replace(paths.eggs, paths.scramjet)),
      };
      console.warn("Scrambled Eggs using light fallback:", error);
    }

    const wisp = getWispUrl();
    const connection = new BareMuxConnection(vendor.baremuxWorker);
    const usingEggs = localStorage.getItem("proxy") === "eggs";
    const transport = usingEggs ? "libcurl" : localStorage.getItem("transport") || "libcurl";
    if (transport === "epoxy") {
      await ensureTransport(connection, vendor.epoxy, [{ wisp }], `${vendor.epoxy}|${wisp}`);
    } else {
      await ensureTransport(connection, vendor.libcurl, [{ websocket: wisp }], `${vendor.libcurl}|${wisp}`);
    }
  }

  async function boot() {
    if (typeof window.$scramjetLoadController !== "function" || !self.__scramjet$config) return;
    try {
      await init();
    } catch (error) {
      console.error("Scramjet transport failed to start:", error);
    }
  }

  const domReady =
    document.readyState === "loading" ? new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true })) : Promise.resolve();

  window.scramjetReady = domReady.then(boot);
})();

window.waitForProxyBoot = async function waitForProxyBoot(timeout) {
  const wait = timeout ?? (localStorage.getItem("proxy") === "eggs" ? 5000 : 12000);
  if (!window.scramjetReady) return;
  await Promise.race([window.scramjetReady.catch(() => {}), new Promise(resolve => setTimeout(resolve, wait))]);
};
