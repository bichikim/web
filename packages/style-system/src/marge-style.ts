export const mergeStyle = (first: Record<string, any>, second: Record<any, any>) => {
  return Object.keys(first).reduce((result, key) => {
    if (!first[key] || typeof second[key] !== 'object') {
      return result
    }
    result[key] = {...first[key], ...second[key]}
    return result
  }, {...first, ...second})
}
