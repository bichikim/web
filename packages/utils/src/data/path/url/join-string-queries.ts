/**
 * @deprecated
 */
export const joinStringQueries = (queries: string[]) => {
  if (queries.length === 0) {
    return ''
  }

  return `?${[...queries].join('&')}`
}
