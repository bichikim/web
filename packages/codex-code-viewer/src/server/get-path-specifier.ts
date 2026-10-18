import typescript from '@typescript/typescript6'

interface PathSpecifierOptions {
  readonly path: string
  readonly source: string
  readonly offset: number
}
/** Returns the string literal containing a source offset. */
export const getPathSpecifier = (options: PathSpecifierOptions): string | null => {
  const parsed = typescript.createSourceFile(
    options.path,
    options.source,
    typescript.ScriptTarget.Latest,
    true,
  )
  let specifier: string | null = null
  const visit = (node: typescript.Node): void => {
    if (
      typescript.isStringLiteralLike(node) &&
      node.getStart(parsed) <= options.offset &&
      options.offset < node.end
    ) {
      specifier = node.text
    }
    typescript.forEachChild(node, visit)
  }
  visit(parsed)
  return specifier
}
