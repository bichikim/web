import path from 'node:path'
import ts from '@typescript/typescript6'
import type {FileContext, FileOutline} from './types'

const MAX_OUTLINE_ITEMS = 32

const uniqueSorted = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right))

const declarationNames = (statement: ts.Statement): ReadonlyArray<string> => {
  if (
    ts.isClassDeclaration(statement) ||
    ts.isEnumDeclaration(statement) ||
    ts.isFunctionDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isModuleDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement)
  ) {
    return statement.name === undefined ? [] : [statement.name.text]
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) =>
      ts.isIdentifier(declaration.name) ? [declaration.name.text] : [],
    )
  }
  return []
}

const hasExportModifier = (statement: ts.Statement): boolean =>
  ts.canHaveModifiers(statement) &&
  (ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
    false)

const exportedNames = (statement: ts.Statement): ReadonlyArray<string> => {
  if (ts.isExportDeclaration(statement) && statement.exportClause !== undefined) {
    if (ts.isNamedExports(statement.exportClause)) {
      return statement.exportClause.elements.map((element) => element.name.text)
    }
    return [statement.exportClause.name.text]
  }
  return hasExportModifier(statement) ? declarationNames(statement) : []
}

const createOutline = (sourceFile: ts.SourceFile): FileOutline => ({
  declarations: uniqueSorted(sourceFile.statements.flatMap(declarationNames)),
  exports: uniqueSorted(sourceFile.statements.flatMap(exportedNames)),
  imports: uniqueSorted(
    sourceFile.statements.flatMap((statement) =>
      ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)
        ? [statement.moduleSpecifier.text]
        : [],
    ),
  ),
})

const scriptKind = (filePath: string): ts.ScriptKind => {
  const extension = path.extname(filePath).toLowerCase()
  switch (extension) {
    case '.js':
    case '.mjs':
      return ts.ScriptKind.JS
    case '.jsx':
      return ts.ScriptKind.JSX
    case '.tsx':
      return ts.ScriptKind.TSX
    case '.ts':
    case '.mts':
      return ts.ScriptKind.TS
    default: {
      return ts.ScriptKind.Unknown
    }
  }
}

export const splitFileNameWords = (fileName: string): ReadonlyArray<string> => {
  const extension = path.extname(fileName)
  const stem = fileName.slice(0, -extension.length || undefined)
  return stem
    .replaceAll(
      /(?<acronym>[A-Z]+)(?<capitalizedWord>[A-Z][a-z])/gu,
      '$<acronym> $<capitalizedWord>',
    )
    .replaceAll(/(?<lowercase>[a-z\d])(?<uppercase>[A-Z])/gu, '$<lowercase> $<uppercase>')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0)
    .map((word) => word.toLocaleLowerCase())
}

export const createFileContext = (options: {
  readonly filePath: string
  readonly root: string
  readonly sourceText: string
}): FileContext => {
  const absolutePath = path.resolve(options.filePath)
  const baseName = path.basename(absolutePath)
  const extension = path.extname(baseName)
  const sourceFile = ts.createSourceFile(
    absolutePath,
    options.sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(absolutePath),
  )
  return {
    absolutePath,
    fileName: {
      extension,
      stem: baseName.slice(0, -extension.length || undefined),
      words: splitFileNameWords(baseName),
    },
    outline: createOutline(sourceFile),
    relativePath: path.relative(options.root, absolutePath).split(path.sep).join('/'),
    sourceFile,
    sourceText: options.sourceText,
  }
}

export const formatFileEvidence = (context: FileContext): string =>
  [
    `Path: ${context.relativePath}`,
    `Filename: ${context.fileName.stem}`,
    `Filename words: ${context.fileName.words.join(', ') || '(none)'}`,
    `Imports: ${context.outline.imports.slice(0, MAX_OUTLINE_ITEMS).join(', ') || '(none)'}`,
    `Exports: ${context.outline.exports.slice(0, MAX_OUTLINE_ITEMS).join(', ') || '(none)'}`,
    `Top-level declarations: ${context.outline.declarations.slice(0, MAX_OUTLINE_ITEMS).join(', ') || '(none)'}`,
  ].join('\n')
