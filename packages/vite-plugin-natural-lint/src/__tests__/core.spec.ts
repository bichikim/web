import {mkdtemp, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {resolveOptions} from '../config'
import {NaturalLintCore} from '../core'
import type {DecisionAnswers, NaturalLintRule} from '../types'

const temporaryPaths: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((filePath) => rm(filePath, {force: true, recursive: true})),
  )
})

const createFixture = async (
  answers: DecisionAnswers = {violation: {probability: 0.9, type: 'noul'}},
) => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-core-'))
  temporaryPaths.push(root)
  const close = vi.fn(async () => {})
  const decide = vi.fn(async () => answers)
  const create = vi.fn(async () => ({close, decide}))
  return {
    close,
    create,
    decide,
    providerFactory: {create, identifier: 'fixture', revision: '1'},
    root,
  }
}

const createRule = (overrides: Partial<NaturalLintRule> = {}): NaturalLintRule => ({
  id: 'filename',
  inspect: ({fileName}) => ({state: {fileName: fileName.stem}, status: 'unknown'}),
  message: 'Filename violates the rule.',
  questions: {violation: {instruction: 'Does the filename violate the rule?', type: 'noul'}},
  reduce: ({answers}) => {
    const answer = answers.violation
    if (answer?.type !== 'noul') {
      throw new TypeError('Violation answer must be noul.')
    }
    return {probability: answer.probability, status: 'fail'}
  },
  ...overrides,
})

describe('NaturalLintCore', () => {
  it('should reduce one batched provider decision', async () => {
    const answers = {violation: {probability: 0.94, type: 'noul' as const}}
    const fixture = await createFixture(answers)
    const reduce = vi.fn(() => ({probability: 0.94, reason: 'too-long', status: 'fail' as const}))
    const rule = createRule({
      inspect: () => ({reason: 'syntax-unknown', state: {name: 'fixture'}, status: 'unknown'}),
      reduce,
    })
    const core = new NaturalLintCore(
      resolveOptions({rules: [rule]}, fixture.root, {useCache: false}),
      fixture.providerFactory,
    )

    const report = await core.analyzeFile(
      path.join(fixture.root, 'src/fixture.ts'),
      'export const fixture = true',
    )

    expect(fixture.decide).toHaveBeenCalledWith({
      questions: rule.questions,
      ruleId: rule.id,
      state: {name: 'fixture'},
    })
    expect(reduce).toHaveBeenCalledWith({
      answers,
      reason: 'syntax-unknown',
      state: {name: 'fixture'},
    })
    expect(report.layaCalls).toBe(1)
    expect(report.outcomes[0]).toMatchObject({probability: 0.94, status: 'fail'})
  })

  it('should use an inspection decision without starting the provider', async () => {
    const fixture = await createFixture()
    const rule = createRule({inspect: () => ({reason: 'direct-alias', status: 'fail'})})
    const core = new NaturalLintCore(
      resolveOptions({rules: [rule]}, fixture.root),
      fixture.providerFactory,
    )

    const report = await core.analyzeFile(
      path.join(fixture.root, 'src/fixture.ts'),
      'export const fixture = true',
    )

    expect(report.outcomes[0]).toMatchObject({
      probability: 1,
      reason: 'direct-alias',
      status: 'fail',
    })
    expect(fixture.create).not.toHaveBeenCalled()
  })

  it('should default a missing selector to every file', async () => {
    const fixture = await createFixture()
    const rule = createRule({inspect: () => ({status: 'pass'})})
    const core = new NaturalLintCore(
      resolveOptions({rules: [rule]}, fixture.root),
      fixture.providerFactory,
    )

    const report = await core.analyzeFile(
      path.join(fixture.root, 'src/fixture.ts'),
      'export const fixture = true',
    )

    expect(report.outcomes[0]).toMatchObject({probability: 0, status: 'pass'})
  })

  it('should cache matching decisions and fingerprint changed rule functions', async () => {
    const fixture = await createFixture()
    const filePath = path.join(fixture.root, 'src/fixture.ts')
    const sourceText = 'export const fixture = true'
    const firstRule = createRule({inspect: () => ({state: {revision: 1}, status: 'unknown'})})
    const first = new NaturalLintCore(
      resolveOptions({rules: [firstRule]}, fixture.root),
      fixture.providerFactory,
    )
    await first.analyzeFile(filePath, sourceText)
    await first.close()

    const second = new NaturalLintCore(
      resolveOptions({rules: [firstRule]}, fixture.root),
      fixture.providerFactory,
    )
    const cached = await second.analyzeFile(filePath, sourceText)
    const changedRule = createRule({inspect: () => ({state: {revision: 2}, status: 'unknown'})})
    const changed = new NaturalLintCore(
      resolveOptions({rules: [changedRule]}, fixture.root),
      fixture.providerFactory,
    )
    const refreshed = await changed.analyzeFile(filePath, sourceText)

    expect(cached.cacheHits).toBe(1)
    expect(refreshed.cacheHits).toBe(0)
  })

  it('should reject invalid reducer probabilities', async () => {
    const fixture = await createFixture()
    const rule = createRule({reduce: () => ({probability: 2, status: 'fail'})})
    const core = new NaturalLintCore(
      resolveOptions({rules: [rule]}, fixture.root, {useCache: false}),
      fixture.providerFactory,
    )

    await expect(
      core.analyzeFile(path.join(fixture.root, 'src/fixture.ts'), 'export const fixture = true'),
    ).rejects.toThrow('invalid probability')
  })
})
