import {readdir, readFile} from 'node:fs/promises'
import path from 'node:path'
import {expect, it} from 'vitest'
import {resolveOptions} from '../config'
import {createFileContext} from '../file-context'
import type {NaturalLintOptions} from '../types'

it('should reserve semantic review for undocumented silent fallback contracts', async () => {
  // The JavaScript example is executed as published instead of duplicating its rule in the test.
  const {default: config} =
    (await import('../../examples/ai-mistakes/natural-lint.config.mjs')) as {
      default: NaturalLintOptions
    }
  const root = path.resolve(import.meta.dirname, '../../examples/ai-mistakes')
  const directory = path.join(root, 'fixtures/silent-fallback')
  const rule = resolveOptions(config, root).rules.find(
    ({id}) => id === '@natural-lint/unexpected-error-becomes-success-like-result',
  )
  if (rule === undefined || rule.expected === undefined) {
    throw new Error('Expected the silent fallback experiment rule.')
  }

  const results = await Promise.all(
    (await readdir(directory)).map(async (fileName) => {
      const filePath = path.join(directory, fileName)
      const context = createFileContext({
        filePath,
        root,
        sourceText: await readFile(filePath, 'utf8'),
      })
      return {expected: rule.expected?.(context), inspection: rule.inspect(context)}
    }),
  )

  expect(results).toHaveLength(18)
  expect(results.filter(({expected}) => expected === 'pass')).toHaveLength(6)
  expect(results.filter(({expected}) => expected === 'fail')).toHaveLength(6)
  expect(results.filter(({expected}) => expected === 'uncertain')).toHaveLength(6)
  expect(
    results.filter(({expected, inspection}) => expected === 'pass' && inspection.status === 'pass'),
  ).toHaveLength(6)
  expect(
    results.filter(({expected, inspection}) => expected === 'fail' && inspection.status === 'fail'),
  ).toHaveLength(4)
  expect(
    results.filter(
      ({expected, inspection}) => expected === 'fail' && inspection.status === 'unknown',
    ),
  ).toHaveLength(2)
  expect(
    results.filter(
      ({expected, inspection}) => expected === 'uncertain' && inspection.status === 'unknown',
    ),
  ).toHaveLength(6)
})

it('should keep the silent fallback holdout balanced and independently labeled', async () => {
  const {default: config} =
    (await import('../../examples/ai-mistakes/natural-lint.config.mjs')) as {
      default: NaturalLintOptions
    }
  const root = path.resolve(import.meta.dirname, '../../examples/ai-mistakes')
  const directory = path.join(root, 'fixtures/silent-fallback-holdout')
  const rule = resolveOptions(config, root).rules.find(
    ({id}) => id === '@natural-lint/unexpected-error-becomes-success-like-result',
  )
  if (rule === undefined || rule.expected === undefined) {
    throw new Error('Expected the silent fallback holdout rule.')
  }

  const expectedStatuses = await Promise.all(
    (await readdir(directory)).map(async (fileName) => {
      const filePath = path.join(directory, fileName)
      const context = createFileContext({
        filePath,
        root,
        sourceText: await readFile(filePath, 'utf8'),
      })
      expect(rule.select?.(context)).toBe(true)
      return rule.expected?.(context)
    }),
  )

  expect(expectedStatuses).toHaveLength(15)
  expect(expectedStatuses.filter((status) => status === 'pass')).toHaveLength(5)
  expect(expectedStatuses.filter((status) => status === 'fail')).toHaveLength(5)
  expect(expectedStatuses.filter((status) => status === 'uncertain')).toHaveLength(5)
})

it('should extract explicit failure contracts and defer undocumented fallbacks', async () => {
  const {default: config} =
    (await import('../../examples/ai-mistakes/natural-lint.config.mjs')) as {
      default: NaturalLintOptions
    }
  const root = path.resolve(import.meta.dirname, '../../examples/ai-mistakes')
  const directory = path.join(root, 'fixtures/silent-fallback-development')
  const rule = resolveOptions(config, root).rules.find(
    ({id}) => id === '@natural-lint/unexpected-error-becomes-success-like-result',
  )
  if (rule === undefined || rule.expected === undefined) {
    throw new Error('Expected the silent fallback development rule.')
  }

  const results = await Promise.all(
    (await readdir(directory)).map(async (fileName) => {
      const filePath = path.join(directory, fileName)
      const context = createFileContext({
        filePath,
        root,
        sourceText: await readFile(filePath, 'utf8'),
      })
      return {expected: rule.expected?.(context), inspection: rule.inspect(context)}
    }),
  )

  expect(results).toHaveLength(8)
  for (const {expected, inspection} of results) {
    expect(inspection.status).toBe(expected === 'uncertain' ? 'unknown' : expected)
  }
})
