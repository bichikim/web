// sort object-value responsive styles
export const sortStyle = (object: Record<string, any>) => {
  return Object.keys(object)
  .sort((a, b) => a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: 'base',
  }))
  .reduce((result, key) => {
    result[key] = object[key]
    return result
  }, {})
}
