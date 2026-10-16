import type {CodeToken} from '../shared/contracts'
import {
  pythonAssignments,
  type PythonStatement,
  readPythonStatements,
} from './read-python-statements'

interface BindingState {
  readonly scope: number
  readonly bindings: ReadonlySet<number>
}
interface BindingIndex {
  readonly positions: ReadonlyMap<number, BindingState>
  readonly scopes: ReadonlyMap<number, number>
}
type Environment = Map<string, ReadonlySet<number>>
const merge = (states: readonly Environment[]): Environment =>
  new Map(
    states
      .flatMap((state) => [...state.keys()])
      .map((name) => [name, new Set(states.flatMap((state) => [...(state.get(name) ?? [])]))]),
  )
const imported = (tokens: readonly CodeToken[]): readonly CodeToken[] => {
  const start = tokens.findIndex((token) => token.text === 'import')
  if (start < 0) {
    return []
  }
  const names: CodeToken[] = []
  let group: CodeToken[] = []
  const flush = () => {
    const alias = group.findIndex((token) => token.text === 'as')
    const binding =
      alias < 0 ? group.find((token) => token.navigation === 'definition') : group[alias + 1]
    if (binding !== undefined) {
      names.push(binding)
    }
    group = []
  }
  for (const token of tokens.slice(start + 1)) {
    if (token.text === ',') {
      flush()
    } else {
      group.push(token)
    }
  }
  flush()
  return names
}
const readBindings = (source: string): BindingIndex => {
  const statements = readPythonStatements(source)
  const positions = new Map<number, BindingState>()
  const scopes = new Map<number, number>()
  const bind = (token: CodeToken, state: Environment, scope: number) => {
    state.set(token.text, new Set([token.offset]))
    scopes.set(token.offset, scope)
    positions.set(token.offset, {bindings: new Set([token.offset]), scope})
  }
  const record = (tokens: readonly CodeToken[], state: Environment, scope: number) =>
    tokens.forEach((token) => {
      if (token.navigation === 'definition') {
        const previous = positions.get(token.offset)
        positions.set(token.offset, {
          bindings: new Set([...(previous?.bindings ?? []), ...(state.get(token.text) ?? [])]),
          scope,
        })
      }
    })
  const endOfSuite = (start: number, end: number, indent: number) => {
    let cursor = start
    while (cursor < end && statements[cursor].indent > indent) {
      cursor += 1
    }
    return cursor
  }
  const conditional = (
    start: number,
    end: number,
    state: Environment,
    scope: number,
  ): {state: Environment; next: number} => {
    const {indent} = statements[start]
    const branches: Environment[] = []
    let possible = true
    let branch = start
    const nextBranch = (index: number): boolean =>
      index < end &&
      (index === start ||
        (statements[index].indent === indent &&
          ['elif', 'else'].includes(statements[index].tokens[0]?.text)))
    while (nextBranch(branch)) {
      const current = statements[branch]
      const heading = current.tokens[0]?.text
      const ending = endOfSuite(branch + 1, end, indent)
      const condition = current.tokens
        .slice(1, -1)
        .map((token) => token.text)
        .join('')
      const truth =
        heading === 'else' || condition === 'True'
          ? true
          : ['False', 'None', '0'].includes(condition)
            ? false
            : undefined
      record(current.tokens, state, scope)
      const result = suite(branch + 1, ending, new Map(state), scope)
      if (possible && truth !== false) {
        branches.push(result)
      }
      possible = possible && truth !== true
      branch = ending
    }
    if (possible) {
      branches.push(state)
    }
    return {next: branch, state: merge(branches)}
  }
  const suite = (start: number, end: number, initial: Environment, scope: number): Environment => {
    let state = new Map(initial)
    let cursor = start
    while (cursor < end) {
      const statement = statements[cursor]
      const {tokens, indent} = statement
      const keyword = tokens[0]?.text
      record(tokens, state, scope)
      const next = endOfSuite(cursor + 1, end, indent)
      if (
        keyword === 'def' ||
        keyword === 'class' ||
        (keyword === 'async' && tokens[1]?.text === 'def')
      ) {
        const declaration = tokens.find((token) => token.navigation === 'definition')
        if (declaration !== undefined) {
          bind(declaration, state, scope)
        }
        suite(cursor + 1, next, new Map(), statement.tokens[0].offset + 1)
        cursor = next
      } else if (keyword === 'if') {
        const {state: nextState, next: nextCursor} = conditional(cursor, end, state, scope)
        state = nextState
        cursor = nextCursor
      } else if (next > cursor + 1) {
        const result = suite(cursor + 1, next, new Map(state), scope)
        state = merge([state, result])
        cursor = next
      } else {
        const current = state
        const assignments = pythonAssignments(statement)
        assignments.forEach(({bindings}) =>
          bindings.forEach((binding) => bind(binding, current, scope)),
        )
        if (keyword === 'from' || keyword === 'import') {
          imported(tokens).forEach((token) => bind(token, current, scope))
        }
        cursor += 1
      }
    }
    return state
  }
  suite(0, statements.length, new Map(), 0)
  return {positions, scopes}
}
/** Retains same-scope uses of an alias's current assignment and preserves deferred or cross-scope uses. */
export const createPythonAliasValidator = () => {
  const documents = new Map<string, BindingIndex>()
  return (source: string, binding: number, target: number): boolean => {
    const index = documents.get(source) ?? readBindings(source)
    documents.set(source, index)
    const position = index.positions.get(target)
    const scope = index.scopes.get(binding)
    return (
      position === undefined ||
      scope === undefined ||
      position.scope !== scope ||
      position.bindings.has(binding)
    )
  }
}
