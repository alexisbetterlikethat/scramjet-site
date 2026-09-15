const STORE = {
  engine: "engine",
  siteCompat: "site-compat",
  tunnelUrl: "tunnel-url",
  extEnabled: "ext-on",
  extCustom: "ext-custom",
};

const LEGACY = [
  ["proxy", STORE.engine],
  ["proxy-compat", STORE.siteCompat],
  ["wisp-url", STORE.tunnelUrl],
  ["proxy-extensions", STORE.extEnabled],
  ["proxy-extensions-custom", STORE.extCustom],
];

function migrateStorage() {
  for (const [oldKey, newKey] of LEGACY) {
    const value = localStorage.getItem(oldKey);
    if (value !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, value);
      localStorage.removeItem(oldKey);
    }
  }
  if (localStorage.getItem("transport") === "epoxy") localStorage.setItem("transport", "relay");
  if (localStorage.getItem("transport") === "libcurl") localStorage.setItem("transport", "standard");
  if (localStorage.getItem(STORE.siteCompat) !== "3") {
    localStorage.setItem(STORE.siteCompat, "3");
  }
}

migrateStorage();

function getEngine() {
  if (localStorage.getItem(STORE.engine) !== "sj") {
    localStorage.setItem(STORE.engine, "sj");
  }
  return "sj";
}

function setEngine(value) {
  localStorage.setItem(STORE.engine, value);
}

function getTunnelUrl() {
  return localStorage.getItem(STORE.tunnelUrl) ?? "";
}

function setTunnelUrl(value) {
  if (value) localStorage.setItem(STORE.tunnelUrl, value);
  else localStorage.removeItem(STORE.tunnelUrl);
}

window.STORE = STORE;
window.getEngine = getEngine;
window.setEngine = setEngine;
window.getTunnelUrl = getTunnelUrl;
window.setTunnelUrl = setTunnelUrl;
