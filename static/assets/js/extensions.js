function getEnabledExtensionIds() {
  try {
    return JSON.parse(localStorage.getItem(STORE.extEnabled) || "[]");
  } catch {
    return [];
  }
}

function setEnabledExtensionIds(ids) {
  localStorage.setItem(STORE.extEnabled, JSON.stringify(ids));
}

function getCustomExtensions() {
  try {
    return JSON.parse(localStorage.getItem(STORE.extCustom) || "[]");
  } catch {
    return [];
  }
}

function setCustomExtensions(list) {
  localStorage.setItem(STORE.extCustom, JSON.stringify(list));
}

async function loadBuiltInExtensions() {
  if (window.__builtInExtensions) return window.__builtInExtensions;
  try {
    const res = await fetch("/assets/json/extensions.json");
    window.__builtInExtensions = await res.json();
  } catch {
    window.__builtInExtensions = [];
  }
  return window.__builtInExtensions;
}

function extensionMatches(ext, url) {
  if (!ext?.site || ext.site === "*") return true;
  return (url || "").includes(ext.site);
}

async function getActiveExtensions(url) {
  const builtIn = await loadBuiltInExtensions();
  const enabled = new Set(getEnabledExtensionIds());
  const picked = builtIn.filter(ext => enabled.has(ext.id) && extensionMatches(ext, url));
  return picked.concat(getCustomExtensions().filter(ext => ext.enabled !== false && extensionMatches(ext, url)));
}

function injectExtensionsIntoFrame(iframe, url) {
  const doc = iframe?.contentDocument;
  if (!doc?.body) return;
  const routeScope = getPaths().uv;
  if (!String(url || "").includes(routeScope)) return;
  if (doc.documentElement.dataset.sjExt === "1") return;
  doc.documentElement.dataset.sjExt = "1";
  getActiveExtensions(url).then(list => {
    for (const ext of list) {
      try {
        const script = doc.createElement("script");
        script.textContent = String(ext.code || "");
        doc.body.appendChild(script);
      } catch {}
    }
  });
}

window.getEnabledExtensionIds = getEnabledExtensionIds;
window.setEnabledExtensionIds = setEnabledExtensionIds;
window.getCustomExtensions = getCustomExtensions;
window.setCustomExtensions = setCustomExtensions;
window.loadBuiltInExtensions = loadBuiltInExtensions;
window.injectExtensionsIntoFrame = injectExtensionsIntoFrame;
