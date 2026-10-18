import typescript from '@typescript/typescript6'

interface DeclarationOptions {
  readonly source: typescript.SourceFile
  readonly offset: number
  readonly declaration: typescript.SourceFile
}
const declarationName = (node: typescript.Node): string | undefined => {
  if (
    'name' in node &&
    typeof node.name === 'object' &&
    node.name !== null &&
    'text' in node.name &&
    typeof node.name.text === 'string'
  ) {
    return node.name.text
  }
  return undefined
}
const ownerKind = (node: typescript.Node): string => {
  switch (node.kind) {
    case typescript.SyntaxKind.VariableDeclaration:
    case typescript.SyntaxKind.FunctionDeclaration:
      return 'value'
    case typescript.SyntaxKind.MethodDeclaration:
    case typescript.SyntaxKind.MethodSignature:
    case typescript.SyntaxKind.PropertyDeclaration:
    case typescript.SyntaxKind.PropertySignature:
    case typescript.SyntaxKind.PropertyAssignment:
    case typescript.SyntaxKind.GetAccessor:
    case typescript.SyntaxKind.SetAccessor:
      return 'member'
    default:
      return typescript.SyntaxKind[node.kind]
  }
}
const declarationKey = (node: typescript.Node): string | undefined => {
  if (node.parent === undefined || !('name' in node.parent) || node.parent.name !== node) {
    return undefined
  }
  const owners: string[] = []
  let current: typescript.Node | undefined = node.parent
  while (current !== undefined) {
    const name = declarationName(current)
    if (name !== undefined) {
      owners.unshift(`${ownerKind(current)}:${name}`)
    }
    current = current.parent
  }
  return JSON.stringify(owners)
}
const nodeAt = (source: typescript.SourceFile, offset: number): typescript.Node => {
  const visit = (node: typescript.Node): typescript.Node =>
    typescript.forEachChild(node, (child) =>
      child.getStart(source) <= offset && offset < child.end ? visit(child) : undefined,
    ) ?? node
  return visit(source)
}

/** Matches named declaration owners within an already verified source/declaration file pair. */
export const readDeclarationPositions = ({
  source,
  offset,
  declaration,
}: DeclarationOptions): readonly number[] => {
  const selected = declarationKey(nodeAt(source, offset))
  if (selected === undefined) {
    return []
  }
  const positions: number[] = []
  const visit = (node: typescript.Node): void => {
    if (
      (typescript.isIdentifier(node) || typescript.isStringLiteralLike(node)) &&
      declarationKey(node) === selected
    ) {
      positions.push(node.getStart(declaration))
    }
    typescript.forEachChild(node, visit)
  }
  visit(declaration)
  return positions
}
