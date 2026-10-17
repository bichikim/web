import typescript from '@typescript/typescript6'

interface CollectModuleBindingsOptions {
  readonly program: typescript.Program | undefined
  readonly file: string
  readonly offset: number
  readonly cancelled?: () => boolean
  readonly references: (file: string, offset: number) => readonly typescript.ReferencedSymbol[]
}
interface ModuleBinding {
  readonly name: typescript.Identifier
  readonly property: typescript.PropertyName
  readonly origin: typescript.Symbol
}

const nodeAt = (source: typescript.SourceFile, offset: number): typescript.Node => {
  const visit = (node: typescript.Node): typescript.Node =>
    typescript.forEachChild(node, (child) =>
      child.getStart(source) <= offset && offset < child.end ? visit(child) : undefined,
    ) ?? node
  return visit(source)
}
const declarationReferences = (
  symbols: readonly typescript.ReferencedSymbol[],
): typescript.ReferencedSymbolEntry[] =>
  symbols.flatMap((symbol) => symbol.references.filter((entry) => entry.isDefinition !== true))
const moduleCall = (node: typescript.Expression): boolean => {
  if (typescript.isAwaitExpression(node) || typescript.isParenthesizedExpression(node)) {
    return moduleCall(node.expression)
  }
  return (
    typescript.isCallExpression(node) &&
    (node.expression.kind === typescript.SyntaxKind.ImportKeyword ||
      (typescript.isIdentifier(node.expression) && node.expression.text === 'require')) &&
    node.arguments.length === 1 &&
    typescript.isStringLiteralLike(node.arguments[0])
  )
}
const location = (node: typescript.Node): typescript.ReferencedSymbolEntry => ({
  fileName: node.getSourceFile().fileName,
  isDefinition: false,
  isWriteAccess: false,
  textSpan: {length: node.getWidth(), start: node.getStart()},
})

/** Collects references through immutable destructured module bindings with the same compiler symbol. */
export const collectModuleBindingReferences = (
  options: CollectModuleBindingsOptions,
): typescript.ReferencedSymbolEntry[] => {
  const {program} = options
  const source = program?.getSourceFile(options.file)
  if (source === undefined || program === undefined) {
    return []
  }
  const checker = program.getTypeChecker()
  const canonical = (symbol: typescript.Symbol): typescript.Symbol =>
    // oxlint-disable-next-line no-bitwise -- Compiler symbol kinds are bit flags.
    (symbol.flags & typescript.SymbolFlags.Alias) === 0 ? symbol : checker.getAliasedSymbol(symbol)
  const bindings: ModuleBinding[] = []
  for (const source of program.getSourceFiles()) {
    if (options.cancelled?.() === true) {
      throw new typescript.OperationCanceledException()
    }
    if (
      !source.isDeclarationFile &&
      (source.text.includes('require') || source.text.includes('import'))
    ) {
      const visit = (node: typescript.Node): void => {
        if (
          typescript.isVariableDeclaration(node) &&
          typescript.isVariableDeclarationList(node.parent) &&
          // oxlint-disable-next-line no-bitwise -- Compiler declaration kinds are bit flags.
          Boolean(node.parent.flags & typescript.NodeFlags.Const) &&
          typescript.isObjectBindingPattern(node.name) &&
          node.initializer !== undefined &&
          moduleCall(node.initializer)
        ) {
          const module = checker.getTypeAtLocation(node.initializer)
          for (const binding of node.name.elements) {
            const property = binding.propertyName ?? binding.name
            if (
              typescript.isIdentifier(binding.name) &&
              binding.dotDotDotToken === undefined &&
              binding.initializer === undefined &&
              (typescript.isIdentifier(property) || typescript.isStringLiteralLike(property))
            ) {
              const symbol = module.getProperty(property.text)
              if (symbol !== undefined) {
                bindings.push({name: binding.name, origin: canonical(symbol), property})
              }
            }
          }
        }
        typescript.forEachChild(node, visit)
      }
      visit(source)
    }
  }
  const selected = nodeAt(source, options.offset)
  const symbol = checker.getSymbolAtLocation(selected)
  const target =
    bindings.find((binding) => binding.name === selected)?.origin ??
    (symbol === undefined ? undefined : canonical(symbol))
  if (target === undefined) {
    return []
  }
  return bindings
    .filter((binding) => binding.origin === target)
    .flatMap((binding) => [
      location(binding.property),
      ...(binding.property === binding.name ? [] : [location(binding.name)]),
      ...declarationReferences(
        options.references(binding.name.getSourceFile().fileName, binding.name.getStart()),
      ),
    ])
}
