export const mergeStyle = (a: Record<string, any>, b: Record<any, any>) => {
  return Object.keys(a).reduce((result, key) => {
    if (!a[key] || typeof b[key] !== 'object') {
      return result
    }
    result[key] = {...a[key], ...b[key]}
    return result
  }, {...a, ...b})
}
