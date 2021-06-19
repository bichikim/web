// sort object-value responsive styles
export const sortStyle = (object: Record<string, any>) => {
  return Object.keys(object)
    .sort((first, second) => first.localeCompare(second, undefined, {
      numeric: true,
      sensitivity: 'base',
    }))
    .reduce((result, key) => {
      result[key] = object[key]
      return result
    }, {})
}
