import typescript from '@typescript/typescript6'
import type {CodeToken} from '../shared/contracts'

const getKind = (kind: typescript.SyntaxKind): CodeToken['kind'] => {
  if (kind >= typescript.SyntaxKind.FirstKeyword && kind <= typescript.SyntaxKind.LastKeyword) {
    return 'keyword'
  }
  switch (kind) {
    case typescript.SyntaxKind.StringLiteral:
    case typescript.SyntaxKind.NoSubstitutionTemplateLiteral:
      return 'string'
    case typescript.SyntaxKind.SingleLineCommentTrivia:
    case typescript.SyntaxKind.MultiLineCommentTrivia:
      return 'comment'
    case typescript.SyntaxKind.NumericLiteral:
      return 'number'
    case typescript.SyntaxKind.Identifier:
      return 'identifier'
    default:
      return 'plain'
  }
}

const getNavigation = (source: typescript.SourceFile): Map<number, CodeToken['navigation']> => {
  const navigation = new Map<number, CodeToken['navigation']>()
  const visit = (node: typescript.Node): void => {
    if (typescript.isIdentifier(node)) {
      navigation.set(node.getStart(source), 'definition')
    }
    if (typescript.isStringLiteralLike(node)) {
      const {parent} = node
      const isModule =
        typescript.isImportDeclaration(parent) ||
        typescript.isExportDeclaration(parent) ||
        typescript.isExternalModuleReference(parent) ||
        (typescript.isCallExpression(parent) &&
          (parent.expression.kind === typescript.SyntaxKind.ImportKeyword ||
            (typescript.isIdentifier(parent.expression) && parent.expression.text === 'require')) &&
          parent.arguments.includes(node))
      if (
        isModule ||
        node.text.startsWith('./') ||
        node.text.startsWith('../') ||
        node.text.startsWith('/')
      ) {
        navigation.set(node.getStart(source), 'path')
      }
    }
    typescript.forEachChild(node, visit)
  }
  visit(source)
  return navigation
}

export const tokenizeSource = (path: string, text: string): CodeToken[][] => {
  const source = typescript.createSourceFile(path, text, typescript.ScriptTarget.Latest, true)
  const navigation = getNavigation(source)
  const leaves: typescript.Node[] = []
  const visit = (node: typescript.Node): void => {
    const children = node.getChildren(source)
    if (children.length === 0 && node.kind !== typescript.SyntaxKind.EndOfFileToken) {
      leaves.push(node)
    } else {
      children.forEach(visit)
    }
  }
  visit(source)
  const tokens: CodeToken[] = []
  let cursor = 0
  for (const node of leaves) {
    const offset = node.getStart(source)
    if (cursor < offset) {
      const trivia = text.slice(cursor, offset)
      const scanner = typescript.createScanner(
        typescript.ScriptTarget.Latest,
        false,
        undefined,
        trivia,
      )
      let kind = scanner.scan()
      while (kind !== typescript.SyntaxKind.EndOfFileToken) {
        tokens.push({
          kind: getKind(kind),
          navigation: null,
          offset: cursor + scanner.getTokenPos(),
          text: scanner.getTokenText(),
        })
        kind = scanner.scan()
      }
    }
    tokens.push({
      kind: getKind(node.kind),
      navigation: navigation.get(offset) ?? null,
      offset,
      text: text.slice(offset, node.end),
    })
    cursor = node.end
  }
  if (cursor < text.length) {
    tokens.push({kind: 'plain', navigation: null, offset: cursor, text: text.slice(cursor)})
  }
  const lines: CodeToken[][] = [[]]
  for (const token of tokens) {
    const parts = token.text.split(/\r?\n/u)
    let {offset} = token
    for (const [index, part] of parts.entries()) {
      if (index > 0) {
        lines.push([])
      }
      if (part.length > 0) {
        lines.at(-1)?.push({
          kind: token.kind,
          navigation: token.navigation,
          offset,
          text: part,
        })
      }
      offset += part.length + (text.slice(offset + part.length).startsWith('\r\n') ? 2 : 1)
    }
  }
  return lines
}
