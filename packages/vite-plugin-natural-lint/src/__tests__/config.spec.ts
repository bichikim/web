import {expect, it} from 'vitest'
import {
  DEFAULT_MODEL,
  DEFAULT_MODEL_REVISION,
  DEFAULT_ONNX_MODEL_REVISION,
  resolveOptions,
} from '../config'
import type {NaturalLintRule} from '../types'

const rule: NaturalLintRule = {
  id: 'filename',
  inspect: () => ({state: {fileName: 'fixture'}, status: 'unknown'}),
  message: '파일 이름이 불필요하게 길다.',
  questions: {violation: {instruction: 'Can the filename be shorter?', type: 'noul'}},
  reduce: () => ({probability: 0.9, status: 'fail'}),
}

it('should resolve runtime, cache, and rule defaults', () => {
  const options = resolveOptions({rules: [rule]}, '/project')

  expect(options.provider).toBe('laya')
  expect(options.jev.concurrency).toBe(4)

  expect(options.laya).toMatchObject({
    backend: 'auto',
    instances: 1,
    model: DEFAULT_MODEL,
    modelRevision: DEFAULT_MODEL_REVISION,
  })
  expect(options.laya.coreml).toEqual({
    runtime: 'managed',
    runtimeDir: '/project/node_modules/.cache/natural-lint/coreml',
  })
  expect(options.laya.onnx.modelRevision).toBe(DEFAULT_ONNX_MODEL_REVISION)
  expect(options.cacheDir).toBe('/project/node_modules/.cache/natural-lint/v1')
  expect(options.rules[0]).toMatchObject({severity: 'error', useCache: true})
  expect(options.rules[0]?.select(undefined as never)).toBe(true)
})

it('should select Jev with its default hosted model without accepting a key in config', () => {
  const options = resolveOptions({jev: {}, provider: 'jev', rules: [rule]}, '/project')

  expect(options.provider).toBe('jev')
  expect(options.jev.model).toBe('jev-latest')
  expect(() =>
    resolveOptions(
      {jev: {apiKey: 'must-not-be-configured'} as never, provider: 'jev', rules: [rule]},
      '/project',
    ),
  ).toThrow('Unrecognized key')
})

it('should accept a positive Jev request concurrency limit', () => {
  expect(
    resolveOptions({jev: {concurrency: 2}, provider: 'jev', rules: [rule]}, '/project').jev
      .concurrency,
  ).toBe(2)
  expect(() =>
    resolveOptions({jev: {concurrency: 0}, provider: 'jev', rules: [rule]}, '/project'),
  ).toThrow()
  expect(() =>
    resolveOptions({jev: {concurrency: 1.5}, provider: 'jev', rules: [rule]}, '/project'),
  ).toThrow()
})

it('should accept a positive integer model instance count', () => {
  expect(resolveOptions({laya: {instances: 2}, rules: [rule]}, '/project').laya.instances).toBe(2)
  expect(() => resolveOptions({laya: {instances: 0}, rules: [rule]}, '/project')).toThrow()
  expect(() => resolveOptions({laya: {instances: 1.5}, rules: [rule]}, '/project')).toThrow()
})

it('should resolve an external CoreML runtime without changing the configured Python', () => {
  const options = resolveOptions(
    {
      laya: {
        coreml: {runtime: 'external', runtimeDir: '.cache/coreml'},
        pythonPath: '/opt/laya/bin/python',
      },
      rules: [rule],
    },
    '/project',
  )

  expect(options.laya.coreml).toEqual({
    runtime: 'external',
    runtimeDir: '/project/.cache/coreml',
  })
  expect(options.laya.pythonPath).toBe('/opt/laya/bin/python')
})

it('should reject duplicate rule identifiers', () => {
  expect(() => resolveOptions({rules: [rule, {...rule}]}, '/project')).toThrow(
    'rule ids must be unique',
  )
})

it('should resolve separate file targets and their rules', () => {
  const otherRule = {...rule, id: 'other'}
  const options = resolveOptions(
    {
      targets: [
        {include: ['src/first/**/*.ts'], rules: [rule]},
        {include: ['src/second/**/*.ts'], rules: [otherRule]},
      ],
    },
    '/project',
  )

  expect(options.include).toEqual(['src/first/**/*.ts', 'src/second/**/*.ts'])
  expect(options.rules.map(({id}) => id)).toEqual(['filename', 'other'])
  expect(options.rules[0]?.matchesFile('/project/src/first/example.ts')).toBe(true)
  expect(options.rules[0]?.matchesFile('/project/src/second/example.ts')).toBe(false)
  expect(options.rules[1]?.matchesFile('/project/src/first/example.ts')).toBe(false)
  expect(options.rules[1]?.matchesFile('/project/src/second/example.ts')).toBe(true)
})

it('should keep global rules limited to the global include when targets overlap', () => {
  const options = resolveOptions(
    {
      include: ['src/common/**/*.ts'],
      rules: [rule],
      targets: [{include: ['src/features/**/*.ts'], rules: [{...rule, id: 'feature'}]}],
    },
    '/project',
  )

  expect(options.rules[0]?.matchesFile('/project/src/features/example.ts')).toBe(false)
  expect(options.rules[1]?.matchesFile('/project/src/common/example.ts')).toBe(false)
})

it('should reject duplicate rule identifiers across targets', () => {
  expect(() =>
    resolveOptions(
      {
        targets: [
          {include: ['src/first/**'], rules: [rule]},
          {include: ['src/second/**'], rules: [rule]},
        ],
      },
      '/project',
    ),
  ).toThrow('rule ids must be unique')
})

it('should reject empty target rules and empty target patterns', () => {
  expect(() => resolveOptions({targets: [{include: ['src/**'], rules: []}]}, '/project')).toThrow(
    'at least one rule',
  )
  expect(() => resolveOptions({targets: [{include: [], rules: [rule]}]}, '/project')).toThrow()
})

it('should resolve local ONNX directories from the project root', () => {
  const options = resolveOptions(
    {
      laya: {
        backend: 'onnx',
        onnx: {cacheDir: '.cache/laya', modelDir: 'models/laya', modelRevision: 'local-v1'},
      },
      rules: [rule],
    },
    '/project',
  )

  expect(options.laya.onnx.cacheDir).toBe('/project/.cache/laya')
  expect(options.laya.onnx.modelDir).toBe('/project/models/laya')
  expect(options.laya.onnx.modelRevision).toBe('local-v1')
})

it('should require a revision for a local ONNX model directory', () => {
  expect(() =>
    resolveOptions(
      {laya: {backend: 'onnx', onnx: {modelDir: 'models/laya'}}, rules: [rule]},
      '/project',
    ),
  ).toThrow('modelRevision is required')
})

it('should disable cache for an experiment rule', () => {
  const options = resolveOptions({rules: [{...rule, severity: 'experiment'}]}, '/project')

  expect(options.rules[0]).toMatchObject({severity: 'experiment', useCache: false})
})

it('should retain expected results for an experiment rule', () => {
  const expected = () => 'fail' as const
  const options = resolveOptions({rules: [{...rule, expected, severity: 'experiment'}]}, '/project')

  expect(options.rules[0]).toMatchObject({expected})
})

it('should reject expected results on an enforcing rule', () => {
  expect(() => resolveOptions({rules: [{...rule, expected: () => 'pass'}]}, '/project')).toThrow(
    'expected is only available when severity is experiment',
  )
})

it('should reject empty cache keys', () => {
  expect(() => resolveOptions({rules: [{...rule, cacheKey: ''}]}, '/project')).toThrow(
    'cacheKey must not be empty',
  )
})

it('should reject a rule without typed questions', () => {
  expect(() => resolveOptions({rules: [{...rule, questions: {}}]}, '/project')).toThrow(
    'requires at least one question',
  )
})

it('should reject unknown top-level JavaScript configuration keys', () => {
  expect(() => resolveOptions({buildMod: 'warn', rules: [rule]} as never, '/project')).toThrow(
    'Unrecognized key',
  )
})

it('should reject unknown nested JavaScript configuration keys', () => {
  expect(() =>
    resolveOptions(
      {laya: {coreml: {runtime: 'managed', runtimeDri: '.cache'}} as never, rules: [rule]},
      '/project',
    ),
  ).toThrow('Unrecognized key')
})
