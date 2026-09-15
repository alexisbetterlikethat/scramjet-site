let inFrame;

try {
  inFrame = window !== top;
} catch (e) {
  inFrame = true;
}
if (!localStorage.getItem("ab")) localStorage.setItem("ab", "false");
if (localStorage.getItem("proxy-compat") !== "2") {
  localStorage.setItem("proxy-compat", "2");
  localStorage.setItem("ab", "false");
}
if (!inFrame && !navigator.userAgent.includes("Firefox") && localStorage.getItem("ab") === "true") {
  const popup = open("about:blank", "_blank");
  setTimeout(() => {
    if (!popup || popup.closed) {
      alert("Please allow popups for this site. Doing so will allow us to open the site in a about:blank tab and preventing this site from showing up in your history. You can turn this off in the site settings.");
    } else {
      const doc = popup.document;
      const iframe = doc.createElement("iframe");
      const style = iframe.style;
      const link = doc.createElement("link");

      const name = localStorage.getItem("name") || "My Drive - Google Drive";
      const icon = localStorage.getItem("icon") || "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png";

      doc.title = name;
      link.rel = "icon";
      link.href = icon;

      iframe.src = location.href;
      style.position = "fixed";
      style.top = style.bottom = style.left = style.right = 0;
      style.border = style.outline = "none";
      style.width = style.height = "100%";

      doc.head.appendChild(link);
      doc.body.appendChild(iframe);

      const pLink = localStorage.getItem(encodeURI("pLink")) || getRandomUrl();
      location.replace(pLink);

      const script = doc.createElement("script");
      script.textContent = `
      window.onbeforeunload = function (event) {
        const confirmationMessage = 'Leave Site?';
        (event || window.event).returnValue = confirmationMessage;
        return confirmationMessage;
      };
    `;
      doc.head.appendChild(script);
    }
  }, 2000);
}

// Splash texts
const SplashT = [
  "Search the web, quietly.",
  "Games, apps, and a fast proxy.",
  "Scramjet is ready when you are.",
  "Cloak, panic key, and themes live in Settings.",
];

let SplashI = Math.floor(Math.random() * SplashT.length);
const SplashE = document.getElementById("splash");

if (SplashE) {
  SplashE.innerText = SplashT[SplashI];
  SplashE.addEventListener("click", US);
}

function US() {
  if (!SplashE) return;
  SplashI = (SplashI + 1) % SplashT.length;
  SplashE.innerText = SplashT[SplashI];
  SplashE.style.animation = "none";
  void SplashE.offsetWidth;
  SplashE.style.animation = "";
}

// Random URL
function getRandomUrl() {
  const randomUrls = [
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
  return randomUrls[randRange(0, randomUrls.length)];
}

function randRange(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

const QUICK_APPS = [
  { name: "YouTube", url: "https://youtube.com" },
  { name: "TikTok", url: "https://tiktok.com" },
  { name: "Reddit", url: "https://reddit.com" },
  { name: "X", url: "https://x.com" },
  { name: "Duck.ai", url: "https://duck.ai" },
  { name: "Games", href: getPageRoute("games") },
];

const quickApps = document.getElementById("quick-apps");
if (quickApps) {
  for (const app of QUICK_APPS) {
    const button = document.createElement(app.href ? "a" : "button");
    button.className = "quick-app";
    button.textContent = homoglyph(app.name);
    if (app.href) {
      button.href = resolveGamesUrl(app.href);
    } else {
      button.type = "button";
      button.addEventListener("click", () => {
        if (typeof go === "function") go(app.url);
      });
    }
    quickApps.appendChild(button);
  }
}
