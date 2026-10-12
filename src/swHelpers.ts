/** A window of this app. Other apps on the same origin (e.g. other *.github.io/<repo>/ sites) are ignored. */
export function appWindow<T extends { url: string }>(windows: readonly T[], scope: string): T | undefined {
  return windows.find((w) => w.url.startsWith(scope))
}
