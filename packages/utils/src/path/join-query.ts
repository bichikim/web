export const joinQuery = (queries: string[]) => {
  return `?${[...queries].join('&')}`
}
