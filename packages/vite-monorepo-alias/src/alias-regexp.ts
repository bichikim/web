export const createAliasRegexp = (alias: string) => {
  const trimmedAlias = alias.replace(/^\.?\//u, '')

  return RegExp(`^${trimmedAlias}/(.*)$`, 'u')
}
