// sort object-value responsive styles
export const sortStyle = (object: Record<string, any>) => {
  const next: any = {}
  Object.keys(object)
  .sort((a, b) => a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: 'base',
  }))
  .forEach(key => {
    next[key] = object[key]
  })
  return next
}
