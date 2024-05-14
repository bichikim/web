export const toAlias = (alias: Record<string, string>) => {
  return Object.entries(alias).map(([key, value]) => {
    return {
      find: key,
      replacement: value,
    }
  })
}
