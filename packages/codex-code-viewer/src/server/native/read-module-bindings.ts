import typescript from '@typescript/typescript6'

interface ModuleBinding {
  readonly local: number
  readonly property: number
}
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

/** Reads immutable destructured module binding positions without inferring their symbol identities. */
export const readModuleBindings = (source: typescript.SourceFile): readonly ModuleBinding[] => {
  const bindings: ModuleBinding[] = []
  const visit = (node: typescript.Node): void => {
    if (
      typescript.isVariableDeclaration(node) &&
      typescript.isVariableDeclarationList(node.parent) &&
      // oxlint-disable-next-line no-bitwise -- Compiler declaration kinds are flags.
      Boolean(node.parent.flags & typescript.NodeFlags.Const) &&
      typescript.isObjectBindingPattern(node.name) &&
      node.initializer !== undefined &&
      moduleCall(node.initializer)
    ) {
      for (const binding of node.name.elements) {
        const property = binding.propertyName ?? binding.name
        if (
          typescript.isIdentifier(binding.name) &&
          binding.dotDotDotToken === undefined &&
          binding.initializer === undefined &&
          (typescript.isIdentifier(property) || typescript.isStringLiteralLike(property))
        ) {
          bindings.push({local: binding.name.getStart(source), property: property.getStart(source)})
        }
      }
    }
    typescript.forEachChild(node, visit)
  }
  visit(source)
  return bindings
}
