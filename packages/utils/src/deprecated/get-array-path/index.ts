export const getArrayPath = (path: string | string[]) => {
  return Array.isArray(path) ? path : path.split('.')
}
