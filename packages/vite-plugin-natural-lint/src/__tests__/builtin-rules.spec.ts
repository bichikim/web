import {readdir, readFile} from 'node:fs/promises'
import path from 'node:path'
import {expect, it, vi} from 'vitest'
import {
  BUILTIN_RULE_PREFIX,
  createFileContext,
  NaturalLintCore,
  resolveOptions,
  UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT,
} from '../index'
import type {NaturalLintRule} from '../types'

const customRule: NaturalLintRule = {
  id: 'project/rule',
  inspect: () => ({state: null, status: 'unknown'}),
  message: 'Project rule.',
  questions: {violation: {instruction: 'Is this a violation?', type: 'noul'}},
  reduce: () => ({probability: 0, status: 'pass'}),
}

const inspectBuiltin = (sourceText: string) => {
  const options = resolveOptions(
    {rules: [UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT]},
    '/project',
  )
  return options.rules[0]?.inspect(
    createFileContext({filePath: '/project/src/example.ts', root: '/project', sourceText}),
  )
}

it('should inspect each catch separately with its function and local caller context', () => {
  const inspection = inspectBuiltin(`
    const loadFirst = () => { try { return readFirst() } catch { return null } }
    const loadSecond = () => { try { return readSecond() } catch { return null } }
    const result = loadFirst()
    if (result === null) reportFailure()
  `)

  expect(inspection).toMatchObject({status: 'group'})
  if (inspection?.status !== 'group') {
    throw new Error('Expected grouped inspection.')
  }
  expect(inspection.inspections).toHaveLength(2)
  expect(inspection.inspections[0]).toMatchObject({
    state: {
      catchSource: expect.stringContaining('return null'),
      enclosingFunction: expect.stringContaining('loadFirst'),
      localCaller: expect.stringContaining('result === null'),
      tryCalls: ['readFirst'],
    },
    status: 'unknown',
  })
  expect(inspection.inspections[1]).toMatchObject({
    state: {enclosingFunction: expect.stringContaining('loadSecond'), tryCalls: ['readSecond']},
    status: 'unknown',
  })
})

it('should provide the local contract and outer result when a catch is inside a nested callback', () => {
  const inspection = inspectBuiltin(`
    /** Reports unavailable calendars separately from returned events. */
    export const listEvents = async () => {
      let unavailableCalendars = 0
      const result = await paginate({
        loadPage: async () => {
          try { return await requestEvents() }
          catch { unavailableCalendars = 1; return {items: [], nextCursor: null} }
        },
      })
      return {events: result.items, unavailableCalendars}
    }
  `)

  expect(inspection).toMatchObject({
    state: {
      contract: expect.stringContaining('Reports unavailable calendars'),
      outerFunctionTail: expect.stringContaining(
        'return {events: result.items, unavailableCalendars}',
      ),
    },
    status: 'unknown',
  })
})

it('should show the external local caller instead of a recursive call', () => {
  const inspection = inspectBuiltin(`
    const processCandidates = async (index) => {
      try { return await operation(index) }
      catch { return processCandidates(index + 1) }
    }
    const result = await processCandidates(0)
    if (result.errors.length > 0) throw new AggregateError(result.errors)
  `)

  expect(inspection).toMatchObject({
    state: {localCaller: expect.stringContaining('result.errors.length > 0')},
    status: 'unknown',
  })
})

it('should ask for semantic review when a catch signals failure after a conditional return', () => {
  const inspection = inspectBuiltin(`
    export const enter = async () => {
      try { await requestFullscreen() }
      catch {
        if (disposed) return
        setError('enter-failed')
      }
    }
  `)

  expect(inspection).toMatchObject({
    state: {catchSource: expect.stringContaining("setError('enter-failed')")},
    status: 'unknown',
  })
})

it('should inspect a top-level catch without an enclosing function', () => {
  expect(inspectBuiltin('try { readValue() } catch { reportFailure() }')).toMatchObject({
    status: 'unknown',
  })
})

it('should recognize a failed status as an explicit failure result', () => {
  expect(
    inspectBuiltin(`
      const load = async () => {
        try { return {status: 'ready', value: await fetchValue()} }
        catch (error) { return {status: 'failed', error} }
      }
    `),
  ).toMatchObject({reason: 'explicit-failure-result', status: 'pass'})
})

it('should not infer an explicit failure from a status calculation mentioning failed', () => {
  expect(
    inspectBuiltin(`
      const load = async () => {
        try { return {status: 'ready', value: await fetchValue()} }
        catch (error) { return {status: getStatus('failed'), error: null} }
      }
    `),
  ).toMatchObject({status: 'unknown'})
})

it('should distinguish missing evidence from a decision below the confidence threshold', () => {
  const rule = resolveOptions({rules: [UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT]}, '/project')
    .rules[0]!
  const resultSemantics = {
    choice: 'successLike',
    confidence: 0.1,
    probabilities: {
      documentedFallback: 0.2,
      explicitFailure: 0.1,
      insufficient: 0.2,
      successLike: 0.5,
    },
    type: 'choice' as const,
  }
  const caughtScope = {
    choice: 'broad',
    confidence: 0.1,
    probabilities: {broad: 0.5, insufficient: 0.2, specific: 0.3},
    type: 'choice' as const,
  }

  expect(rule.reduce({answers: {caughtScope, resultSemantics}, state: null})).toMatchObject({
    reason: 'below-decision-threshold',
    status: 'uncertain',
  })
  expect(
    rule.reduce({
      answers: {caughtScope: {...caughtScope, choice: 'insufficient'}, resultSemantics},
      state: null,
    }),
  ).toMatchObject({reason: 'insufficient-evidence', status: 'uncertain'})
})

it('should resolve a built-in rule from its reserved identifier', () => {
  const options = resolveOptions(
    {rules: [UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT]},
    '/project',
  )

  expect(BUILTIN_RULE_PREFIX).toBe('@natural-lint/')
  expect(options.rules[0]).toMatchObject({
    id: UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT,
    severity: 'experiment',
    useCache: false,
  })
})

it('should pass a file without catch clauses without starting the provider', async () => {
  const root = '/project'
  const create = vi.fn(() => {
    throw new Error('Provider should not start for a file without catch clauses.')
  })
  const core = new NaturalLintCore(
    resolveOptions({rules: [UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT]}, root),
    {create, identifier: 'fixture', revision: '1'},
  )

  const report = await core.analyzeFile(
    path.join(root, 'src/example.ts'),
    'export const readValue = () => 1',
  )

  expect(report.modelCalls).toBe(0)
  expect(report.outcomes[0]).toMatchObject({reason: 'no-catch-clause', status: 'pass'})
  expect(create).not.toHaveBeenCalled()
})

it('should ask the model when a catch returns an unrecognized result', async () => {
  const root = '/project'
  const decide = vi.fn(async () => ({
    caughtScope: {
      choice: 'insufficient',
      confidence: 1,
      probabilities: {broad: 0, insufficient: 1, specific: 0},
      type: 'choice' as const,
    },
    resultSemantics: {
      choice: 'explicitFailure',
      confidence: 1,
      probabilities: {documentedFallback: 0, explicitFailure: 1, insufficient: 0, successLike: 0},
      type: 'choice' as const,
    },
  }))
  const create = vi.fn(async () => ({close: async () => {}, decide}))
  const core = new NaturalLintCore(
    resolveOptions({rules: [UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT]}, root),
    {create, identifier: 'fixture', revision: '1'},
  )

  const report = await core.analyzeFile(
    path.join(root, 'src/example.ts'),
    'export const readValue = () => { try { return read() } catch { return {status: "unknown"} } }',
  )

  expect(report.modelCalls).toBe(1)
  expect(report.outcomes[0]).toMatchObject({reason: 'explicit-failure-result', status: 'pass'})
  expect(create).toHaveBeenCalledOnce()
  expect(decide).toHaveBeenCalledOnce()
})

it('should pass a catch that unconditionally rethrows without starting the provider', async () => {
  const root = '/project'
  const create = vi.fn(() => {
    throw new Error('Provider should not start for an unconditional rethrow.')
  })
  const core = new NaturalLintCore(
    resolveOptions({rules: [UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT]}, root),
    {create, identifier: 'fixture', revision: '1'},
  )

  const report = await core.analyzeFile(
    path.join(root, 'src/example.ts'),
    'export const readValue = () => { try { return read() } catch (error) { throw error } }',
  )

  expect(report.modelCalls).toBe(0)
  expect(report.outcomes[0]).toMatchObject({reason: 'unconditional-rethrow', status: 'pass'})
  expect(create).not.toHaveBeenCalled()
})

it('should request semantic review when a catch can fall through without a return', () => {
  expect(
    inspectBuiltin(
      'export const readValue = () => { try { read() } catch (error) { log(error) } }',
    ),
  ).toMatchObject({reason: 'fallback-contract-needs-semantic-review', status: 'unknown'})
})

it('should apply supported tuple overrides without replacing built-in behavior', () => {
  const select = () => false
  const options = resolveOptions(
    {
      rules: [
        [
          UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT,
          {message: 'Project fallback policy.', select, severity: 'warn'},
        ],
      ],
    },
    '/project',
  )

  expect(options.rules[0]).toMatchObject({
    message: 'Project fallback policy.',
    select,
    severity: 'warn',
    useCache: true,
  })
  expect(options.rules[0]?.inspect).toBeTypeOf('function')
})

it('should incorporate rule-specific operation prefixes', () => {
  const options = resolveOptions(
    {
      rules: [
        [
          UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT,
          {options: {primaryOperationPrefixes: ['loadRemote']}},
        ],
      ],
    },
    '/project',
  )
  const sourceText = `
    declare const loadRemoteProfile: () => Promise<string>
    export const profile = async (): Promise<string | null> => {
      try { return await loadRemoteProfile() } catch { return null }
    }
  `
  const context = createFileContext({
    filePath: '/project/src/profile.ts',
    root: '/project',
    sourceText,
  })

  expect(options.rules[0]?.inspect(context)).toMatchObject({
    reason: 'primary-operation-failure-hidden',
    status: 'fail',
  })
})

it('should not let a compliant catch mask a failing catch', () => {
  expect(
    inspectBuiltin(`
      declare const fetchProfile: () => Promise<string>
      declare const fetchSettings: () => Promise<string>
      export const profile = async () => {
        try { return await fetchProfile() } catch { return {ok: false} }
      }
      export const settings = async () => {
        try { return await fetchSettings() } catch { return null }
      }
    `),
  ).toMatchObject({
    inspections: expect.arrayContaining([
      expect.objectContaining({reason: 'primary-operation-failure-hidden', status: 'fail'}),
    ]),
    status: 'group',
  })
})

it('should not combine a primary operation with an unrelated catch', () => {
  expect(
    inspectBuiltin(`
      declare const fetchProfile: () => Promise<string>
      export const profile = () => fetchProfile()
      export const parseValue = (source: string) => {
        try { return JSON.parse(source) } catch { return null }
      }
    `),
  ).toMatchObject({status: 'unknown'})
})

it('should not use another function documentation as a fallback contract', () => {
  expect(
    inspectBuiltin(`
      declare const fetchProfile: () => Promise<string>
      /** Best-effort optional theme lookup falls back when missing. */
      export const theme = () => undefined
      export const profile = async () => {
        try { return await fetchProfile() } catch { return null }
      }
    `),
  ).toMatchObject({reason: 'primary-operation-failure-hidden', status: 'fail'})
})

it('should not treat an error property containing null as an explicit failure', () => {
  expect(
    inspectBuiltin(`
      export const parseValue = (source: string) => {
        try { return JSON.parse(source) } catch { return {error: null} }
      }
    `),
  ).not.toMatchObject({reason: 'explicit-failure-result', status: 'pass'})
})

it('should not let a nested catch mask its enclosing failing catch', () => {
  expect(
    inspectBuiltin(`
      declare const fetchProfile: () => Promise<string>
      declare const recordFailure: () => void
      export const profile = async () => {
        try {
          return await fetchProfile()
        } catch {
          try { recordFailure() } catch { return {ok: false} }
          return null
        }
      }
    `),
  ).toMatchObject({
    inspections: expect.arrayContaining([
      expect.objectContaining({reason: 'primary-operation-failure-hidden', status: 'fail'}),
    ]),
    status: 'group',
  })
})

it('should preserve the measured holdout inspection boundary', async () => {
  const root = path.resolve(import.meta.dirname, '../../examples/ai-mistakes')
  const directory = path.join(root, 'fixtures/silent-fallback-holdout')
  const options = resolveOptions({rules: [UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT]}, root)
  const rule = options.rules[0]
  const statuses = await Promise.all(
    (await readdir(directory)).map(async (fileName) => {
      const filePath = path.join(directory, fileName)
      return rule?.inspect(
        createFileContext({filePath, root, sourceText: await readFile(filePath, 'utf8')}),
      ).status
    }),
  )

  expect(statuses.filter((status) => status === 'pass')).toHaveLength(5)
  expect(statuses.filter((status) => status === 'fail')).toHaveLength(4)
  expect(statuses.filter((status) => status === 'unknown')).toHaveLength(6)
})

it('should reject unknown built-in identifiers', () => {
  expect(() => resolveOptions({rules: ['@natural-lint/missing' as never]}, '/project')).toThrow(
    'Unknown built-in natural lint rule',
  )
})

it('should reserve the built-in prefix from custom rules', () => {
  expect(() =>
    resolveOptions({rules: [{...customRule, id: '@natural-lint/project-rule'}]}, '/project'),
  ).toThrow('is reserved for built-in rules')
})

it('should reject duplicate built-in identifiers', () => {
  expect(() =>
    resolveOptions(
      {
        rules: [
          UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT,
          UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT,
        ],
      },
      '/project',
    ),
  ).toThrow('rule ids must be unique')
})

it('should reject empty built-in operation prefixes', () => {
  expect(() =>
    resolveOptions(
      {
        rules: [
          [UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT, {options: {primaryOperationPrefixes: []}}],
        ],
      },
      '/project',
    ),
  ).toThrow('primaryOperationPrefixes requires at least one prefix')
})

it('should reject unsupported built-in overrides', () => {
  expect(() =>
    resolveOptions(
      {
        rules: [
          [
            UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT,
            {inspect: () => ({status: 'pass'})} as never,
          ],
        ],
      },
      '/project',
    ),
  ).toThrow('Built-in natural lint rule override does not support inspect')
})

it('should reject invalid built-in options at the runtime boundary', () => {
  expect(() =>
    resolveOptions(
      {
        rules: [
          [
            UNEXPECTED_ERROR_BECOMES_SUCCESS_LIKE_RESULT,
            {options: {primaryOperationPrefixes: [false]}} as never,
          ],
        ],
      },
      '/project',
    ),
  ).toThrow('primaryOperationPrefixes must contain non-empty prefixes')
})
