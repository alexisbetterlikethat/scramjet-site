const isGamesPage = window.location.pathname === "/games";
const isAppsPage = window.location.pathname === "/apps";

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

function createSpanElements(text) {
  return text.split("").map(char => {
    const span = document.createElement("span");
    span.textContent = char;
    return span;
  });
}

function saveUrlToSession(url) {
  sessionStorage.setItem("GoUrl", url);
}

function handleAppClick(app) {
  if (app.say) {
    alert(app.say);
  }

  let selectedUrl = app.link;
  if (app.links && app.links.length > 1) {
    selectedUrl = promptUserForLink(app.links);
    if (!selectedUrl) return false;
  }

  const proxy = app.proxy;

  // isInTabMode is declared in main.js
  if (app.local) {
    saveUrlToSession(selectedUrl);
    window.location.href = isInTabMode ? selectedUrl : "tabs";
  } else if (app.local2) {
    saveUrlToSession(selectedUrl);
    window.location.href = selectedUrl;
  } else if (app.blank) {
    blank(selectedUrl, proxy);
  } else if (app.now) {
    blank(selectedUrl, proxy);
    if (isInTabMode) window.location.href = selectedUrl;
  } else if (app.custom) {
    createCustomApp();
  } else if (app.comments) {
    openComments();
  } else {
    go(selectedUrl, proxy);
    if (isInTabMode) blank(selectedUrl, proxy);
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
      { name: "title", placeholder: "Title", required: true, maxLength: 80 },
      { name: "link", placeholder: "https://example.com/game", required: true, type: "url", maxLength: 500 },
      { name: "image", placeholder: "Cover image URL (optional)", type: "url", maxLength: 500 },
    ],
    onSubmit: data => {
      const customApp = {
        name: `[Custom] ${data.title.trim()}`,
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

function getComments() {
  try {
    return JSON.parse(getFromStorage("comments") || "[]");
  } catch {
    return [];
  }
}

function saveComments(comments) {
  setInStorage("comments", JSON.stringify(comments.slice(0, 100)));
}

function openComments() {
  closeSiteModal();

  const overlay = document.createElement("div");
  overlay.id = "site-modal";
  overlay.className = "site-modal";
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeSiteModal();
  });

  const panel = document.createElement("div");
  panel.className = "site-modal-panel comments-panel";
  panel.innerHTML = `<h3>Comments</h3><p class="site-modal-hint">Local notes on this device. Nothing is sent anywhere.</p>`;

  const list = document.createElement("div");
  list.className = "comment-list";

  const renderList = () => {
    const comments = getComments();
    list.replaceChildren();
    if (!comments.length) {
      const empty = document.createElement("p");
      empty.className = "site-modal-hint";
      empty.textContent = "No comments yet.";
      list.appendChild(empty);
      return;
    }
    for (const [index, comment] of comments.entries()) {
      const item = document.createElement("article");
      item.className = "comment-item";
      const meta = document.createElement("header");
      const name = document.createElement("strong");
      name.textContent = comment.name;
      const time = document.createElement("time");
      time.textContent = new Date(comment.at).toLocaleString();
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => {
        const next = getComments();
        next.splice(index, 1);
        saveComments(next);
        renderList();
      });
      meta.append(name, time, remove);
      const body = document.createElement("p");
      body.textContent = comment.text;
      item.append(meta, body);
      list.appendChild(item);
    }
  };

  const form = document.createElement("form");
  form.innerHTML = `
    <input name="name" maxlength="40" placeholder="Name" required />
    <textarea name="text" maxlength="500" placeholder="Comment" required></textarea>
    <div class="site-modal-actions">
      <button type="button" class="comment-close">Close</button>
      <button type="submit">Post</button>
    </div>
  `;
  form.querySelector(".comment-close").addEventListener("click", closeSiteModal);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const comments = getComments();
    comments.unshift({
      name: data.name.trim(),
      text: data.text.trim(),
      at: Date.now(),
    });
    saveComments(comments);
    form.reset();
    renderList();
  });

  renderList();
  panel.append(list, form);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
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

function renderAppCard(app, appIndex, isCustom = false) {
  const columnDiv = document.createElement("div");
  columnDiv.classList.add("column");

  const categories = isCustom ? "all" : (app.categories || []).join(" ");
  columnDiv.setAttribute("data-category", categories);
  columnDiv.setAttribute("data-app-index", appIndex);

  const link = document.createElement("a");
  link.onclick = () => handleAppClick(app);

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
  for (const span of createSpanElements(app.name)) {
    paragraph.appendChild(span);
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

  if (appIndex !== 0 && appIndex !== 1) {
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

      const appsContainer = document.getElementById("apps-container");
      if (appsContainer) {
        appsContainer.appendChild(pinnedContainer);
        appsContainer.appendChild(nonPinnedContainer);
      }

      const specialCards = appsList.splice(0, 2);

      appsList.sort((a, b) => {
        if (a.name.startsWith("[Custom]")) return -1;
        if (b.name.startsWith("[Custom]")) return 1;
        return a.name.localeCompare(b.name);
      });

      appsList.unshift(...specialCards);

      let appIndex = 0;

      appsList.forEach(app => {
        applyAppFlags(app);

        const card = renderAppCard(app, appIndex);

        if (appIndex === 0 || appIndex === 1) {
          pinnedContainer.appendChild(card);
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
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(cat => categories.includes(cat));

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
