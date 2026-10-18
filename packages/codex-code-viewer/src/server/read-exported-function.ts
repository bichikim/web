import typescript from '@typescript/typescript6'
import {parseSource} from './parse-source'
interface ExportedFunctionOptions {
  readonly file: string
  readonly source: string
  readonly offset: number
  readonly arrowOnly?: boolean
}
interface NamedSyntax extends typescript.Node {
  readonly name?: typescript.Node
}
/** Reads the selected unambiguous exported const function name. */
export const readExportedFunction = ({
  file,
  source,
  offset,
  arrowOnly = false,
}: ExportedFunctionOptions): string | undefined => {
  if (/\.d\.[cm]?ts$/u.test(file)) {
    return undefined
  }
  const tree = parseSource(file, source)
  if (tree === undefined || !typescript.isExternalModule(tree)) {
    return undefined
  }
  const names = tree.statements.flatMap((statement) =>
    typescript.isVariableStatement(statement) &&
    // oxlint-disable-next-line no-bitwise -- TypeScript encodes declaration kinds in a bit mask.
    (statement.declarationList.flags & typescript.NodeFlags.Const) !== 0 &&
    statement.modifiers?.some((modifier) => modifier.kind === typescript.SyntaxKind.ExportKeyword)
      ? statement.declarationList.declarations.flatMap((declaration) =>
          typescript.isIdentifier(declaration.name) &&
          declaration.initializer !== undefined &&
          (typescript.isArrowFunction(declaration.initializer) ||
            (!arrowOnly && typescript.isFunctionExpression(declaration.initializer))) &&
          declaration.name.getStart(tree) <= offset &&
          offset < declaration.name.end
            ? [declaration.name.text]
            : [],
        )
      : [],
  )
  const [name] = names
  if (name === undefined) {
    return undefined
  }
  let declarations = 0
  const visit = (node: typescript.Node): void => {
    const named = (node as NamedSyntax).name
    if (named !== undefined && typescript.isIdentifier(named) && named.text === name) {
      declarations += 1
    }
    typescript.forEachChild(node, visit)
  }
  visit(tree)
  return declarations === 1 ? name : undefined
}
