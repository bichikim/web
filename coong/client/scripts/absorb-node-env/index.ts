/**
 * get VUE NODE ENV
 * @param _prefix {string}
 * @returns {{[p: string]: string}}
 */
export const absorbNodeEnv = (_prefix = 'VUE_') => {
  const step1 = Object.entries(process.env)
    .filter(([key]) => {
      return key.startsWith(_prefix)
    })
    .map(([key, value]) => {
      return [key, JSON.stringify(value)]
    })
  return Object.fromEntries(step1)
}
