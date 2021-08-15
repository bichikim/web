export const getWindow = (): Window | undefined => {
  return globalThis.window
}

export const getDocument = (): Document | undefined => {
  return globalThis.window?.document
}

export const getHTMLElement = (): typeof HTMLElement | undefined => {
  const window = getWindow()
  if (window) {
    return HTMLElement
  }
}
