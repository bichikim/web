/** Resolves a local file path separately from URL queries and fragments. */
export const resolveDocumentLink = (path: string, target: string): string | undefined => {
  const address = target.replace(/[\t\n\r]/gu, '').trim()
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/iu.test(address)) {
    return undefined
  }
  try {
    const base = path.split('/').map(encodeURIComponent).join('/')
    const url = new URL(address, `https://workspace.invalid/${base}`)
    return url.origin === 'https://workspace.invalid'
      ? decodeURIComponent(url.pathname).replace(/^\//u, '')
      : undefined
  } catch {
    return undefined
  }
}
