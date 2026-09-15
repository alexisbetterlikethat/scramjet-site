const pagePath = (window.location.pathname.replace(/\/$/, "") || "/").toLowerCase();
const isGamesPage = pagePath === getPageRoute("games");
const isAppsPage = pagePath === getPageRoute("apps");

function getStorageKey(baseKey) {
  if (isGamesPage) return `G${baseKey}`;
  if (isAppsPage) return `A${baseKey}`;
  return baseKey;
}

function getFromStorage(baseKey) {
  return localStorage.getItem(getStorageKey(baseKey));
}

function setInStorage(baseKey, value) {
  localStorage.setItem(getStorageKey(baseKey), value);
}

const POPULAR_GAMES = [
  "slope",
  "1v1.lol",
  "1v1 lol",
  "cookie clicker",
  "retro bowl",
  "subway surfers",
  "minecraft",
  "geometry dash",
  "friday night funkin",
  "smash karts",
  "shell shockers",
  "krunker",
  "run 3",
  "2048",
  "crossy road",
  "flappy bird",
  "among us",
  "roblox",
  "bitlife",
  "paper.io",
  "hole.io",
  "drift boss",
  "stickman hook",
  "basket random",
  "soccer random",
  "volley random",
  "idle breakout",
  "tunnel rush",
  "ovo",
  "vex 7",
  "vex 6",
  "vex 5",
  "moto x3m",
  "getaway shootout",
  "snow rider",
  "temple run",
  "super mario 64",
  "bloons",
  "duck life",
  "snake",
  "breakout",
];

function popularityRank(name = "") {
  const n = name.toLowerCase();
  const index = POPULAR_GAMES.findIndex(key => n.includes(key));
  return index === -1 ? 1000 : index;
}

function saveUrlToSession(url) {
  sessionStorage.setItem("GoUrl", url);
}

async function handleAppClick(app) {
  if (app.say) {
    alert(app.say);
  }

  let selectedUrl = app.link;
  if (app.links && app.links.length > 1) {
    selectedUrl = promptUserForLink(app.links);
    if (!selectedUrl) return false;
  }

  const proxy = app.proxy;

  try {
    if (app.local) {
      saveUrlToSession(selectedUrl);
      window.location.href = isInTabMode ? selectedUrl : "/tabs";
    } else if (app.local2) {
      saveUrlToSession(selectedUrl);
      window.location.href = selectedUrl;
    } else if (app.blank) {
      if (typeof blank === "function") await blank(selectedUrl, proxy);
    } else if (app.now) {
      if (typeof blank === "function") await blank(selectedUrl, proxy);
      if (isInTabMode) window.location.href = selectedUrl;
    } else if (app.custom) {
      createCustomApp();
    } else if (typeof go === "function") {
      await go(selectedUrl, proxy);
      if (isInTabMode && typeof blank === "function") await blank(selectedUrl, proxy);
    } else {
      saveUrlToSession(selectedUrl);
      window.location.href = "/tabs";
    }
  } catch (error) {
    console.error(error);
    saveUrlToSession(selectedUrl);
    window.location.href = "/tabs";
  }

  return false;
}

function promptUserForLink(links) {
  const options = links.map((link, index) => `${index + 1}: ${link.name}`).join("\n");

  const choice = prompt(`Select a link by entering the corresponding number:\n${options}`);
  const selectedIndex = parseInt(choice, 10) - 1;

  if (Number.isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= links.length) {
    alert("Invalid selection. Please try again.");
    return null;
  }

  return links[selectedIndex].url;
}

function saveCustomApp(customApp) {
  let apps = getFromStorage("custom");

  if (!apps) {
    apps = {};
  } else {
    apps = JSON.parse(apps);
  }

  const key = `custom${Object.keys(apps).length + 1}`;
  apps[key] = customApp;

  setInStorage("custom", JSON.stringify(apps));
}

function closeSiteModal() {
  document.getElementById("site-modal")?.remove();
}

function openSiteModal({ title, hint, fields, submitLabel, onSubmit }) {
  closeSiteModal();

  const overlay = document.createElement("div");
  overlay.id = "site-modal";
  overlay.className = "site-modal";
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeSiteModal();
  });

  const panel = document.createElement("div");
  panel.className = "site-modal-panel";
  panel.innerHTML = `<h3>${homoglyph(title)}</h3>${hint ? `<p class="site-modal-hint">${homoglyph(hint)}</p>` : ""}`;

  const form = document.createElement("form");
  for (const field of fields) {
    const input =
      field.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
    input.name = field.name;
    input.placeholder = homoglyph(field.placeholder || "");
    input.required = Boolean(field.required);
    if (field.type && field.type !== "textarea") input.type = field.type;
    if (field.maxLength) input.maxLength = field.maxLength;
    form.appendChild(input);
  }

  const actions = document.createElement("div");
  actions.className = "site-modal-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = homoglyph("Cancel");
  cancel.addEventListener("click", closeSiteModal);
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = homoglyph(submitLabel || "Save");
  actions.append(cancel, submit);
  form.appendChild(actions);

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    onSubmit(data);
  });

  panel.appendChild(form);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  form.querySelector("input, textarea")?.focus();
}

function createCustomApp() {
  openSiteModal({
    title: isGamesPage ? "Add a custom game" : "Add a custom app",
    hint: "Saved in this browser only. Use a direct https link.",
    submitLabel: "Add",
    fields: [
      { name: "entryName", placeholder: "Title", required: true, maxLength: 80 },
      { name: "link", placeholder: "https://example.com/game", required: true, type: "url", maxLength: 500 },
      { name: "image", placeholder: "Cover image URL (optional)", type: "url", maxLength: 500 },
    ],
    onSubmit: data => {
      const customApp = {
        name: `[Custom] ${data.entryName.trim()}`,
        link: data.link.trim(),
        image: data.image?.trim() || "/assets/media/icons/custom.webp",
        custom: false,
      };
      saveCustomApp(customApp);
      const card = renderAppCard(customApp, 0, true);
      document.querySelector(".pinned")?.appendChild(card);
      closeSiteModal();
    },
  });
}

function getPinnedApps() {
  const pins = getFromStorage("pinned") || "";
  return pins ? pins.split(",").map(Number) : [];
}

function savePinnedApps(pins) {
  setInStorage("pinned", pins.join(","));
}

function togglePin(appIndex) {
  const pins = getPinnedApps();

  const pinIndex = pins.indexOf(appIndex);
  const isCurrentlyPinned = pinIndex !== -1;

  if (isCurrentlyPinned) {
    pins.splice(pinIndex, 1);
  } else {
    pins.push(appIndex);
  }

  savePinnedApps(pins);

  const card = document.querySelector(`.column[data-app-index="${appIndex}"]`);
  if (card) {
    const pinnedContainer = document.querySelector(".pinned");
    const nonPinnedContainer = document.querySelector(".apps");
    if (isCurrentlyPinned) {
      const unpinnedCards = Array.from(nonPinnedContainer.getElementsByClassName("column"));
      const cardName = card.getElementsByTagName("p")[0].textContent.toLowerCase();
      const insertBefore = unpinnedCards.find(c => c.getElementsByTagName("p")[0].textContent.toLowerCase() > cardName);
      nonPinnedContainer.insertBefore(card, insertBefore ?? null);
    } else {
      pinnedContainer.appendChild(card);
    }
  }
}

function isAppPinned(appIndex, pinnedList) {
  return pinnedList.includes(appIndex);
}

function createPinButton(appIndex) {
  const pinIcon = document.createElement("i");
  pinIcon.classList.add("fa", "fa-map-pin");
  pinIcon.ariaHidden = true;

  const button = document.createElement("button");
  button.className = "pin-btn";
  button.type = "button";
  button.appendChild(pinIcon);
  button.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    togglePin(appIndex);
  };
  button.title = "Pin";

  return button;
}

function makeCoverFallback(name = "") {
  const fallback = document.createElement("div");
  fallback.className = "cover-fallback";
  const letter = (name.replace(/^\W+/, "")[0] || "?").toUpperCase();
  fallback.textContent = letter;
  fallback.setAttribute("aria-hidden", "true");
  return fallback;
}

function extraGameTags(name = "") {
  const n = name.toLowerCase();
  const tags = [];
  if (/\b(2\s*player|two player|multiplayer|1v1|2v2|versus|\bvs\b|co-op|coop)\b/.test(n)) tags.push("2P");
  if (/(basket|soccer|football|baseball|tennis|golf|hockey|nfl|nba|fifa|bowl|boxing|mma|volley|cricket|sport)/.test(n)) tags.push("sports");
  if (/(race|racing|drift|moto|kart|drive|highway|traffic|car )/.test(n)) tags.push("racing");
  if (/(puzzle|2048|sudoku|match|block|tetris|wordle|solitaire|mahjong)/.test(n)) tags.push("puzzle");
  if (/\bio\b|agar|slither|hole\.io|paper\.io/.test(n)) tags.push("io");
  if (/(shoot|fps|gun|sniper|war |combat|battle|krunker|shell shock)/.test(n)) tags.push("shooter");
  if (/(idle|clicker|incremental)/.test(n)) tags.push("idle");
  if (/(platform|jump|vex|geometry dash|run 3|mario)/.test(n)) tags.push("platform");
  if (/(horror|scary|fnaf|granny|slender)/.test(n)) tags.push("horror");
  if (/(arcade|retro|pinball|pac-?man|\bsnake\b|breakout)/.test(n)) tags.push("arcade");
  return tags;
}

function renderAppCard(app, appIndex, isCustom = false) {
  const columnDiv = document.createElement("div");
  columnDiv.classList.add("column");

  const categories = isCustom
    ? "all"
    : [...new Set([...(app.categories || []).map(cat => String(cat).replace(/,/g, "").trim()), ...(isGamesPage ? extraGameTags(app.name) : [])])]
        .filter(Boolean)
        .join(" ");
  columnDiv.setAttribute("data-category", categories);
  columnDiv.setAttribute("data-app-index", appIndex);

  const link = document.createElement("a");
  link.href = "#";
  link.onclick = event => {
    event.preventDefault();
    handleAppClick(app);
  };

  const image = document.createElement("img");
  image.width = 145;
  image.height = 145;
  image.loading = "lazy";
  image.alt = "";

  let cover = image;
  if (app.image) {
    image.src = app.image;
    image.onerror = () => {
      image.onerror = null;
      const fallback = makeCoverFallback(app.name);
      if (image.parentNode) image.replaceWith(fallback);
      else cover = fallback;
    };
  } else {
    cover = makeCoverFallback(app.name);
  }

  const paragraph = document.createElement("p");
  paragraph.textContent = app.name;

  if (app.popular) {
    columnDiv.classList.add("is-popular");
    const tag = document.createElement("span");
    tag.className = "popular-tag";
    tag.textContent = "Popular";
    columnDiv.appendChild(tag);
  }

  if (app.error) {
    paragraph.style.color = "red";
    app.say = app.say || "This app is currently not working.";
  } else if (app.load) {
    paragraph.style.color = "yellow";
    app.say = app.say || "This app may experience excessive loading times.";
  } else if (app.partial) {
    paragraph.style.color = "yellow";
    app.say = app.say || "This app is currently experiencing some issues, it may not work for you.";
  }

  link.appendChild(cover);
  link.appendChild(paragraph);
  columnDiv.appendChild(link);

  if (!isCustom && !app.custom) {
    columnDiv.appendChild(createPinButton(appIndex));
  }

  return columnDiv;
}

function getJsonPath() {
  if (isGamesPage) return "/assets/json/games.min.json";
  if (isAppsPage) return "/assets/json/apps.min.json";
  return "/assets/json/apps.min.json";
}

function applyAppFlags(app) {
  if (app.categories?.includes("local") || app.categories?.includes("hosted") || app.link?.startsWith("/hosted/")) {
    app.local = true;
  }

  if (app.link && (app.link.includes("now.gg") || app.link.includes("nowgg.me"))) {
    if (app.partial === null || app.partial === undefined) {
      app.partial = true;
      app.say = "Now.gg is currently not working for some users.";
    }
  }

  if (app.link?.includes("nowgg.nl")) {
    if (app.error === null || app.error === undefined) {
      app.error = true;
      app.say = "NowGG.nl is currently down.";
    }
  }
}

// Replaced at build time with the per-build key. [0] is identity, so dev serves the plain
// dataset and the production payload arrives as an encoded string instead of an array.
const CATALOGUE_KEY = [0];

function decodeCatalogue(payload) {
  const binary = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index) ^ CATALOGUE_KEY[index % CATALOGUE_KEY.length];
  return JSON.parse(new TextDecoder().decode(bytes));
}

function loadAppsFromJson() {
  const jsonPath = getJsonPath();

  fetch(jsonPath)
    .then(response => response.json())
    .then(data => (typeof data === "string" ? decodeCatalogue(data) : data))
    .then(appsList => {
      const nonPinnedContainer = document.querySelector(".apps");
      const pinnedContainer = document.querySelector(".pinned");
      const pinnedList = getPinnedApps();
      const featuredContainer = document.querySelector(".featured");

      const specialCards = [];
      while (appsList[0]?.custom) specialCards.push(appsList.shift());
      appsList = appsList.filter(app => !app.comments);

      if (isGamesPage) {
        appsList.sort((a, b) => {
          const rank = popularityRank(a.name) - popularityRank(b.name);
          return rank !== 0 ? rank : a.name.localeCompare(b.name);
        });
      } else {
        appsList.sort((a, b) => {
          if (a.name.startsWith("[Custom]")) return -1;
          if (b.name.startsWith("[Custom]")) return 1;
          return a.name.localeCompare(b.name);
        });
      }

      const featured = isGamesPage ? appsList.filter(app => popularityRank(app.name) < 1000).slice(0, 14) : [];
      const featuredSet = new Set(featured);

      if (featuredContainer) {
        const heading = document.getElementById("popular-heading");
        if (heading) heading.style.display = featured.length ? "" : "none";
        featuredContainer.style.display = featured.length ? "" : "none";
      }

      appsList.unshift(...specialCards);

      let appIndex = 0;

      appsList.forEach(app => {
        applyAppFlags(app);
        if (featuredSet.has(app)) app.popular = true;

        const card = renderAppCard(app, appIndex);

        if (app.custom) {
          pinnedContainer.appendChild(card);
        } else if (featuredSet.has(app) && featuredContainer) {
          featuredContainer.appendChild(card);
        } else if (pinnedList != null && isAppPinned(appIndex, pinnedList)) {
          pinnedContainer.appendChild(card);
        } else {
          nonPinnedContainer.appendChild(card);
        }

        appIndex++;
      });

      loadCustomAppsInline();
    })
    .catch(error => {
      console.error("Error fetching app data:", error);
    });
}

function loadCustomAppsInline() {
  const storedApps = getFromStorage("custom");

  if (storedApps) {
    const apps = JSON.parse(storedApps);

    const pinnedContainer = document.querySelector(".pinned");
    Object.values(apps).forEach(app => {
      const card = renderAppCard(app, 0, true);
      pinnedContainer.appendChild(card);
    });
  }
}

function applyFilters() {
  const searchTerm = (document.getElementById("search")?.value ?? "").toLowerCase();
  const selectedCategories = Array.from(document.querySelectorAll("#category option:checked")).map(option => option.value);

  Array.from(document.getElementsByClassName("column")).forEach(card => {
    const appName = card.getElementsByTagName("p")[0].textContent.toLowerCase();
    const categories = card.getAttribute("data-category").split(" ");

    const matchesSearch = !searchTerm || appName.includes(searchTerm);
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes("all") ||
      selectedCategories.some(cat => categories.includes(cat));

    card.style.display = matchesSearch && matchesCategory ? "block" : "none";
  });
}

function filterByCategory() {
  applyFilters();
}

function filterBySearchTerm() {
  applyFilters();
}

window.category = filterByCategory;
window.bar = filterBySearchTerm;

document.addEventListener("DOMContentLoaded", () => {
  loadAppsFromJson();
});
