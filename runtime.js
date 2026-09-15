import config from "./config.js";

const DEFAULT_PATHS = config.paths;

export function resolveRuntime(vendorMap) {
  const paths = vendorMap
    ? {
        uv: vendorMap.scopes.uv,
        scramjet: vendorMap.scopes.scramjet,
        eggs: vendorMap.scopes.eggs,
        wisp: vendorMap.wisp,
      }
    : DEFAULT_PATHS;

  return {
    build: vendorMap?.build ?? "dev",
    sw: vendorMap?.sw ?? "/sw.js",
    paths,
    externalWisp: config.externalWisp,
    gamesHost: config.gamesHost,
    disableGamesOnMainHost: config.disableGamesOnMainHost,
    scramjetOnly: config.scramjetOnly,
  };
}

export function clientBootstrap(runtime) {
  return `self.__runtime=${JSON.stringify({
    build: runtime.build,
    sw: runtime.sw,
    paths: runtime.paths,
    externalWisp: runtime.externalWisp,
    gamesHost: runtime.gamesHost,
    scramjetOnly: runtime.scramjetOnly,
  })};`;
}

export function isProxyPath(pathname, runtime) {
  const { uv, wisp } = runtime.paths;
  return pathname.startsWith(uv) || pathname.startsWith(wisp);
}

export function isFramedPath(pathname, runtime) {
  return (
    isProxyPath(pathname, runtime) ||
    pathname.startsWith("/gn-") ||
    pathname.startsWith("/gh-games/") ||
    pathname.startsWith("/hosted/")
  );
}
