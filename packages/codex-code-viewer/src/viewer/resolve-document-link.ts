export const resolveDocumentLink = (path: string, target: string): string | undefined => {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/iu.test(target)) {
    return undefined
  }
  try {
    const url = new URL(target, `https://workspace.invalid/${path}`)
    const relative = decodeURIComponent(url.pathname).replace(/^\//u, '')
    return `${relative}${url.hash}`
  } catch {
    return undefined
  }
}
