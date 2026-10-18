import {basename, dirname, resolve, sep} from 'node:path'
import typescript from '@typescript/typescript6'

interface ReferenceCandidatesOptions {
  readonly file: string
  readonly source: string
  readonly offset: number
  readonly paths: readonly string[]
  readonly candidates?: readonly string[]
  readonly read: (path: string) => string | undefined
  readonly cancelled?: () => boolean
}
const INDEXED_CANDIDATE_LIMIT = 2
const CANDIDATE_LIMIT = 32
const INSPECTION_LIMIT = 256
const exportedName = (tree: typescript.SourceFile, offset: number): string | undefined => {
  const declarations = tree.statements.flatMap((statement) => {
    const exported =
      typescript.canHaveModifiers(statement) &&
      typescript
        .getModifiers(statement)
        ?.some((modifier) => modifier.kind === typescript.SyntaxKind.ExportKeyword)
    if (!exported) {
      return []
    }
    if (typescript.isFunctionDeclaration(statement)) {
      return statement.name === undefined ? [] : [statement.name]
    }
    return typescript.isVariableStatement(statement)
      ? statement.declarationList.declarations.flatMap((declaration) =>
          typescript.isIdentifier(declaration.name) ? [declaration.name] : [],
        )
      : []
  })
  return declarations.find((name) => name.getStart(tree) <= offset && offset < name.end)?.text
}
/** Chooses bounded preliminary roots for exported lexical bindings; final project coverage remains required. */
export const readReferenceCandidates = (options: ReferenceCandidatesOptions): string[] => {
  if (options.paths.length <= CANDIDATE_LIMIT) {
    return []
  }
  const tree = typescript.createSourceFile(
    options.file,
    options.source,
    typescript.ScriptTarget.Latest,
  )
  if (!typescript.isExternalModule(tree)) {
    return []
  }
  const name = exportedName(tree, options.offset)
  if (name === undefined) {
    return []
  }
  const directory = dirname(options.file)
  const prefix = `${dirname(directory)}${sep}`
  const rank = (path: string): number =>
    dirname(path) === directory ? 2 : Number(path.startsWith(prefix))
  const candidates = new Map(options.candidates?.map((path, index) => [path, index]))
  const paths = options.paths
    .filter((path) => resolve(path) !== options.file)
    .toSorted(
      (left, right) =>
        (candidates.get(left) ?? Infinity) - (candidates.get(right) ?? Infinity) ||
        rank(right) - rank(left),
    )
  const module = basename(options.file).replace(/\.[cm]?[jt]sx?$/u, '')
  const limit = candidates.size > 0 ? INDEXED_CANDIDATE_LIMIT : CANDIDATE_LIMIT
  const found = [options.file]
  const inspect = (paths: readonly string[]): void => {
    for (const path of paths) {
      if (options.cancelled?.() === true) {
        throw new typescript.OperationCanceledException()
      }
      const source = options.read(path)
      if (
        source !== undefined &&
        (candidates.has(path) || source.includes(module) || source.includes(name))
      ) {
        found.push(path)
      }
      if (found.length === limit) {
        return
      }
    }
  }
  const nearby = paths.slice(0, INSPECTION_LIMIT)
  inspect(nearby)
  if (found.length === 1) {
    const inspected = new Set(nearby)
    inspect(
      paths
        .filter((path) => dirname(path) !== directory && !inspected.has(path))
        .slice(0, INSPECTION_LIMIT),
    )
  }
  return found.length > 1 ? found : []
}
