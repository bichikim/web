export const getHtmlElement = (): typeof HTMLElement | undefined => {
  return globalThis.HTMLElement
}

/**
 * @deprecated Use `getHtmlElement` instead
 */
export const getHtmlElementClass = getHtmlElement
