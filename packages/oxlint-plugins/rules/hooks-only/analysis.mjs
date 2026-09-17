import {readdirSync, readFileSync} from 'node:fs'
import {dirname, extname, join, resolve, sep} from 'node:path'
import ts from '@typescript/typescript6'

const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']
const hookApis = new Set([
  'createSignal',
  'createMemo',
  'createEffect',
  'createRenderEffect',
  'createComputed',
  'createReaction',
  'createResource',
  'createDeferred',
  'createSelector',
  'onMount',
  'onCleanup',
  'useContext',
  'getOwner',
  'createStore',
  'createMutable',
])

export const isSupportFile = (filename) => {
  const segments = filename.split(/[/\\]/u)
  if (segments.some((segment) => segment === '__tests__' || segment === '__mocks__')) {
    return true
  }
  const basename = segments.at(-1) ?? ''
  return (
    ['.spec.', '.test.', '.e2e.', '.story.'].some((marker) => {
      const index = basename.indexOf(marker)
      return index !== -1 && index + marker.length < basename.length
    }) || /\.d\.[cm]?ts$/u.test(basename)
  )
}

const sourceFiles = (directory) =>
  readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const filename = join(directory, entry.name)
    if (entry.isSymbolicLink() || isSupportFile(filename)) {
      return []
    }
    if (entry.isDirectory()) {
      return sourceFiles(filename)
    }
    return extensions.includes(extname(filename)) ? [filename] : []
  })

const walk = (node, visit) => {
  visit(node)
  ts.forEachChild(node, (child) => walk(child, visit))
}

const unwrap = (node) => {
  if (
    node &&
    (ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node))
  ) {
    return unwrap(node.expression)
  }
  return node
}

const createAnalysis = (files) => {
  const sources = new Map(
    files.map(([filename, text]) => [
      filename,
      ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true),
    ]),
  )
  const resolveImport = (specifier, containing) => {
    const marker = 'src/'
    const normalized = containing.replaceAll('\\', '/')
    const boundary = normalized.lastIndexOf('/src/')
    const base = specifier.startsWith('.')
      ? resolve(dirname(containing), specifier)
      : specifier.startsWith(marker) && boundary !== -1
        ? resolve(normalized.slice(0, boundary + 1), specifier)
        : null
    if (base === null) {
      return undefined
    }
    const stem = base.replace(/\.[cm]?jsx?$/u, '')
    const resolved = [
      base,
      ...extensions.map((extension) => stem + extension),
      ...extensions.map((extension) => join(base, `index${extension}`)),
    ].find((candidate) => sources.has(candidate))
    return resolved === undefined ? undefined : {resolvedFileName: resolved}
  }
  const program = ts.createProgram(
    [...sources.keys()],
    {noLib: true, allowJs: true, jsx: ts.JsxEmit.Preserve},
    {
      getSourceFile: (filename) => sources.get(filename),
      getDefaultLibFileName: () => '',
      writeFile() {
        throw new Error('Hook analysis must not emit files')
      },
      getCurrentDirectory: () => '/',
      getDirectories: () => [],
      fileExists: (filename) => sources.has(filename),
      readFile: (filename) => sources.get(filename)?.text,
      getCanonicalFileName: (filename) => filename,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      resolveModuleNames: (names, containing) =>
        names.map((name) => resolveImport(name, containing)),
    },
  )
  return {sources, checker: program.getTypeChecker()}
}

const getEntities = (sources, checker) =>
  [...sources.values()].flatMap((source) => {
    const declarations = source.statements.flatMap((statement) =>
      ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [statement],
    )
    return declarations
      .filter(
        (node) =>
          ts.isVariableDeclaration(node) ||
          ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          (ts.isExportAssignment(node) && !ts.isIdentifier(unwrap(node.expression))),
      )
      .map((node) => {
        const value = unwrap(
          node.initializer ?? (ts.isExportAssignment(node) ? node.expression : node),
        )
        return {
          node,
          source,
          value,
          symbol: node.name ? checker.getSymbolAtLocation(node.name) : undefined,
          callable:
            ts.isFunctionDeclaration(value) ||
            ts.isArrowFunction(value) ||
            ts.isFunctionExpression(value),
          dependencies: new Set(),
          calls: new Set(),
          hook: false,
          provider: false,
          rendering: false,
        }
      })
  })

const symbolOf = (checker, node) => {
  const symbol = checker.getSymbolAtLocation(node)
  // TypeScript represents symbol categories as bit flags.
  // eslint-disable-next-line no-bitwise
  if (symbol && (symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    const target = checker.getAliasedSymbol(symbol)
    return target.declarations ? target : symbol
  }
  return symbol
}

const importedApi = (checker, expression) => {
  const node = resolveValue(checker, expression)
  if (!node) {
    return null
  }
  const symbol = checker.getSymbolAtLocation(
    ts.isPropertyAccessExpression(node) ? node.expression : node,
  )
  const declaration = symbol?.declarations?.[0]
  if (declaration && ts.isImportSpecifier(declaration) && !declaration.isTypeOnly) {
    const clause = declaration.parent.parent
    if (!clause.isTypeOnly) {
      return {
        name: (declaration.propertyName ?? declaration.name).text,
        source: clause.parent.moduleSpecifier.text,
      }
    }
  }
  if (declaration && ts.isNamespaceImport(declaration) && ts.isPropertyAccessExpression(node)) {
    const clause = declaration.parent
    if (!clause.isTypeOnly) {
      return {name: node.name.text, source: clause.parent.moduleSpecifier.text}
    }
  }
  return null
}

const isSolidApi = (api, name) =>
  api?.name === name && (api.source === 'solid-js' || api.source === 'solid-js/store')

const resolveValue = (checker, expression, seen = new Set()) => {
  const node = unwrap(expression)
  if (!node || !ts.isIdentifier(node)) {
    return node
  }
  const symbol = symbolOf(checker, node)
  const declaration = symbol?.valueDeclaration
  if (
    !declaration ||
    !ts.isVariableDeclaration(declaration) ||
    !declaration.initializer ||
    seen.has(symbol)
  ) {
    return node
  }
  seen.add(symbol)
  return resolveValue(checker, declaration.initializer, seen)
}

const isProviderTag = (checker, expression) => {
  const tag = resolveValue(checker, expression)
  if (!tag || !ts.isPropertyAccessExpression(tag) || tag.name.text !== 'Provider') {
    return false
  }
  const context = resolveValue(checker, tag.expression)
  return (
    context &&
    ts.isCallExpression(context) &&
    isSolidApi(importedApi(checker, context.expression), 'createContext')
  )
}

const providerResult = (checker, expression) => {
  const node = resolveValue(checker, expression)
  if (!node) {
    return false
  }
  if (ts.isJsxElement(node)) {
    return isProviderTag(checker, node.openingElement.tagName)
  }
  if (ts.isJsxSelfClosingElement(node)) {
    return isProviderTag(checker, node.tagName)
  }
  if (ts.isConditionalExpression(node)) {
    return providerResult(checker, node.whenTrue) && providerResult(checker, node.whenFalse)
  }
  return false
}

const returns = (value) => {
  if (!value.body) {
    return []
  }
  if (!ts.isBlock(value.body)) {
    return [value.body]
  }
  const results = []
  const visit = (node) => {
    if (ts.isFunctionLike(node)) {
      return
    }
    if (ts.isReturnStatement(node)) {
      results.push(node.expression)
    }
    ts.forEachChild(node, visit)
  }
  ts.forEachChild(value.body, visit)
  return results
}

const inspectEntity = (entity, checker, bySymbol) => {
  let primitive = false
  let invalidJsx = false
  walk(entity.value, (node) => {
    if (ts.isIdentifier(node)) {
      const dependency = bySymbol.get(symbolOf(checker, node))
      if (dependency && dependency !== entity) {
        entity.dependencies.add(dependency)
      }
    }
    if (ts.isCallExpression(node)) {
      const dependency = bySymbol.get(symbolOf(checker, node.expression))
      if (dependency) {
        entity.calls.add(dependency)
      }
      const api = importedApi(checker, node.expression)
      if (api && hookApis.has(api.name) && isSolidApi(api, api.name)) {
        primitive = true
      }
      if (api?.name === 'createComponent' && api.source === 'solid-js/web') {
        entity.rendering = true
        invalidJsx = true
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      entity.rendering = true
      if (!isProviderTag(checker, node.tagName)) {
        invalidJsx = true
      }
    }
    if (ts.isJsxFragment(node)) {
      entity.rendering = true
    }
    if (ts.isJsxText(node) && node.text.trim() !== '') {
      invalidJsx = true
    }
  })
  const outputs = entity.callable ? returns(entity.value) : []
  entity.provider =
    entity.rendering &&
    !invalidJsx &&
    outputs.length > 0 &&
    outputs.every((output) => providerResult(checker, output))
  entity.hook = entity.callable && !entity.rendering && primitive
}

const reachable = (roots) => {
  const result = new Set()
  const visit = (entity) => {
    if (result.has(entity)) {
      return
    }
    result.add(entity)
    entity.dependencies.forEach(visit)
  }
  roots.forEach(visit)
  return result
}

/** Analyzes one topic from current source text and on-disk siblings without retaining stale lint state. */
export const analyzeTopic = (root, topic, filename, text) => {
  const paths = sourceFiles(root)
  if (!paths.includes(filename)) {
    paths.push(filename)
  }
  const files = paths.map((path) => [path, path === filename ? text : readFileSync(path, 'utf8')])
  const {sources, checker} = createAnalysis(files)
  const entities = getEntities(sources, checker)
  const bySymbol = new Map(
    entities.filter((entity) => entity.symbol).map((entity) => [entity.symbol, entity]),
  )
  entities.forEach((entity) => inspectEntity(entity, checker, bySymbol))
  let changed = true
  while (changed) {
    changed = false
    for (const entity of entities) {
      if (
        !entity.hook &&
        entity.callable &&
        !entity.rendering &&
        [...entity.calls].some((dependency) => dependency.hook)
      ) {
        entity.hook = true
        changed = true
      }
    }
  }
  const local = entities.filter((entity) => entity.source.fileName.startsWith(topic + sep))
  const hooks = local.filter((entity) => entity.hook)
  const hookDependencies = reachable(hooks)
  const providers = local.filter(
    (entity) =>
      entity.provider &&
      [...reachable([entity])].some((dependency) => hookDependencies.has(dependency)),
  )
  const used = reachable([...hooks, ...providers])
  const current = entities.filter((entity) => entity.source.fileName === filename)
  const problems = current.flatMap((entity) => {
    const reason =
      entity.rendering && !entity.provider ? 'component' : used.has(entity) ? null : 'unrelated'
    if (reason === null) {
      return []
    }
    const position = entity.source.getLineAndCharacterOfPosition(
      entity.node.getStart(entity.source),
    )
    return [{reason, line: position.line + 1, column: position.character}]
  })
  return {hasHook: hooks.length > 0, problems}
}
