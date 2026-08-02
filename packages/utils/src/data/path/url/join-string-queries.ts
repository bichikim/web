/**
 * @deprecated
 */
export const joinStringQueries = (queries: string[]) => {
  return `?${[...queries].join('&')}`
}
