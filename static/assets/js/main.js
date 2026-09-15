// Theme is applied immediately, to prevent flashing on page load
(() => {
  const themeid = localStorage.getItem("theme");
  const themes = {
    catppuccinMocha: "/assets/css/themes/catppuccin/mocha.css",
    catppuccinMacchiato: "/assets/css/themes/catppuccin/macchiato.css",
    catppuccinFrappe: "/assets/css/themes/catppuccin/frappe.css",
    catppuccinLatte: "/assets/css/themes/catppuccin/latte.css",
    Inverted: "/assets/css/themes/colors/light.css",
    sky: "/assets/css/themes/colors/sky.css",
    tokyoNight: "/assets/css/themes/colors/tokyo-night.css",
    nord: "/assets/css/themes/colors/nord.css",
    rosePine: "/assets/css/themes/colors/rose-pine.css",
    oled: "/assets/css/themes/colors/oled.css",
    light: "/assets/css/themes/colors/light.css",
    gruvbox: "/assets/css/themes/colors/gruvbox.css",
    gruvboxLight: "/assets/css/themes/colors/gruvbox-light.css",
    everforest: "/assets/css/themes/colors/everforest.css",
    monokai: "/assets/css/themes/colors/monokai.css",
    oneDark: "/assets/css/themes/colors/one-dark.css",
    synthwave: "/assets/css/themes/colors/synthwave.css",
    solarized: "/assets/css/themes/colors/solarized.css",
    solarizedLight: "/assets/css/themes/colors/solarized-light.css",
  };

  if (themes[themeid]) {
    const themeLink = document.createElement("link");
    themeLink.rel = "stylesheet";
    themeLink.href = themes[themeid];
    document.head.appendChild(themeLink);
  } else {
    const customThemeCss = localStorage.getItem(`theme-${themeid}`);
    if (customThemeCss) {
      const customThemeStyle = document.createElement("style");
      customThemeStyle.textContent = customThemeCss;
      document.head.appendChild(customThemeStyle);
    }
  }

  function initEngine() {
    setEngine("sj");
    return "sj";
  }

  window.resolveEngineChoice = initEngine;
  window.resolveEngineChoice();
})();

let isInTabMode;

try {
  isInTabMode = window.top.location.pathname === getViewerPath();
} catch {
  try {
    isInTabMode = window.parent.location.pathname === getViewerPath();
  } catch {
    isInTabMode = false;
  }
}

function reconstructSafeUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = new URL(raw);
    const allowed = ["https:", "http:"];
    if (!allowed.includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    if (typeof raw === "string" && !raw.includes(":")) return raw;
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".nav-bar");

  if (nav) {
    const path = (window.location.pathname.replace(/\/$/, "") || "/").toLowerCase();
    const gamesPath = getPageRoute("games");
    const appsPath = getPageRoute("apps");
    const gamesHref = resolveGamesUrl(gamesPath);
    const appsHref = resolveGamesUrl(appsPath);
    const html = `
      <div id="icon-container">
        <a class="icon brand" href="/./"><span class="brand-name">Scramjet</span></a>
      </div>
      <div class="nav-bar-right">
        <a class="navbar-link${path === gamesPath ? " is-active" : ""}" href="${gamesHref}"><span class="navbar-link-icon" aria-hidden="true"><i class="fa-solid fa-fw fa-gamepad"></i></span><span class="navbar-link-label">${homoglyph("Games")}</span></a>
        <a class="navbar-link${path === appsPath ? " is-active" : ""}" href="${appsHref}"><span class="navbar-link-icon" aria-hidden="true"><i class="fa-solid fa-fw fa-table-cells"></i></span><span class="navbar-link-label">${homoglyph("Apps")}</span></a>
        <a class="navbar-link${path === "/y" ? " is-active" : ""}" href="/./y"><span class="navbar-link-icon" aria-hidden="true"><i class="fa-solid fa-fw fa-wand-magic-sparkles"></i></span><span class="navbar-link-label">${homoglyph("AI")}</span></a>
        <a class="navbar-link${path === "/settings" ? " is-active" : ""}" href="/./settings"><span class="navbar-link-icon" aria-hidden="true"><i class="fa-solid fa-fw fa-gear"></i></span><span class="navbar-link-label">${homoglyph("Settings")}</span></a>
      </div>`;
    nav.innerHTML = html;
  }

  homoglyphDom(document.querySelector(".main"));
  homoglyphDom(document.querySelector(".input-c"));
  homoglyphDom(document.querySelector(".settings-container"));
  if (document.body?.id === "no") homoglyphDom(document.querySelector(".browser-bar"));

  const search = document.getElementById("search");
  if (search?.placeholder) search.placeholder = homoglyph(search.placeholder);

  const category = document.getElementById("category");
  if (category) {
    category.querySelectorAll("option").forEach(option => {
      option.textContent = homoglyph(option.textContent);
    });
  }

  // Favicon and Name Logic
  const icon = document.getElementById("tab-favicon");
  const title = document.getElementById("t");
  const pageTitle = title?.textContent || "Scramjet";
  const pageIcon = icon?.getAttribute("href") || "favicon.png";
  const cloakName = localStorage.getItem("CustomName") || localStorage.getItem("name");
  const cloakIcon = localStorage.getItem("CustomIcon") || localStorage.getItem("icon");
  const focusCloak = localStorage.getItem("focusCloak") === "true";
  if (!focusCloak) {
    if (cloakName) title.textContent = cloakName;
    if (cloakIcon) {
      const safeIcon = reconstructSafeUrl(cloakIcon);
      if (safeIcon) icon.setAttribute("href", safeIcon);
    }
  } else if (title && icon) {
    const showReal = () => {
      title.textContent = pageTitle;
      icon.setAttribute("href", pageIcon);
    };
    const showCloak = () => {
      title.textContent = cloakName || "Home";
      const safe = cloakIcon && cloakIcon.startsWith("http") ? reconstructSafeUrl(cloakIcon) : cloakIcon;
      icon.setAttribute("href", safe || "/assets/media/favicon/classroom.png");
    };
    showReal();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) showCloak();
      else showReal();
    });
  }

  // Event Key Logic
  const eventKey = JSON.parse(localStorage.getItem("eventKey")) || ["`"];
  const rawPLink = localStorage.getItem("pLink") || "https://classroom.google.com/";
  const safePLink = reconstructSafeUrl(rawPLink) ?? "https://classroom.google.com/";

  const panicAnchor = document.createElement("a");
  panicAnchor.href = safePLink;
  panicAnchor.style.display = "none";
  document.body.appendChild(panicAnchor);

  let pressedKeys = [];
  document.addEventListener("keydown", event => {
    pressedKeys.push(event.key);
    const recentKeys = pressedKeys.slice(-eventKey.length);
    if (recentKeys.length === eventKey.length && eventKey.every((key, i) => key === recentKeys[i])) {
      panicAnchor.click();
      pressedKeys = [];
    }
  });

  // Background Image Logic
  const savedBackgroundImage = localStorage.getItem("backgroundImage");
  if (savedBackgroundImage === "none") {
    document.body.style.backgroundImage = "none";
  } else if (savedBackgroundImage) {
    document.body.style.backgroundImage = `url('${savedBackgroundImage}')`;
  }

  // Background Particles
  if (localStorage.getItem("particles") === "true") {
    // CSS Parallax Pixel Stars (based on codepen.io/sarazond/pen/LYGbwj)
    ["stars", "stars2", "stars3"].forEach(id => {
      if (!document.getElementById(id)) {
        const el = document.createElement("div");
        el.id = id;
        document.body.insertBefore(el, document.body.firstChild);
      }
    });
  }

  // Pointer Effects — cursor.js is only loaded when an effect is active
  const CURSOR_EFFECTS = ["rainbow-stars", "white-orbs", "rainbow-trail", "blue-orbs", "red-circle", "the-sims", "curly-cursor"];
  const activePointer = localStorage.getItem("pointer");

  if (CURSOR_EFFECTS.includes(activePointer)) {
    const cursorScript = document.createElement("script");
    cursorScript.src = "/assets/js/cursor.js";
    cursorScript.onload = () => initCursorEffect();
    document.head.appendChild(cursorScript);
  }

  if (localStorage.getItem("antiClose") === "true") {
    window.addEventListener("beforeunload", event => {
      event.preventDefault();
      event.returnValue = "";
    });
  }
});
