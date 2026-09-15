const config = {
  challenge: false,
  users: {
    interstellar: "password",
  },

  // Warn and prefer dist/ when no production build is present.
  requireBuild: true,

  // Default Wisp endpoint when the user has not set one in Settings (null = same origin).
  externalWisp: null,

  // Send /games and /apps to another deployment (e.g. "https://games.example.com").
  gamesHost: null,

  // Drop games, apps, gh-games, and hosted routes from this host.
  disableGamesOnMainHost: false,

  // Hide Ultraviolet in Settings and skip loading it in the service worker.
  scramjetOnly: false,

  // Chat at /y reads process.env.AIKEY (OpenRouter). Never put the key in client JS.

  proxyRateLimit: {
    windowMs: 60 * 1000,
    max: 300,
  },

  paths: {
    wisp: "/wisp/",
    uv: "/uv/",
    scramjet: "/uv/scramjet/",
    eggs: "/uv/eggs/",
  },

  pageRoutes: {
    games: "/g",
    apps: "/a",
  },
};


export default config;
