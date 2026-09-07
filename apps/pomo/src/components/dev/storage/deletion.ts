export type DeletionRequest =
  | {readonly key: string; readonly kind: 'entry'; readonly label: string}
  | {readonly kind: 'cache' | 'partials'; readonly label: string}

export const getEntryLabel = (key: string) => {
  try {
    const url = new URL(key)
    return decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) ?? url.hostname)
  } catch {
    return key
  }
}
