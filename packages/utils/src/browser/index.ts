export const getWindow = (): Window | undefined => {
  return globalThis.window
}

export const getDocument = (): Document | undefined => {
  const window = getWindow()
  if (window) {
    return window.document
  }
}

export const getHTMLElement = (): typeof HTMLElement | undefined => {
  const window = getWindow()
  if (window) {
    return globalThis.HTMLElement
  }
}

export const getNavigator = (): Navigator | undefined => {
  const window = getWindow()
  if (window) {
    return window.navigator
  }
}
