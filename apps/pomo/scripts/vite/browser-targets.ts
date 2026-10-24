export const BROWSER_TARGETS = {
  chrome: '111',
  edge: '111',
  firefox: '114',
  ios: '16.4',
  safari: '16.4',
} as const

export const BROWSER_BUILD_TARGETS = Object.entries(BROWSER_TARGETS).map(
  ([browser, version]) => `${browser}${version}`,
)
