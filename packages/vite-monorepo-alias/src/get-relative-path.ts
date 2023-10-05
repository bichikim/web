export const getRelativePath = (roots: RegExp[], path: string): string => {
  const root = roots.find((root) => {
    return root.test(path)
  })
  if (root) {
    return path.replace(root, '')
  }
  return ''
}
