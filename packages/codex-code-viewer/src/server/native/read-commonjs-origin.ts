import typescript from '@typescript/typescript6'

/** Locates the lexical value behind an object property assigned to module.exports. */
export const readCommonjsOrigin = (
  source: typescript.SourceFile,
  offset: number,
): number | undefined => {
  const visit = (node: typescript.Node): typescript.Node =>
    typescript.forEachChild(node, (child) =>
      child.getStart(source) <= offset && offset < child.end ? visit(child) : undefined,
    ) ?? node
  const selected = visit(source)
  const property = selected.parent
  if (
    property === undefined ||
    !(
      typescript.isShorthandPropertyAssignment(property) ||
      typescript.isPropertyAssignment(property)
    ) ||
    property.name !== selected
  ) {
    return undefined
  }
  const object = property.parent
  const assignment = object.parent
  if (
    !typescript.isObjectLiteralExpression(object) ||
    !typescript.isBinaryExpression(assignment) ||
    assignment.right !== object ||
    assignment.operatorToken.kind !== typescript.SyntaxKind.EqualsToken
  ) {
    return undefined
  }
  const target = assignment.left
  if (
    !typescript.isPropertyAccessExpression(target) ||
    target.name.text !== 'exports' ||
    !typescript.isIdentifier(target.expression) ||
    target.expression.text !== 'module'
  ) {
    return undefined
  }
  const value = typescript.isShorthandPropertyAssignment(property)
    ? property.name
    : property.initializer
  return typescript.isIdentifier(value) ? value.getStart(source) : undefined
}
