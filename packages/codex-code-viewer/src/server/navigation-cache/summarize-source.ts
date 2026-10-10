import {createHash} from 'node:crypto'
import typescript from '@typescript/typescript6'
import type {SourceSummary} from './types'

const publicDeclaration = (node: typescript.Node): boolean =>
  typescript.isExportDeclaration(node) ||
  typescript.isExportAssignment(node) ||
  (typescript.canHaveModifiers(node) &&
    typescript
      .getModifiers(node)
      ?.some((modifier) => modifier.kind === typescript.SyntaxKind.ExportKeyword) === true)

const commonJsName = (node: typescript.Node): boolean =>
  typescript.isIdentifier(node) && ['module', 'exports'].includes(node.text)

/** Summarizes local names and module edges; unresolved semantic effects require wider validation. */
export const summarizeSource = (path: string, source: string): SourceSummary => {
  const tree = typescript.createSourceFile(path, source, typescript.ScriptTarget.Latest, true)
  const names = new Set<string>()
  const imports = new Set(
    typescript.preProcessFile(source, true, true).importedFiles.map((file) => file.fileName),
  )
  let uncertain = !typescript.isExternalModule(tree)
  let exported = false
  const visit = (node: typescript.Node): void => {
    if (typescript.isIdentifier(node) || typescript.isStringLiteralLike(node)) {
      names.add(node.text)
    }
    if (commonJsName(node)) {
      uncertain = true
    }
    if (typescript.isImportDeclaration(node) || typescript.isExportDeclaration(node)) {
      if (node.moduleSpecifier !== undefined && typescript.isStringLiteral(node.moduleSpecifier)) {
        imports.add(node.moduleSpecifier.text)
      }
    }
    if (typescript.isCallExpression(node)) {
      const dynamic =
        node.expression.kind === typescript.SyntaxKind.ImportKeyword ||
        (typescript.isIdentifier(node.expression) && node.expression.text === 'require')
      if (dynamic) {
        const [argument] = node.arguments
        if (argument !== undefined && typescript.isStringLiteral(argument)) {
          imports.add(argument.text)
        } else {
          uncertain = true
        }
      }
    }
    if (typescript.isImportEqualsDeclaration(node)) {
      const reference = node.moduleReference
      if (
        typescript.isExternalModuleReference(reference) &&
        reference.expression !== undefined &&
        typescript.isStringLiteral(reference.expression)
      ) {
        imports.add(reference.expression.text)
      } else {
        uncertain = true
      }
    }
    if (typescript.isModuleDeclaration(node)) {
      uncertain = true
    }
    if (publicDeclaration(node)) {
      exported = true
    }
    typescript.forEachChild(node, visit)
  }
  visit(tree)
  const fingerprint = createHash('sha256').update(source).digest('hex')
  return {
    fingerprint,
    imports: [...imports],
    names: [...names],
    surface: exported || uncertain ? fingerprint : '',
    uncertain:
      uncertain || tree.referencedFiles.length > 0 || tree.typeReferenceDirectives.length > 0,
  }
}
