import ts from '@typescript/typescript6'
import {normalizeText} from './normalization'
import {
  DEFAULT_SEMANTIC_THRESHOLD,
  type ExtractionResult,
  type KeyCallArgument,
  type KeyComparison,
  type KeyDetection,
  type KeyDetector,
  type KeyEntry,
  type SimilarityThreshold,
} from './types'

interface ResolveThresholdOptions {
  readonly key: string
  readonly maximum: number
  readonly minimum: number
  readonly name: string
  readonly threshold: SimilarityThreshold
}

export interface ExtractionThresholds {
  readonly semanticThreshold: SimilarityThreshold
}

interface ImportBinding {
  readonly imported: string
  readonly source: string
}

interface ResolvedDetection {
  readonly argumentIndex: number
  readonly group: string | undefined
}

interface KeyAnnotations {
  readonly aliases: ReadonlyArray<string>
  readonly ignoreLiteral: boolean
}

const DEFAULT_THRESHOLDS: ExtractionThresholds = {
  semanticThreshold: DEFAULT_SEMANTIC_THRESHOLD,
}

const scriptKinds: Readonly<Record<string, ts.ScriptKind>> = {
  '.js': ts.ScriptKind.JS,
  '.jsx': ts.ScriptKind.JSX,
  '.mjs': ts.ScriptKind.JS,
  '.mts': ts.ScriptKind.TS,
  '.ts': ts.ScriptKind.TS,
  '.tsx': ts.ScriptKind.TSX,
}

const getScriptKind = (filePath: string): ts.ScriptKind => {
  const extension = filePath.slice(filePath.lastIndexOf('.'))
  return scriptKinds[extension] ?? ts.ScriptKind.Unknown
}

const getPlaceholderName = (node: ts.Expression): string | undefined => {
  if (ts.isIdentifier(node)) {
    return node.text
  }
  if (!ts.isPropertyAccessExpression(node)) {
    return undefined
  }
  const target = getPlaceholderName(node.expression)
  return target === undefined ? undefined : `${target}.${node.name.text}`
}

const getLiteral = (
  node: ts.Expression,
): {kind: KeyEntry['literalKind']; text: string} | undefined => {
  if (ts.isStringLiteral(node)) {
    return {kind: node.getText()[0] === '"' ? 'double' : 'single', text: node.text}
  }
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return {kind: 'template', text: node.text}
  }
  if (ts.isTemplateExpression(node)) {
    const parts = [node.head.text]
    for (const span of node.templateSpans) {
      const placeholderName = getPlaceholderName(span.expression)
      if (placeholderName === undefined) {
        return undefined
      }
      parts.push(`\${${placeholderName}}`, span.literal.text)
    }
    return {kind: 'template', text: parts.join('')}
  }
  return undefined
}

const hasBlankLine = (text: string): boolean => /\r?\n[\t ]*\r?\n/u.test(text)

const isStandaloneComment = (code: string, range: ts.CommentRange): boolean => {
  const lineStart = code.lastIndexOf('\n', range.pos - 1) + 1
  return code.slice(lineStart, range.pos).trim().length === 0
}

const parseCommentAnnotations = (comment: string): KeyAnnotations => {
  const aliases: string[] = []
  let ignoreLiteral = false
  const lines = comment
    .replace(/^\/\*+/u, '')
    .replace(/\*\/$/u, '')
    .split(/\r?\n/u)
    .map((line) => line.replace(/^\s*(?:\/\/|\*)?\s?/u, '').trim())
  for (const line of lines) {
    const alias = /^@key-similarity-with\s+(?<key>.+)$/u.exec(line)?.groups?.key?.trim()
    if (alias !== undefined) {
      aliases.push(alias)
    } else if (line === '@key-similarity-with') {
      throw new Error('@key-similarity-with requires a key.')
    } else if (line === '@key-similarity-ignore-literal') {
      ignoreLiteral = true
    }
  }
  return {aliases, ignoreLiteral}
}

const getLeadingAnnotations = (code: string, node: ts.Node): KeyAnnotations => {
  const ranges = ts.getLeadingCommentRanges(code, node.getFullStart()) ?? []
  if (ranges.length === 0 || hasBlankLine(code.slice(ranges.at(-1)!.end, node.getStart()))) {
    return {aliases: [], ignoreLiteral: false}
  }
  let blockStart = 0
  for (let index = 1; index < ranges.length; index += 1) {
    if (hasBlankLine(code.slice(ranges[index - 1]!.end, ranges[index]!.pos))) {
      blockStart = index
    }
  }
  const annotations = ranges.slice(blockStart).filter((range) => isStandaloneComment(code, range))
  return annotations.reduce<KeyAnnotations>(
    (result, range) => {
      const parsed = parseCommentAnnotations(code.slice(range.pos, range.end))
      return {
        aliases: [...result.aliases, ...parsed.aliases],
        ignoreLiteral: result.ignoreLiteral || parsed.ignoreLiteral,
      }
    },
    {aliases: [], ignoreLiteral: false},
  )
}

const getKeyAnnotations = (code: string, call: ts.CallExpression): KeyAnnotations => {
  let node: ts.Node = call
  while (!ts.isSourceFile(node)) {
    const annotations = getLeadingAnnotations(code, node)
    if (annotations.aliases.length > 0 || annotations.ignoreLiteral) {
      return annotations
    }
    if (ts.isStatement(node)) {
      return annotations
    }
    node = node.parent
  }
  return {aliases: [], ignoreLiteral: false}
}

const createComparisons = (
  texts: ReadonlyArray<string>,
  semanticThreshold: SimilarityThreshold,
): ReadonlyArray<KeyComparison> => {
  const comparisonsByText = new Map<string, KeyComparison>()
  for (const text of texts) {
    const normalizedText = normalizeText(text)
    if (!comparisonsByText.has(normalizedText)) {
      comparisonsByText.set(normalizedText, {
        normalizedText,
        originalText: text,
        semanticThreshold: resolveThreshold({
          key: text,
          maximum: 1,
          minimum: -1,
          name: 'semanticThreshold',
          threshold: semanticThreshold,
        }),
      })
    }
  }
  return [...comparisonsByText.values()]
}

export const extractKeys = (
  code: string,
  filePath: string,
  keyDetector: KeyDetector,
  thresholds: ExtractionThresholds = DEFAULT_THRESHOLDS,
): ExtractionResult => {
  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath),
  )
  const bindings = new Map<string, ImportBinding>()

  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) {
      return
    }
    const namedBindings = node.importClause?.namedBindings
    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      return
    }
    for (const element of namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text
      bindings.set(element.name.text, {imported, source: node.moduleSpecifier.text})
    }
  })

  const entries: KeyEntry[] = []
  const dynamicCalls: ExtractionResult['dynamicCalls'][number][] = []
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const binding = bindings.get(node.expression.text)
      if (binding) {
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        const callArguments: ReadonlyArray<KeyCallArgument> = node.arguments.map((argument) => {
          const literal = getLiteral(argument)
          return literal
            ? {
                kind: literal.kind === 'template' ? 'template' : 'string',
                value: literal.text,
              }
            : {kind: 'dynamic', value: undefined}
        })
        const detection = resolveDetection(
          keyDetector({
            arguments: callArguments,
            filePath,
            imported: binding.imported,
            localName: node.expression.text,
            position: {column: position.character + 1, line: position.line + 1},
            source: binding.source,
          }),
        )
        if (detection === undefined) {
          ts.forEachChild(node, visit)
          return
        }
        const argument = node.arguments[detection.argumentIndex]
        const literal = argument === undefined ? undefined : getLiteral(argument)
        if (argument === undefined || literal === undefined) {
          dynamicCalls.push({
            filePath,
            position: {column: position.character + 1, line: position.line + 1},
          })
        } else {
          const annotations = getKeyAnnotations(code, node)
          const comparisonTexts = [
            ...(annotations.ignoreLiteral ? [] : [literal.text]),
            ...annotations.aliases,
          ]
          const comparisons = createComparisons(comparisonTexts, thresholds.semanticThreshold)
          if (comparisons.length === 0) {
            ts.forEachChild(node, visit)
            return
          }
          entries.push({
            comparisons,
            filePath,
            group: detection.group,
            imported: binding.imported,
            literalEnd: argument.getEnd(),
            literalKind: literal.kind,
            literalStart: argument.getStart(sourceFile),
            originalText: literal.text,
            position: {column: position.character + 1, line: position.line + 1},
            source: binding.source,
          })
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return {dynamicCalls, entries}
}

const resolveThreshold = (options: ResolveThresholdOptions): number => {
  const {key, maximum, minimum, name, threshold} = options
  const value = typeof threshold === 'number' ? threshold : threshold(key)
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(
      `${name} must return a number between ${minimum} and ${maximum} for key: ${key}`,
    )
  }
  return value
}

const resolveDetection = (detection: KeyDetection): ResolvedDetection | undefined => {
  if (detection === undefined) {
    return undefined
  }
  const grouped = typeof detection === 'number' ? undefined : detection
  const argumentIndex = grouped?.argumentIndex ?? detection
  if (typeof argumentIndex !== 'number' || !Number.isInteger(argumentIndex) || argumentIndex < 0) {
    throw new Error(`keyDetector returned an invalid argument index: ${String(argumentIndex)}`)
  }
  if (grouped !== undefined && grouped.group.length === 0) {
    throw new Error('keyDetector returned an empty group.')
  }
  return {argumentIndex, group: grouped?.group}
}

export const assertValidSource = (code: string, filePath: string): void => {
  const result = ts.transpileModule(code, {
    compilerOptions: {jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.Latest},
    fileName: filePath,
    reportDiagnostics: true,
  })
  const diagnostic = result.diagnostics?.find(
    (value) => value.category === ts.DiagnosticCategory.Error,
  )
  if (diagnostic === undefined) {
    return
  }
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
  throw new Error(`Updated source is invalid at ${filePath}: ${message}`)
}
