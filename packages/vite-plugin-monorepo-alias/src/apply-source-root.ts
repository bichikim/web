export interface SourceRootContext {
  importer?: undefined | string
  source: string
}

export const applySourceRoot = (
  regexStringList: string[],
  sourceRoot: string | ((context: SourceRootContext) => string),
  context: SourceRootContext,
): RegExp[] => {
  const _sourceRoot = typeof sourceRoot === 'function' ? sourceRoot(context) : sourceRoot

  return regexStringList.map((regexString) => {
    return new RegExp(`${regexString}${_sourceRoot}/`, 'u')
  })
}
