export const isNode = () => {
  return globalThis.window === undefined
}

export const isSSR = isNode
