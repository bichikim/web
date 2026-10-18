import typescript from '@typescript/typescript6'

/** Resolves file-local uses of verified import bindings without loading their dependency graphs. */
export const readImportReferences = (
  tree: typescript.SourceFile,
  bindings: readonly typescript.ImportSpecifier[],
): readonly number[] => {
  const program = typescript.createProgram({
    host: {
      fileExists: (file) => file === tree.fileName,
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => '/',
      getDefaultLibFileName: () => '',
      getNewLine: () => '\n',
      getSourceFile: (file) => (file === tree.fileName ? tree : undefined),
      readFile: (file) => (file === tree.fileName ? tree.text : undefined),
      useCaseSensitiveFileNames: () => true,
      writeFile: () => undefined,
    },
    options: {
      allowJs: true,
      jsx: typescript.JsxEmit.Preserve,
      noLib: true,
      noResolve: true,
      target: typescript.ScriptTarget.Latest,
    },
    rootNames: [tree.fileName],
  })
  const checker = program.getTypeChecker()
  const symbols = new Set(
    bindings.flatMap((binding) => {
      const symbol = checker.getSymbolAtLocation(binding.name)
      return symbol?.declarations?.length === 1 && symbol.declarations[0] === binding
        ? [symbol]
        : []
    }),
  )
  const offsets: number[] = []
  const visit = (node: typescript.Node): void => {
    if (typescript.isImportDeclaration(node)) {
      return
    }
    if (typescript.isIdentifier(node)) {
      const {parent} = node
      const symbol = typescript.isShorthandPropertyAssignment(parent)
        ? checker.getShorthandAssignmentValueSymbol(parent)
        : typescript.isExportSpecifier(parent)
          ? node === (parent.propertyName ?? parent.name)
            ? checker.getExportSpecifierLocalTargetSymbol(parent)
            : undefined
          : checker.getSymbolAtLocation(node)
      if (symbol !== undefined && symbols.has(symbol)) {
        offsets.push(node.getStart(tree))
      }
    }
    typescript.forEachChild(node, visit)
  }
  visit(tree)
  return offsets
}
