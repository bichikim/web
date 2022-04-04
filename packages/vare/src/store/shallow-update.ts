export const shallowUpdate = (target: Record<string, any>, source: Record<string, any>) => {
  Object.keys(source).forEach((key) => {
    target[key] = source[key]
  })
}

export const oneDepthUpdate = (target: Record<string, any>, source: Record<string, any>) => {
  Object.keys(source).forEach((key) => {
    const item = source[key]
    const targetItem = target[key]
    if (typeof item === 'object' && typeof targetItem === 'object') {
      shallowUpdate(targetItem, item)
      return
    }
    target[key] = source[key]
  })
}
