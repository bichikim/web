import {readdir, readFile} from 'node:fs/promises'
import path from 'node:path'
import {expect, it} from 'vitest'
import {
  BUILTIN_RULE_PREFIX,
  createFileContext,
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
  ).toMatchObject({reason: 'primary-operation-failure-hidden', status: 'fail'})
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
  ).toMatchObject({reason: 'primary-operation-failure-hidden', status: 'fail'})
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
