import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {afterEach, expect, it} from 'vitest'
import {resolveOptions} from '../config'
import {
  createPendingReviewCandidates,
  createReviewCandidates,
  createSourcePreview,
  createTrainingRecords,
  formatReviewCandidate,
  mergeReviewRecords,
  readReviewAnswers,
  readReviewRecords,
  writeReviewArtifacts,
} from '../review'
import type {ProjectAnalysisReport} from '../types'

const temporaryPaths: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((filePath) => rm(filePath, {force: true, recursive: true})),
  )
})

const createFixture = (root: string) => {
  const options = resolveOptions(
    {
      rules: [
        {
          id: 'filename',
          inspect: () => ({state: {filename: 'long-name'}, status: 'unknown'}),
          message: 'Use a shorter name.',
          questions: {violation: {instruction: 'Can this be shorter?', type: 'noul'}},
          reduce: () => ({probability: 0.9, status: 'fail'}),
          severity: 'experiment',
        },
      ],
    },
    root,
  )
  const report: ProjectAnalysisReport = {
    cacheHits: 0,
    diagnostics: [],
    experiments: [
      {
        abstainedExpectedFailures: 0,
        abstainedExpectedPasses: 0,
        accuracy: undefined,
        decisiveRate: 1,
        failed: 1,
        falseNegatives: 0,
        falsePositives: 0,
        observations: [
          {
            answers: {violation: {probability: 0.9, type: 'noul'}},
            probability: 0.9,
            relativePath: 'src/long-name.ts',
            state: {filename: 'long-name'},
            status: 'fail',
          },
        ],
        passed: 0,
        precision: undefined,
        recall: undefined,
        ruleId: 'filename',
        selected: 1,
        skipped: 0,
        uncertain: 0,
      },
    ],
    filesScanned: 1,
    layaCalls: 1,
    outcomes: [],
  }
  return {options, report}
}

it('should preserve review evidence and export only decisive human labels', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-review-'))
  temporaryPaths.push(root)
  const {options, report} = createFixture(root)
  const [candidate] = createReviewCandidates(report, options, {
    identifier: 'laya:test',
    revision: 'revision-1',
  })
  expect(candidate).toBeDefined()
  const records = mergeReviewRecords(
    [candidate!],
    [],
    new Map([['filename:src/long-name.ts', 'fail']]),
  )
  const [record] = records
  if (record === undefined) {
    throw new Error('Expected one review record.')
  }
  const holdout = {...record, relativePath: 'src/holdout.ts', split: 'holdout' as const}
  const reviewsPath = path.join(root, '.natural-lint/reviews.jsonl')
  const trainingPath = path.join(root, '.natural-lint/training.jsonl')
  await writeReviewArtifacts(reviewsPath, trainingPath, [...records, holdout])

  const training = await readFile(trainingPath, 'utf8')
  expect(JSON.parse(training)).toMatchObject({
    label: 'fail',
    labelSource: 'human',
    modelProbability: 0.9,
    providerRevision: 'revision-1',
    ruleId: 'filename',
    schemaVersion: 1,
    state: {filename: 'long-name'},
  })
  expect(training).not.toContain('src/holdout.ts')
})

it('should show the actual typed Laya answers without inventing a reason', () => {
  const root = '/project'
  const {options, report} = createFixture(root)
  const [candidate] = createReviewCandidates(report, options, {
    identifier: 'laya:test',
    revision: 'revision-1',
  })
  if (candidate === undefined) {
    throw new Error('Expected one review candidate.')
  }

  expect(formatReviewCandidate(candidate)).toContain('Can this be shorter?')
  expect(formatReviewCandidate(candidate)).toContain('probability=90.0%')
  expect(formatReviewCandidate(candidate)).not.toContain('Reason:')
})

it('should render a numbered bounded source preview', () => {
  const source = Array.from(
    {length: 82},
    (_, index) => `const value${index + 1} = ${index + 1}`,
  ).join('\n')
  const preview = createSourcePreview(source)

  expect(preview).toContain(' 1 │ const value1 = 1')
  expect(preview).toContain('80 │ const value80 = 80')
  expect(preview).not.toContain('value81')
  expect(preview).toContain('… 2 more lines')
})

it('should omit candidates already reviewed under the same rule fingerprint', () => {
  const root = '/project'
  const {options, report} = createFixture(root)
  const candidates = createReviewCandidates(report, options, {
    identifier: 'laya:test',
    revision: 'revision-1',
  })
  const [candidate] = candidates
  if (candidate === undefined) {
    throw new Error('Expected one review candidate.')
  }

  expect(createPendingReviewCandidates(candidates, [candidate])).toEqual([])
})

it('should review the same rule and path again after the provider revision changes', () => {
  const root = '/project'
  const {options, report} = createFixture(root)
  const reviewed = createReviewCandidates(report, options, {
    identifier: 'laya:test',
    revision: 'revision-1',
  })
  const current = createReviewCandidates(report, options, {
    identifier: 'laya:test',
    revision: 'revision-2',
  })

  expect(createPendingReviewCandidates(current, reviewed)).toEqual(current)
})

it('should review the same rule and path again after its model state changes', () => {
  const root = '/project'
  const {options, report} = createFixture(root)
  const reviewed = createReviewCandidates(report, options, {
    identifier: 'laya:test',
    revision: 'revision-1',
  })
  const current = reviewed.map((candidate) => ({
    ...candidate,
    state: {filename: 'different-name'},
  }))

  expect(createPendingReviewCandidates(current, reviewed)).toEqual(current)
})

it('should reject malformed persisted review records', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-review-'))
  temporaryPaths.push(root)
  const reviewsPath = path.join(root, 'reviews.jsonl')
  await writeFile(reviewsPath, `${JSON.stringify({label: 'wrong', schemaVersion: 1})}\n`)

  await expect(readReviewRecords(reviewsPath)).rejects.toThrow()
})

it('should preserve accepted model labels but omit them from training export', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-review-'))
  temporaryPaths.push(root)
  const {options, report} = createFixture(root)
  const candidates = createReviewCandidates(report, options, {
    identifier: 'laya:test',
    revision: 'revision-1',
  })
  const records = mergeReviewRecords(
    candidates,
    [],
    new Map([
      [
        'filename:src/long-name.ts',
        {label: 'fail' as const, labelSource: 'accepted-model' as const},
      ],
    ]),
  )
  const reviewsPath = path.join(root, 'reviews.jsonl')
  const trainingPath = path.join(root, 'training.jsonl')
  await writeReviewArtifacts(reviewsPath, trainingPath, records)

  expect(await readFile(reviewsPath, 'utf8')).toContain('"labelSource":"accepted-model"')
  expect(await readFile(trainingPath, 'utf8')).toBe('\n')
})

it('should deduplicate training cases and protect a holdout across provider revisions', () => {
  const root = '/project'
  const {options, report} = createFixture(root)
  const [first] = createReviewCandidates(report, options, {
    identifier: 'laya:test',
    revision: 'revision-1',
  })
  if (first === undefined) {
    throw new Error('Expected one review candidate.')
  }
  const records = [
    {...first, label: 'fail' as const, labelSource: 'human' as const, schemaVersion: 1 as const},
    {
      ...first,
      label: 'fail' as const,
      labelSource: 'human' as const,
      providerRevision: 'revision-2',
      schemaVersion: 1 as const,
      split: 'holdout' as const,
    },
  ]

  expect(createTrainingRecords(records)).toEqual([])
})

it('should load non-interactive labels and omit uncertain reviews from training export', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-review-'))
  temporaryPaths.push(root)
  await mkdir(path.join(root, 'input'))
  const answersPath = path.join(root, 'input/answers.jsonl')
  await writeFile(
    answersPath,
    `${JSON.stringify({label: 'uncertain', relativePath: 'src/long-name.ts', ruleId: 'filename'})}\n`,
  )
  const labels = await readReviewAnswers(answersPath)
  const {options, report} = createFixture(root)
  const candidates = createReviewCandidates(report, options, {
    identifier: 'laya:test',
    revision: 'revision-1',
  })
  const records = mergeReviewRecords(candidates, [], labels)
  const reviewsPath = path.join(root, 'reviews.jsonl')
  const trainingPath = path.join(root, 'training.jsonl')
  await writeReviewArtifacts(reviewsPath, trainingPath, records)

  expect(await readFile(reviewsPath, 'utf8')).toContain('"label":"uncertain"')
  expect(await readFile(trainingPath, 'utf8')).toBe('\n')
})

it('should load an accepted uncertain model verdict from an answers file', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-review-'))
  temporaryPaths.push(root)
  const answersPath = path.join(root, 'answers.jsonl')
  const answer = {
    label: 'uncertain',
    labelSource: 'accepted-model',
    relativePath: 'src/file.ts',
    ruleId: 'filename',
  }
  await writeFile(answersPath, `${JSON.stringify(answer)}\n`)

  const labels = await readReviewAnswers(answersPath)
  expect(labels.get('filename:src/file.ts')).toEqual({
    label: 'uncertain',
    labelSource: 'accepted-model',
  })
})

it('should reject accepting skip as a model verdict from an answers file', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'natural-lint-review-'))
  temporaryPaths.push(root)
  const answersPath = path.join(root, 'answers.jsonl')
  await writeFile(
    answersPath,
    `${JSON.stringify({
      label: 'skip',
      labelSource: 'accepted-model',
      relativePath: 'src/file.ts',
      ruleId: 'filename',
    })}\n`,
  )

  await expect(readReviewAnswers(answersPath)).rejects.toThrow(
    'accepted-model labels cannot be skip',
  )
})
