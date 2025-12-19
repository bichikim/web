/**
 * Converts a query parameter value to a string
 * @param query - Query parameter value (string or array of strings)
 * @returns String representation of the query parameter
 */
export const queryToString = (query: string[] | string): string => {
  if (Array.isArray(query)) {
    return query.join(',')
  }

  return String(query)
}
