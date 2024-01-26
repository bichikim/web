export const removeFile = (path: string) => {
  return path.replace(/[-._a-zA-Z0-9]+\.[a-z]+$/u, '')
}
