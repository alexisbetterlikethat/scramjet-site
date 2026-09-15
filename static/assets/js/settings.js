document.addEventListener("DOMContentLoaded", async () => {
  const adTypeElement = document.getElementById("adType");
  if (adTypeElement) {
    adTypeElement.addEventListener("change", function () {
      localStorage.setItem("ads", this.value === "default" ? "on" : this.value);
    });
    const storedAd = localStorage.getItem("ads");
    adTypeElement.value = storedAd === "popups" || storedAd === "off" ? storedAd : "default";
  }

  setEngine("sj");

  const transportElement = document.getElementById("transport-dropdown");
  if (transportElement) {
    const stored = localStorage.getItem("transport");
    transportElement.value = stored === "relay" || stored === "epoxy" ? "relay" : "standard";
    transportElement.addEventListener("change", function () {
      localStorage.setItem("transport", this.value);
      window.location.reload();
    });
  }

  const wispInput = document.getElementById("wisp-input");
  const wispSaveBtn = document.getElementById("wisp-save-btn");
  if (wispInput && wispSaveBtn) {
    wispInput.placeholder = getWispUrl();
    wispInput.value = getTunnelUrl();
    wispSaveBtn.addEventListener("click", () => {
      const val = wispInput.value.trim();
      if (val === "") {
        setTunnelUrl("");
      } else if (/^wss?:\/\//i.test(val)) {
        setTunnelUrl(val);
      } else {
        alert("Enter a valid tunnel URL starting with ws:// or wss://");
        return;
      }
      window.location.reload();
    });
  }

  const eventKeyInput = document.getElementById("eventKeyInput");
  const linkInput = document.getElementById("linkInput");

  let eventKey = JSON.parse(localStorage.getItem("eventKey")) || ["`"];
  const eventKeyRaw = localStorage.getItem("eventKeyRaw") || "`";
  let pLink = localStorage.getItem("pLink") || "https://classroom.google.com/";

  eventKeyInput.value = eventKeyRaw;
  linkInput.value = pLink;

  eventKeyInput.addEventListener("input", () => {
    eventKey = eventKeyInput.value.split(",");
  });
  linkInput.addEventListener("input", () => {
    pLink = linkInput.value;
  });

  const cloakDropdown = document.getElementById("cloak-dropdown");

  const sortedOptions = Array.from(cloakDropdown.getElementsByTagName("option")).sort((a, b) => a.textContent.localeCompare(b.textContent));
  while (cloakDropdown.firstChild) cloakDropdown.removeChild(cloakDropdown.firstChild);
  for (const option of sortedOptions) cloakDropdown.appendChild(option);

  cloakDropdown.value = localStorage.getItem("selectedOption") || "Classroom";
  cloakDropdown.addEventListener("change", () => handleDropdownChange(cloakDropdown));

  document.getElementById("cloak-save-btn").addEventListener("click", () => {
    saveCustomCloak();
    redirectToMainDomain();
  });
  document.getElementById("cloak-reset-btn").addEventListener("click", () => {
    resetCustomCloak();
    redirectToMainDomain();
  });

  document.getElementById("custom-cloak-name").value = localStorage.getItem("CustomName") || "";
  document.getElementById("custom-cloak-icon").value = localStorage.getItem("CustomIcon") || "";

  if (localStorage.getItem("ab") === "true") {
    document.getElementById("ab-settings-switch").checked = true;
  }

  // Themes
  const themeDropdown = document.getElementById("theme-dropdown");
  themeDropdown.value = localStorage.getItem("theme") || "d";
  themeDropdown.addEventListener("change", function () {
    themeChange(this);
  });

  // Backgrounds
  const bgDropdown = document.getElementById("background-dropdown");
  const bgCustomRow = document.getElementById("background-custom-row");
  const bgInput = document.getElementById("background-input");

  const savedBg = localStorage.getItem("backgroundImage");
  const savedBgMode = localStorage.getItem("backgroundMode") || "default";
  bgDropdown.value = savedBgMode;
  if (savedBgMode === "custom") {
    bgCustomRow.style.display = "";
    bgInput.value = savedBg || "";
  }

  bgDropdown.addEventListener("change", function () {
    const mode = this.value;
    localStorage.setItem("backgroundMode", mode);
    if (mode === "default") {
      bgCustomRow.style.display = "none";
      localStorage.removeItem("backgroundImage");
      document.body.style.backgroundImage = "";
      window.location.reload();
    } else if (mode === "none") {
      bgCustomRow.style.display = "none";
      localStorage.setItem("backgroundImage", "none");
      document.body.style.backgroundImage = "none";
    } else if (mode === "custom") {
      bgCustomRow.style.display = "";
    }
  });

  document.getElementById("save-button").addEventListener("click", () => {
    const url = bgInput.value.trim();
    if (url) {
      localStorage.setItem("backgroundImage", url);
      localStorage.setItem("backgroundMode", "custom");
      document.body.style.backgroundImage = `url('${url}')`;
    }
  });

  // Background Particles
  const particlesDropdown = document.getElementById("particles-dropdown");
  particlesDropdown.value = localStorage.getItem("particles") === "true" ? "on" : "off";
  particlesDropdown.addEventListener("change", function () {
    localStorage.setItem("particles", this.value === "on" ? "true" : "false");
  });

  // Cursor Effects
  const pointerDropdown = document.getElementById("pointer-dropdown");
  pointerDropdown.value = localStorage.getItem("pointer") || "default";
  pointerDropdown.addEventListener("change", function () {
    const val = this.value;
    if (val === "default") {
      localStorage.removeItem("pointer");
    } else {
      localStorage.setItem("pointer", val);
    }
    window.location.reload();
  });

  document.getElementById("engine").addEventListener("change", function () {
    changeEngine(this);
  });
  document.getElementById("engine-save-btn").addEventListener("click", saveCustomEngine);

  const savedEngineName = localStorage.getItem("enginename");
  if (savedEngineName) document.getElementById("engine").value = savedEngineName;

  const focusSwitch = document.getElementById("focus-cloak-switch");
  if (focusSwitch) {
    focusSwitch.checked = localStorage.getItem("focusCloak") === "true";
    focusSwitch.addEventListener("change", () => {
      localStorage.setItem("focusCloak", focusSwitch.checked ? "true" : "false");
    });
  }

  const antiCloseSwitch = document.getElementById("anti-close-switch");
  if (antiCloseSwitch) {
    antiCloseSwitch.checked = localStorage.getItem("antiClose") === "true";
    antiCloseSwitch.addEventListener("change", () => {
      localStorage.setItem("antiClose", antiCloseSwitch.checked ? "true" : "false");
    });
  }

  await initExtensionSettings();
  homoglyphDom(document.querySelector(".settings-container"));
  document.querySelectorAll(".settings-card").forEach((card, index) => {
    card.style.setProperty("--card-i", String(index));
  });
});

async function initExtensionSettings() {
  const list = document.getElementById("extension-list");
  if (!list || !window.loadBuiltInExtensions) return;

  const builtIn = await window.loadBuiltInExtensions();
  const enabled = new Set(window.getEnabledExtensionIds());

  const render = () => {
    list.replaceChildren();
    for (const ext of builtIn) {
      list.appendChild(makeExtRow(ext.name, ext.description, enabled.has(ext.id), () => {
        if (enabled.has(ext.id)) enabled.delete(ext.id);
        else enabled.add(ext.id);
        window.setEnabledExtensionIds([...enabled]);
        render();
      }));
    }
    window.getCustomExtensions().forEach((ext, index) => {
      list.appendChild(makeExtRow(`${ext.name} (custom)`, ext.site || "*", ext.enabled !== false, () => {
        const next = window.getCustomExtensions();
        next[index].enabled = next[index].enabled === false;
        window.setCustomExtensions(next);
        render();
      }, () => {
        const next = window.getCustomExtensions();
        next.splice(index, 1);
        window.setCustomExtensions(next);
        render();
      }));
    });
  };

  document.getElementById("ext-add-btn")?.addEventListener("click", () => {
    const name = document.getElementById("ext-name").value.trim();
    const site = document.getElementById("ext-site").value.trim() || "*";
    const code = document.getElementById("ext-code").value.trim();
    if (!name || !code) {
      alert("Need a name and some JavaScript.");
      return;
    }
    const next = window.getCustomExtensions();
    next.push({ name, site, code, enabled: true });
    window.setCustomExtensions(next);
    document.getElementById("ext-name").value = "";
    document.getElementById("ext-site").value = "";
    document.getElementById("ext-code").value = "";
    render();
  });

  render();
}

function makeExtRow(title, hint, on, toggle, remove) {
  const row = document.createElement("div");
  row.className = "ext-row";
  const copy = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = homoglyph(title);
  const desc = document.createElement("p");
  desc.textContent = homoglyph(hint);
  copy.append(name, desc);
  const actions = document.createElement("div");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "key-button";
  button.textContent = homoglyph(on ? "On" : "Off");
  button.addEventListener("click", toggle);
  actions.appendChild(button);
  if (remove) {
    const del = document.createElement("button");
    del.type = "button";
    del.className = "key-button";
    del.textContent = homoglyph("Delete");
    del.addEventListener("click", remove);
    actions.appendChild(del);
  }
  row.append(copy, actions);
  return row;
}

function saveEventKey() {
  const eventKeyInput = document.getElementById("eventKeyInput");
  const linkInput = document.getElementById("linkInput");
  const eventKey = eventKeyInput.value.split(",");
  const eventKeyRaw = eventKeyInput.value;
  const pLink = linkInput.value;
  localStorage.setItem("eventKey", JSON.stringify(eventKey));
  localStorage.setItem("eventKeyRaw", eventKeyRaw);
  localStorage.setItem("pLink", pLink);
  // biome-ignore lint: idk
  window.location = window.location;
}

const cloakOptions = {
  Google: { name: "Google", icon: "/assets/media/favicon/google.png" },
  "Savvas Realize": { name: "Savvas Realize", icon: "/assets/media/favicon/savvas-realize.png" },
  SmartPass: { name: "SmartPass", icon: "/assets/media/favicon/smartpass.png" },
  "World Book Online - Super Home": { name: "Super Home Page", icon: "/assets/media/favicon/wbo.ico" },
  "World Book Online - Student": { name: "WBO Student | Home Page", icon: "/assets/media/favicon/wbo.ico" },
  "World Book Online - Timelines": { name: "Timelines - Home Page", icon: "/assets/media/favicon/wbo.ico" },
  Naviance: { name: "Naviance Student", icon: "/assets/media/favicon/naviance.png" },
  "PBS Learning Media": { name: "PBS LearningMedia | Teaching Resources For Students And Teachers", icon: "/assets/media/favicon/pbslearningmedia.ico" },
  "PBS Learning Media Student Home": { name: "Student Homepage | PBS LearningMedia", icon: "/assets/media/favicon/pbslearningmedia.ico" },
  Drive: { name: "My Drive - Google Drive", icon: "/assets/media/favicon/drive.png" },
  Classroom: { name: "Home", icon: "/assets/media/favicon/classroom.png" },
  Schoology: { name: "Home | Schoology", icon: "/assets/media/favicon/schoology.png" },
  Gmail: { name: "Gmail", icon: "/assets/media/favicon/gmail.png" },
  Clever: { name: "Clever | Portal", icon: "/assets/media/favicon/clever.png" },
  Khan: { name: "Dashboard | Khan Academy", icon: "/assets/media/favicon/khan.png" },
  Dictionary: { name: "Dictionary.com | Meanings & Definitions of English Words", icon: "/assets/media/favicon/dictionary.png" },
  Thesaurus: { name: "Synonyms and Antonyms of Words | Thesaurus.com", icon: "/assets/media/favicon/thesaurus.png" },
  Campus: { name: "Infinite Campus", icon: "/assets/media/favicon/campus.png" },
  IXL: { name: "IXL | Dashboard", icon: "/assets/media/favicon/ixl.png" },
  Canvas: { name: "Dashboard", icon: "/assets/media/favicon/canvas.png" },
  CodeHS: { name: "Sandbox | CodeHS", icon: "/assets/media/favicon/codehs.png" },
  LinkIt: { name: "Test Taker", icon: "/assets/media/favicon/linkit.ico" },
  Edpuzzle: { name: "Edpuzzle", icon: "/assets/media/favicon/edpuzzle.png" },
  "i-Ready Math": { name: "Math To Do, i-Ready", icon: "/assets/media/favicon/i-ready.ico" },
  "i-Ready Reading": { name: "Reading To Do, i-Ready", icon: "/assets/media/favicon/i-ready.ico" },
  "ClassLink Login": { name: "Login", icon: "/assets/media/favicon/classlink-login.png" },
  "Google Meet": { name: "Google Meet", icon: "/assets/media/favicon/google-meet.png" },
  "Google Docs": { name: "Google Docs", icon: "/assets/media/favicon/google-docs.ico" },
  "Google Slides": { name: "Google Slides", icon: "/assets/media/favicon/google-slides.ico" },
  Wikipedia: { name: "Wikipedia", icon: "/assets/media/favicon/wikipedia.png" },
  Britannica: { name: "Encyclopedia Britannica | Britannica", icon: "/assets/media/favicon/britannica.png" },
  Ducksters: { name: "Ducksters", icon: "/assets/media/favicon/ducksters.png" },
  Minga: { name: "Minga – Creating Amazing Schools", icon: "/assets/media/favicon/minga.png" },
  "i-Ready Learning Games": { name: "Learning Games, i-Ready", icon: "/assets/media/favicon/i-ready.ico" },
  "NoRedInk Home": { name: "Student Home | NoRedInk", icon: "/assets/media/favicon/noredink.png" },
  Desmos: { name: "Desmos | Graphing Calculator", icon: "/assets/media/favicon/desmos.ico" },
  "Newsela Binder": { name: "Newsela | Binder", icon: "/assets/media/favicon/newsela.png" },
  "Newsela Assignments": { name: "Newsela | Assignments", icon: "/assets/media/favicon/newsela.png" },
  "Newsela Home": { name: "Newsela | Instructional Content Platform", icon: "/assets/media/favicon/newsela.png" },
  "PowerSchool Sign In": { name: "Student and Parent Sign In", icon: "/assets/media/favicon/powerschool.png" },
  "PowerSchool Grades and Attendance": { name: "Grades and Attendance", icon: "/assets/media/favicon/powerschool.png" },
  "PowerSchool Teacher Comments": { name: "Teacher Comments", icon: "/assets/media/favicon/powerschool.png" },
  "PowerSchool Standards Grades": { name: "Standards Grades", icon: "/assets/media/favicon/powerschool.png" },
  "PowerSchool Attendance": { name: "Attendance", icon: "/assets/media/favicon/powerschool.png" },
  Nearpod: { name: "Nearpod", icon: "/assets/media/favicon/nearpod.png" },
  StudentVUE: { name: "StudentVUE", icon: "/assets/media/favicon/studentvue.ico" },
  "Quizlet Home": { name: "Flashcards, learning tools and textbook solutions | Quizlet", icon: "/assets/media/favicon/quizlet.webp" },
  "Google Forms Locked Mode": { name: "Start your quiz", icon: "/assets/media/favicon/googleforms.png" },
  DeltaMath: { name: "DeltaMath", icon: "/assets/media/favicon/deltamath.png" },
  Kami: { name: "Kami", icon: "/assets/media/favicon/kami.png" },
  "GoGuardian Admin Restricted": { name: "Restricted", icon: "/assets/media/favicon/goguardian-lock.png" },
  "GoGuardian Teacher Block": { name: "Uh oh!", icon: "/assets/media/favicon/goguardian.png" },
  "World History Encyclopedia": { name: "World History Encyclopedia", icon: "/assets/media/favicon/worldhistoryencyclopedia.png" },
  "Big Ideas Math Assignment Player": { name: "Assignment Player", icon: "/assets/media/favicon/bim.ico" },
  "Big Ideas Math": { name: "Big Ideas Math", icon: "/assets/media/favicon/bim.ico" },
};

function handleDropdownChange(selectElement) {
  const selectedValue = selectElement.value;
  const preset = cloakOptions[selectedValue];

  localStorage.removeItem("CustomName");
  localStorage.removeItem("CustomIcon");
  localStorage.setItem("selectedOption", selectedValue);

  if (preset) {
    localStorage.setItem("name", preset.name);
    localStorage.setItem("icon", preset.icon);
    document.getElementById("t").textContent = preset.name;
    document.getElementById("tab-favicon").setAttribute("href", preset.icon);
  }

  redirectToMainDomain();
}

function saveCustomCloak() {
  const nameVal = document.getElementById("custom-cloak-name").value.trim();
  const iconVal = document.getElementById("custom-cloak-icon").value.trim();
  if (nameVal) {
    localStorage.setItem("CustomName", nameVal);
    localStorage.setItem("name", nameVal);
  }
  if (iconVal) {
    localStorage.setItem("CustomIcon", iconVal);
    localStorage.setItem("icon", iconVal);
  }
}

function resetCustomCloak() {
  localStorage.removeItem("CustomName");
  localStorage.removeItem("CustomIcon");
  document.getElementById("custom-cloak-name").value = "";
  document.getElementById("custom-cloak-icon").value = "";
}

function redirectToMainDomain() {
  const target = window.location.origin + window.location.pathname;
  if (window !== top) {
    try {
      top.location.href = target;
    } catch {
      try {
        parent.location.href = target;
      } catch {
        window.location.href = target;
      }
    }
  } else {
    window.location.href = target;
  }
}

function themeChange(selectElement) {
  const value = selectElement.value;
  if (value === "d") {
    localStorage.removeItem("theme");
  } else {
    localStorage.setItem("theme", value);
  }
  window.location.reload();
}

function AB() {
  let inFrame;
  try {
    inFrame = window !== top;
  } catch {
    inFrame = true;
  }

  if (inFrame) {
    alert("Please open the settings page directly (not inside a frame) to use the AB popup.");
    return;
  }
  if (navigator.userAgent.includes("Firefox")) {
    alert("AB cloak is not supported in Firefox.");
    return;
  }

  const popup = open("about:blank", "_blank");
  if (!popup || popup.closed) {
    alert("Window blocked. Please allow popups for this site.");
    return;
  }

  const name = localStorage.getItem("name") || "My Drive - Google Drive";
  const icon = localStorage.getItem("icon") || "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png";
  const panicLink = localStorage.getItem("pLink") || getRandomURL();

  const doc = popup.document;
  const iframe = doc.createElement("iframe");
  const link = doc.createElement("link");
  const script = doc.createElement("script");

  doc.title = name;
  link.rel = "icon";
  link.href = icon;

  iframe.src = location.href;
  const style = iframe.style;
  style.position = "fixed";
  style.top = style.bottom = style.left = style.right = 0;
  style.border = style.outline = "none";
  style.width = style.height = "100%";

  script.textContent = `
    window.onbeforeunload = function (event) {
      const message = 'Leave Site?';
      (event || window.event).returnValue = message;
      return message;
    };
  `;

  doc.head.appendChild(link);
  doc.head.appendChild(script);
  doc.body.appendChild(iframe);

  location.replace(panicLink);
}

function toggleAB() {
  const ab = localStorage.getItem("ab");
  localStorage.setItem("ab", ab === "true" ? "false" : "true");
}

function changeEngine(dropdown) {
  const engineUrls = {
    Brave: "https://search.brave.com/search?q=",
    Google: "https://www.google.com/search?q=",
    Bing: "https://www.bing.com/search?q=",
    Qwant: "https://www.qwant.com/?q=",
    Startpage: "https://www.startpage.com/search?q=",
    SearchEncrypt: "https://www.searchencrypt.com/search/?q=",
    Ecosia: "https://www.ecosia.org/search?q=",
  };
  const selected = dropdown.value;
  localStorage.setItem("engine", engineUrls[selected]);
  localStorage.setItem("enginename", selected);
}

function saveCustomEngine() {
  const customEngine = document.getElementById("engine-form").value.trim();
  if (customEngine) {
    localStorage.setItem("engine", customEngine);
    localStorage.setItem("enginename", "Custom");
  } else {
    alert("Please enter a custom search engine value.");
  }
}

function exportSaveData() {
  const cookies = Object.fromEntries(
    document.cookie
      .split("; ")
      .filter(Boolean)
      .map(c => c.split("=")),
  );
  const localStorageData = Object.fromEntries(
    Object.keys(localStorage)
      .filter(k => Object.hasOwn(localStorage, k))
      .map(k => [k, localStorage.getItem(k)]),
  );
  const blob = new Blob([JSON.stringify({ cookies, localStorage: localStorageData }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "save_data.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importSaveData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.cookies) {
          Object.entries(data.cookies).forEach(([key, value]) => {
            // biome-ignore lint/suspicious/noDocumentCookie: legacy cookie restore; CookieStore API lacks broad enough support for this use case
            document.cookie = `${key}=${value}; path=/`;
          });
        }
        if (data.localStorage) {
          Object.entries(data.localStorage).forEach(([key, value]) => {
            localStorage.setItem(key, value);
          });
          if (typeof window.resolveEngineChoice === "function") {
            window.resolveEngineChoice();
          }
        }
        alert("Save data imported.");
      } catch (error) {
        console.error("Error parsing JSON file:", error);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function getRandomURL() {
  const urls = [
    "https://kahoot.it",
    "https://classroom.google.com",
    "https://drive.google.com",
    "https://google.com",
    "https://docs.google.com",
    "https://slides.google.com",
    "https://www.nasa.gov",
    "https://blooket.com",
    "https://clever.com",
    "https://edpuzzle.com",
    "https://khanacademy.org",
    "https://wikipedia.org",
    "https://dictionary.com",
  ];
  return urls[Math.floor(Math.random() * urls.length)];
}
