// todo support array & object
export const resolveQueryValue = (value: string) => {
  return value
}

export const parseQuery = (query: string) => {
  const trimmedQuery: string = query.replace(/^\?/u, '')
  const entries = trimmedQuery
    .split('&')
    .map((item: string) => {
      return item.split('=', 2)
    })
    .map(([key, value]) => [key, resolveQueryValue(value)])
  return Object.fromEntries(entries)
}
