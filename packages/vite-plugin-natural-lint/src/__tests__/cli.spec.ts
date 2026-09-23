import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {afterEach, expect, it, vi} from 'vitest'
import {runCliWithOptions, runEvaluationCli} from '../cli'
import type {DecisionProviderFactory} from '../types'

const temporaryPaths: string[] = []

const createRule = (severity: 'error' | 'experiment' = 'error') => ({
  id: 'filename',
  inspect: ({fileName}: {fileName: {stem: string}}) => ({
    state: {fileName: fileName.stem},
    status: 'unknown' as const,
  }),
  message: '파일 이름이 불필요하게 길다.',
  questions: {violation: {instruction: 'Can the filename be shorter?', type: 'noul' as const}},
  reduce: ({answers}: {answers: {violation?: {probability: number}}}) => ({
    probability: answers.violation?.probability ?? 0.5,
    status: 'fail' as const,
  }),
  severity,
})

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(
    temporaryPaths.splice(0).map((filePath) => rm(filePath, {force: true, recursive: true})),
  )
})

it('should scan configured files and return a failing status for a Laya violation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-cli-'))
  temporaryPaths.push(root)
  await mkdir(path.join(root, 'src'))
  await writeFile(
    path.join(root, 'src/authenticated-user-profile-form.ts'),
    'export function UserProfileForm() {}',
  )
  const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  const providerFactory: DecisionProviderFactory = {
    async create() {
      return {
        async close() {},
        async decide() {
          return {violation: {probability: 0.94, type: 'noul'}}
        },
      }
    },
    identifier: 'test',
    revision: '1',
  }

  const exitCode = await runCliWithOptions(
    {command: 'check', configPath: '', json: true, useCache: true},
    {
      rules: [createRule()],
    },
    root,
    providerFactory,
  )

  expect(exitCode).toBe(1)
  expect(output).toHaveBeenCalledWith(expect.stringContaining('authenticated-user-profile-form.ts'))
  expect(output).toHaveBeenCalledWith(expect.stringContaining('"layaCalls": 1'))
})

it('should report experiment results without failing the command', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-cli-'))
  temporaryPaths.push(root)
  await mkdir(path.join(root, 'src'))
  await writeFile(path.join(root, 'src/user-profile-controller.ts'), 'export const profile = true')
  const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  const providerFactory: DecisionProviderFactory = {
    async create() {
      return {
        async close() {},
        async decide() {
          return {violation: {probability: 0.91, type: 'noul'}}
        },
      }
    },
    identifier: 'test',
    revision: '1',
  }

  const exitCode = await runCliWithOptions(
    {command: 'check', configPath: '', json: false, useCache: true},
    {
      rules: [{...createRule('experiment'), id: 'filename-experiment'}],
    },
    root,
    providerFactory,
  )

  expect(exitCode).toBe(0)
  expect(output).toHaveBeenCalledWith(expect.stringContaining('Experiment filename-experiment'))
  expect(output).toHaveBeenCalledWith(expect.stringContaining('src/user-profile-controller.ts'))
})

it('should create review and training JSONL from labels', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-cli-'))
  temporaryPaths.push(root)
  await mkdir(path.join(root, 'src'))
  await writeFile(path.join(root, 'src/user-profile-controller.ts'), 'export const profile = true')
  const reviewAnswer = {
    label: 'fail',
    relativePath: 'src/user-profile-controller.ts',
    ruleId: 'filename-experiment',
  }
  await writeFile(path.join(root, 'answers.jsonl'), `${JSON.stringify(reviewAnswer)}\n`)
  const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  const providerFactory: DecisionProviderFactory = {
    async create() {
      return {
        async close() {},
        async decide() {
          return {violation: {probability: 0.91, type: 'noul'}}
        },
      }
    },
    identifier: 'test',
    revision: '1',
  }

  const exitCode = await runCliWithOptions(
    {
      answersPath: 'answers.jsonl',
      command: 'review',
      configPath: '',
      json: true,
      useCache: false,
    },
    {rules: [{...createRule('experiment'), id: 'filename-experiment'}]},
    root,
    providerFactory,
  )

  expect(exitCode).toBe(0)
  expect(output).toHaveBeenCalledWith(expect.stringContaining('"exported": 1'))
  expect(await readFile(path.join(root, '.natural-lint/training.jsonl'), 'utf8')).toContain(
    '"label":"fail"',
  )
})

it('should reject a shared path for the review ledger and training export', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-cli-'))
  temporaryPaths.push(root)
  await mkdir(path.join(root, 'src'))
  await writeFile(path.join(root, 'src/user-profile-controller.ts'), 'export const profile = true')
  const providerFactory: DecisionProviderFactory = {
    async create() {
      return {
        async close() {},
        async decide() {
          return {violation: {probability: 0.91, type: 'noul'}}
        },
      }
    },
    identifier: 'test',
    revision: '1',
  }

  await expect(
    runCliWithOptions(
      {
        command: 'review',
        configPath: '',
        exportPath: 'reviews.jsonl',
        json: true,
        reviewsPath: 'reviews.jsonl',
        useCache: false,
      },
      {rules: [{...createRule('experiment'), id: 'filename-experiment'}]},
      root,
      providerFactory,
    ),
  ).rejects.toThrow('must be different')
})

it('should evaluate saved reviews without loading a lint configuration', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-cli-'))
  temporaryPaths.push(root)
  await mkdir(path.join(root, '.natural-lint'))
  const record = {
    answers: {violation: {probability: 0.9, type: 'noul'}},
    label: 'fail',
    modelProbability: 0.9,
    observedStatus: 'fail',
    providerIdentifier: 'laya:coreml',
    providerRevision: 'model-1',
    questions: {violation: {instruction: 'Violation?', type: 'noul'}},
    relativePath: 'src/example.ts',
    ruleFingerprint: 'rule-1',
    ruleId: 'filename',
    schemaVersion: 1,
    state: {filename: 'example'},
  }
  await writeFile(path.join(root, '.natural-lint/reviews.jsonl'), `${JSON.stringify(record)}\n`)
  const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

  const exitCode = await runEvaluationCli(
    {command: 'evaluate', configPath: '', json: false, useCache: false},
    root,
  )

  expect(exitCode).toBe(0)
  expect(output).toHaveBeenCalledWith(expect.stringContaining('Training readiness: not ready'))
})
