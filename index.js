import "dotenv/config";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import chalk from "chalk";
import cookieParser from "cookie-parser";
import express from "express";
import basicAuth from "express-basic-auth";
import rateLimit from "express-rate-limit";
import mime from "mime";
import config from "./config.js";
import { injectEduSeo } from "./edu-seo-snippet.js";
import { isVulgar, listChatModels, openRouterKey, sanitizeMessages, SYSTEM_PROMPT } from "./openrouter.js";
import { clientBootstrap, isFramedPath, isProxyPath, resolveRuntime } from "./runtime.js";

console.log(chalk.yellow("Starting server..."));

const require = createRequire(import.meta.url);
const __dirname = process.cwd();

const DIST_DIR = path.join(__dirname, "dist");
const STATIC_DIR = path.join(__dirname, "static");

const VENDOR_MAP_PATH = path.join(DIST_DIR, ".runtime", "vendor-map.cjs");
const vendorMap = existsSync(VENDOR_MAP_PATH) ? require(VENDOR_MAP_PATH) : null;

const SERVE_DIR = vendorMap ? DIST_DIR : STATIC_DIR;
const runtime = resolveRuntime(vendorMap);

console.log(chalk.blue(`Serving from ${path.relative(__dirname, SERVE_DIR)}/`));
if (vendorMap) {
  console.log(
    chalk.blue(
      `Build ${vendorMap.build} | scope ${runtime.paths.uv} | scramjet ${runtime.paths.scramjet} | eggs ${runtime.paths.eggs} | wisp ${runtime.paths.wisp}`,
    ),
  );
} else if (existsSync(DIST_DIR)) {
  console.log(chalk.yellow("dist/ exists but has no .runtime/vendor-map.cjs, run `pnpm build`. Falling back to static/."));
}

if (config.requireBuild && !vendorMap) {
  console.log(chalk.red("WARNING: No production build detected. Run `pnpm build` before deploying."));
}

const server = http.createServer();
const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 8080;

wisp.options.allow_loopback_ips = true;
wisp.options.allow_private_ips = true;

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
});

const ghGamesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
});

const proxyLimiter = rateLimit({
  ...config.proxyRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
});

if (config.challenge !== false) {
  console.log(chalk.green("Password protection is enabled."));
  app.use(basicAuth({ users: config.users, challenge: true }));
}

const ghGamesBases = {
  "/gh-games/1/": "https://raw.githubusercontent.com/qrs/x/fixy/",
  "/gh-games/2/": "https://raw.githubusercontent.com/3v1/V5-Assets/main/",
  "/gh-games/3/": "https://raw.githubusercontent.com/3v1/V5-Retro/master/",
  "/gh-games/4/": "https://raw.githubusercontent.com/xbubbo/V6-Assets/main/",
};
const noMimeExts = new Set([".unityweb"]);

if (!runtime.disableGamesOnMainHost) {
app.get("/gh-games/:path(*)", ghGamesLimiter, async (req, res, next) => {
  try {
    const reqPath = "/gh-games/" + req.params.path;
    let reqTarget;
    for (const [prefix, baseUrl] of Object.entries(ghGamesBases)) {
      if (reqPath.startsWith(prefix)) {
        reqTarget = baseUrl + reqPath.slice(prefix.length);
        break;
      }
    }
    if (!reqTarget) return next();

    const upstreamHeaders = {};
    if (req.headers["if-none-match"]) {
      upstreamHeaders["If-None-Match"] = req.headers["if-none-match"];
    }

    const asset = await fetch(reqTarget, { headers: upstreamHeaders });

    if (asset.status === 304) return res.sendStatus(304);
    if (!asset.ok) return next();

    const data = Buffer.from(await asset.arrayBuffer());
    const ext = path.extname(reqTarget);
    const contentType = noMimeExts.has(ext) ? "application/octet-stream" : mime.getType(ext);

    const etag = asset.headers.get("etag");
    const lastModified = asset.headers.get("last-modified");

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(etag && { ETag: etag }),
      ...(lastModified && { "Last-Modified": lastModified }),
    });
    res.end(data);
  } catch (error) {
    console.error("Error fetching asset:", error);
    res.status(500).type("text/html").send("Error fetching the asset");
  }
});
}

app.use(cookieParser());

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

app.get("/api/y/models", generalLimiter, async (_req, res) => {
  try {
    res.json({ models: await listChatModels() });
  } catch {
    res.status(502).json({ error: "Could not load models." });
  }
});

app.post("/api/y/chat", chatLimiter, express.json({ limit: "3mb" }), async (req, res) => {
  const key = openRouterKey();
  if (!key) return res.status(503).json({ error: "Chat is not available right now." });

  try {
    const models = await listChatModels();
    const chosen = models.find(model => model.id === req.body?.model) || models[0];
    if (!chosen) return res.status(502).json({ error: "No chat models are available." });

    const messages = sanitizeMessages(req.body?.messages, chosen.images);
    if (!messages.some(msg => msg.role === "user")) {
      return res.status(400).json({ error: "Write a message first." });
    }

    const refuse = "I can't help with that wording. Ask the homework or general question without vulgar or sexual language and I'll help.";
    const payload = isVulgar(messages)
      ? null
      : {
          model: chosen.id,
          stream: true,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        };

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    if (!payload) {
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: refuse } }] })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://overflowispeak.lol",
        "X-Title": "Scramjet",
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok || !upstream.body) {
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "The model did not answer. Try another one." } }] })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch {
    if (res.headersSent) return res.end();
    res.status(502).json({ error: "Could not reach the model." });
  }
});

app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Download-Options", "noopen");
  // Camera/mic must stay available on this origin: proxied pages (and many CAPTCHAs)
  // run in same-origin iframes and fail closed if these are globally denied.
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(), payment=()");
  if (!isFramedPath(req.path, runtime)) res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

app.use((req, res, next) => {
  if (isProxyPath(req.path, runtime)) return proxyLimiter(req, res, next);
  next();
});

app.get("/__runtime.js", generalLimiter, (_req, res) => {
  res.type("application/javascript").set("Cache-Control", "no-store").send(clientBootstrap(runtime));
});

if (runtime.disableGamesOnMainHost) {
  app.use((req, res, next) => {
    if (req.path.startsWith("/hosted/")) return res.status(404).end();
    next();
  });
}

const jsStaticOptions = {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath);
    if (ext === ".js" || ext === ".mjs") {
      res.type("text/javascript");
      res.setHeader("Service-Worker-Allowed", "/");
    } else if (ext === ".wasm") {
      res.type("application/wasm");
    }
  },
};

app.use("/.runtime", (_req, res) => {
  res.sendStatus(404);
});

if (vendorMap?.analytics) {
  const { id, loader, transport, sink, param, key } = vendorMap.analytics;
  let cached = null;

  const unpack = value => {
    const raw = Buffer.from(String(value).replace(/-/g, "+").replace(/_/g, "/"), "base64");
    return Buffer.from(raw.map((byte, index) => byte ^ key[index % key.length])).toString("utf8");
  };

  // gtag builds its own URL and always ends it with /g/collect?v=2&tid=G-..., so the
  // recognizable shape can only be removed after gtag hands the request to the browser.
  // These wrappers pass everything that is not a collect hit straight through.
  const requestHook = `(function(){var B=location.origin+${JSON.stringify(transport)}+"/g/collect",S=${JSON.stringify(sink)},P=${JSON.stringify(param)},K=${JSON.stringify(key)};
function pack(s){var o="";for(var i=0;i<s.length;i++)o+=String.fromCharCode(s.charCodeAt(i)^K[i%K.length]);return btoa(o).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"")}
function re(u){try{u=String(u);if(u.indexOf(B)!==0)return null;var q=u.indexOf("?");return S+"?"+P+"="+pack(q<0?"":u.slice(q+1))}catch(e){return null}}
var sb=navigator.sendBeacon&&navigator.sendBeacon.bind(navigator);if(sb)navigator.sendBeacon=function(u,d){return sb(re(u)||u,d)};
var of=window.fetch;if(of)window.fetch=function(u,o){if(typeof u==="string"){var r=re(u);if(r)u=r}return of.call(this,u,o)};
var xo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){var a=[].slice.call(arguments);a[1]=re(u)||u;return xo.apply(this,a)}})();\n`;

  app.get(loader, async (_req, res) => {
    try {
      if (!cached || Date.now() - cached.at > 3600000) {
        const upstream = await fetch(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
        if (!upstream.ok) return res.sendStatus(502);
        const body = await upstream.text();
        // Bootstrapping here rather than inline in the page is what keeps the measurement
        // id out of the HTML. transport_url sends hits to our own origin.
        const boot = `\n;window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config",${JSON.stringify(id)},{transport_url:location.origin+${JSON.stringify(transport)}});`;
        // Hook first: gtag captures its transport references as it initialises.
        cached = { at: Date.now(), body: requestHook + body + boot };
      }
      res.type("text/javascript").set("Cache-Control", "public, max-age=900").send(cached.body);
    } catch {
      res.sendStatus(502);
    }
  });

  app.all(sink, express.raw({ type: "*/*", limit: "64kb" }), async (req, res) => {
    try {
      const target = new URL("https://www.google-analytics.com/g/collect");
      target.search = unpack(req.query[param] ?? "");
      const upstream = await fetch(target, {
        method: req.method === "GET" ? "GET" : "POST",
        headers: {
          "User-Agent": req.get("user-agent") ?? "",
          "X-Forwarded-For": req.ip,
          ...(req.get("content-type") ? { "Content-Type": req.get("content-type") } : {}),
        },
        body: req.method === "GET" || !req.body?.length ? undefined : req.body,
      });
      res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      res.sendStatus(204);
    }
  });
}

const GITHUB_UA = { "User-Agent": "scramjet-site" };
const TOKEN = /^[A-Za-z0-9._-]+$/;
const gnLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
});

async function proxyGithubRaw(res, next, url, rewriteHtml = false) {
  try {
    const upstream = await fetch(url, { headers: GITHUB_UA, redirect: "follow" });
    if (!upstream.ok) return res.sendStatus(upstream.status);
    if (rewriteHtml) {
      let html = await upstream.text();
      html = html.replace(/https?:\/\/(?:cdn|fastly|gcore)\.jsdelivr\.net\/gh\//gi, "/gn-cdn/");
      res.type("html").set("Cache-Control", "public, max-age=3600").send(html);
      return;
    }
    const data = Buffer.from(await upstream.arrayBuffer());
    const ext = path.extname(new URL(url).pathname);
    res.set("Cache-Control", "public, max-age=86400");
    res.type(mime.getType(ext) || "application/octet-stream").send(data);
  } catch {
    next();
  }
}

app.get("/gn-html/:file", gnLimiter, async (req, res, next) => {
  const file = req.params.file;
  if (!TOKEN.test(file) || !file.endsWith(".html")) return res.sendStatus(400);
  return proxyGithubRaw(res, next, `https://raw.githubusercontent.com/gn-math/html/main/${file}`, true);
});

app.get("/gn-cover/:file", async (req, res, next) => {
  const file = req.params.file;
  if (!TOKEN.test(file) || !file.endsWith(".png")) return res.sendStatus(400);
  return proxyGithubRaw(res, next, `https://raw.githubusercontent.com/gn-math/covers/main/${file}`);
});

app.get("/gn-cdn/:owner/:repoRef/*", gnLimiter, async (req, res, next) => {
  const { owner, repoRef } = req.params;
  const rest = req.params[0] || "";
  const at = repoRef.lastIndexOf("@");
  if (at < 1) return res.sendStatus(400);
  const repo = repoRef.slice(0, at);
  const ref = repoRef.slice(at + 1);
  if (![owner, repo, ref].every(part => TOKEN.test(part))) return res.sendStatus(400);
  if (!rest || rest.includes("..")) return res.sendStatus(400);
  return proxyGithubRaw(res, next, `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${rest}`);
});

const CLIENT_JS = new Set(["main.js", "home.js", "settings.js", "launcher.js"]);
const obfuscatedJs = new Map();
const reservedClientNames = [
  "go",
  "blank",
  "navigate",
  "toggleAB",
  "AB",
  "saveEventKey",
  "changeEngine",
  "exportSaveData",
  "importSaveData",
  "themeChange",
  "handleDropdownChange",
  "bar",
  "category",
  "SplashT",
  "US",
  "isInTabMode",
  "resolveProxyChoice",
  "getRuntime",
  "getPaths",
  "getPageRoute",
  "getWispUrl",
  "resolveGamesUrl",
  "waitForProxyBoot",
  "scramjet",
  "scramjetReady",
  "__encodeProxyUrl",
  "encode",
  "decode",
  "initCursorEffect",
];

app.get("/assets/js/:file", async (req, res, next) => {
  const file = req.params.file;
  if (!CLIENT_JS.has(file)) return next();
  const sourcePath = path.join(STATIC_DIR, "assets", "js", file);
  try {
    const info = await stat(sourcePath);
    const cached = obfuscatedJs.get(file);
    if (cached && cached.mtime === info.mtimeMs) {
      res.type("text/javascript").set("Cache-Control", "no-store").send(cached.code);
      return;
    }
    const source = await readFile(sourcePath, "utf8");
    let code = source;
    try {
      const { default: JavaScriptObfuscator } = await import("javascript-obfuscator");
      code = JavaScriptObfuscator.obfuscate(source, {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        stringArray: true,
        stringArrayEncoding: ["base64"],
        stringArrayThreshold: 0.6,
        identifierNamesGenerator: "hexadecimal",
        renameGlobals: false,
        reservedNames: reservedClientNames,
        target: "browser",
      }).getObfuscatedCode();
    } catch {
      code = source;
    }
    obfuscatedJs.set(file, { mtime: info.mtimeMs, code });
    res.type("text/javascript").set("Cache-Control", "no-store").send(code);
  } catch {
    next();
  }
});

app.use(express.static(SERVE_DIR, { ...jsStaticOptions, dotfiles: "ignore" }));

if (!vendorMap) {
  const { epoxyPath } = require("@mercuryworkshop/epoxy-transport");
  const { baremuxPath } = require("@mercuryworkshop/bare-mux/node");
  const { libcurlPath } = require("@mercuryworkshop/libcurl-transport");
  const { uvPath } = require("@titaniumnetwork-dev/ultraviolet");
  const { scramjetPath } = require("@mercuryworkshop/scramjet/path");

  app.use("/epoxy/", express.static(epoxyPath));
  app.use("/libcurl/", express.static(libcurlPath));
  app.use("/baremux/", express.static(baremuxPath));
  app.use("/assets/ultraviolet/", express.static(uvPath, jsStaticOptions));
  app.use("/assets/scramjet/", express.static(scramjetPath, jsStaticOptions));
}

function gamesRedirect(req, res) {
  if (!runtime.gamesHost) return false;
  const target = new URL(req.path, runtime.gamesHost);
  res.redirect(302, target.href);
  return true;
}

const routes = [
  { path: "/y", file: "y.html" },
  { path: "/settings", file: "settings.html" },
  { path: "/tabs", file: "tabs.html" },
  { path: "/", file: "index.html" },
];

if (!runtime.disableGamesOnMainHost) {
  const { games, apps } = runtime.pageRoutes;
  routes.unshift({ path: apps, file: "apps.html" }, { path: games, file: "games.html" });
}

async function sendHtml(res, file) {
  const fromDist = path.join(SERVE_DIR, file);
  const fromStatic = path.join(STATIC_DIR, file);
  const htmlPath = existsSync(fromDist) ? fromDist : fromStatic;
  const html = injectEduSeo(await readFile(htmlPath, "utf8"));
  res.type("html").send(html);
}

routes.forEach(route => {
  app.get(route.path, generalLimiter, (req, res) => {
    if (gamesRedirect(req, res)) return;
    sendHtml(res, route.file).catch(err => {
      console.error(err);
      res.status(500).end();
    });
  });
});

app.use(generalLimiter, (_req, res) => {
  res.status(404);
  sendHtml(res, "404.html").catch(err => {
    console.error(err);
    res.end();
  });
});

app.use(generalLimiter, (err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500);
  sendHtml(res, "404.html").catch(() => res.end());
});

server.on("request", (req, res) => {
  app(req, res);
});

server.on("upgrade", (req, socket, head) => {
  wisp.routeRequest(req, socket, head);
});

server.on("listening", () => {
  console.log(chalk.green(`Server running on http://localhost:${PORT}`));
});

server.listen({ port: PORT });
