import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {generateQuestions, resolveQuestionModel} from '../../adapters/questions'
import {approveKnowledgeEvaluation, generateKnowledgeEvaluation} from '../generation'
import {loadGenerationSource} from '../runtime'

vi.mock('../../adapters/questions', () => ({
  generateQuestions: vi.fn(),
  resolveQuestionModel: vi.fn(),
}))
vi.mock('../runtime', async () => {
  const actual = await vi.importActual<typeof import('../runtime')>('../runtime')
  return {...actual, loadGenerationSource: vi.fn()}
})
let directory: string
const model = {digest: 'a'.repeat(64), name: 'test:latest'}
const source = {
  ollamaUrl: 'http://localhost:11434',
  points: [
    {
      payload: {
        contentHash: `sha256:${'b'.repeat(64)}`,
        docId: 'auth',
        path: 'auth.md',
        relations: [],
        repoId: 'repo',
        status: 'active',
        tags: [],
        text: 'Refresh once.',
        title: 'Auth',
        type: 'rule',
        unitId: 'refresh',
        workspaceId: 'main',
      },
      pointId: 'one',
    },
  ],
  repoId: 'repo',
  workspaceId: 'main',
} as const
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'knowledge-generation-test-'))
  vi.mocked(loadGenerationSource).mockResolvedValue(source)
  vi.mocked(resolveQuestionModel).mockResolvedValue({ok: true, value: model})
  vi.mocked(generateQuestions).mockResolvedValue({
    ok: true,
    value: {en: 'When should a token refresh?', ko: '토큰은 언제 갱신하나?'},
  })
})
afterEach(async () => {
  vi.resetAllMocks()
  await rm(directory, {force: true, recursive: true})
})
const options = () => ({
  cacheDirectory: join(directory, 'cache'),
  inputPath: '/repo',
  limit: 10,
  model: 'test',
  outputPath: join(directory, 'candidates.json'),
})

describe('generateKnowledgeEvaluation', () => {
  it('should regenerate changed content and skip non-active units', async () => {
    await generateKnowledgeEvaluation(options())
    vi.mocked(loadGenerationSource).mockResolvedValue({
      ...source,
      points: [
        {
          ...source.points[0],
          payload: {
            ...source.points[0].payload,
            contentHash: `sha256:${'d'.repeat(64)}`,
            text: 'Changed policy.',
          },
        },
        {
          ...source.points[0],
          payload: {...source.points[0].payload, status: 'deprecated'},
          pointId: 'old',
        },
      ],
    })
    expect(
      await generateKnowledgeEvaluation({
        ...options(),
        outputPath: join(directory, 'changed-source.json'),
      }),
    ).toMatchObject({cached: 0, cases: 2, generated: 1})
    expect(generateQuestions).toHaveBeenCalledTimes(2)
  })
  it('should retain completed unit cache after a later failure and resume without regenerating it', async () => {
    vi.mocked(loadGenerationSource).mockResolvedValue({
      ...source,
      points: [
        ...source.points,
        {
          ...source.points[0],
          payload: {...source.points[0].payload, docId: 'payment'},
          pointId: 'two',
        },
      ],
    })
    vi.mocked(generateQuestions)
      .mockResolvedValueOnce({
        ok: true,
        value: {en: 'When should a token refresh?', ko: '토큰은 언제 갱신하나?'},
      })
      .mockResolvedValueOnce({error: {code: 'question-generation-failed'}, ok: false})
    await expect(generateKnowledgeEvaluation(options())).rejects.toBeDefined()
    await expect(readFile(options().outputPath)).rejects.toMatchObject({code: 'ENOENT'})
    expect(await generateKnowledgeEvaluation(options())).toMatchObject({
      cached: 1,
      cases: 4,
      generated: 1,
    })
    expect(generateQuestions).toHaveBeenCalledTimes(3)
  })
  it('should reject empty scopes and missing models without generation or candidate files', async () => {
    vi.mocked(loadGenerationSource).mockResolvedValueOnce({...source, points: []})
    await expect(generateKnowledgeEvaluation(options())).rejects.toMatchObject({
      result: {error: {code: 'invalid-generation-source'}},
    })
    vi.mocked(resolveQuestionModel).mockResolvedValueOnce({
      error: {code: 'question-model-unavailable'},
      ok: false,
    })
    await expect(generateKnowledgeEvaluation(options())).rejects.toMatchObject({
      result: {error: {code: 'question-model-unavailable'}},
    })
    expect(generateQuestions).not.toHaveBeenCalled()
  })
  it('should cache repeated generation and invalidate a changed model digest', async () => {
    expect(await generateKnowledgeEvaluation(options())).toMatchObject({cached: 0, generated: 1})
    const original = await readFile(options().outputPath, 'utf8')
    expect(JSON.parse(original)).toMatchObject({kind: 'candidate'})
    expect(
      await generateKnowledgeEvaluation({...options(), outputPath: join(directory, 'again.json')}),
    ).toMatchObject({cached: 1, generated: 0})
    expect(generateQuestions).toHaveBeenCalledTimes(1)
    vi.mocked(resolveQuestionModel).mockResolvedValue({
      ok: true,
      value: {...model, digest: 'c'.repeat(64)},
    })
    expect(
      await generateKnowledgeEvaluation({
        ...options(),
        outputPath: join(directory, 'changed.json'),
      }),
    ).toMatchObject({cached: 0, generated: 1})
    expect(generateQuestions).toHaveBeenCalledTimes(2)
  })
  it('should reject overwriting output and publish no file on a generation failure', async () => {
    await writeFile(options().outputPath, 'existing')
    await expect(generateKnowledgeEvaluation(options())).rejects.toBeDefined()
    expect(await readFile(options().outputPath, 'utf8')).toBe('existing')
    expect(generateQuestions).not.toHaveBeenCalled()
    vi.mocked(generateQuestions).mockResolvedValue({
      error: {code: 'question-generation-failed'},
      ok: false,
    })
    const outputPath = join(directory, 'failed.json')
    await expect(generateKnowledgeEvaluation({...options(), outputPath})).rejects.toBeDefined()
    await expect(readFile(outputPath)).rejects.toMatchObject({code: 'ENOENT'})
  })
  it('should reject corrupt cached questions rather than approve or reuse them', async () => {
    await generateKnowledgeEvaluation(options())
    const file = JSON.parse(await readFile(options().outputPath, 'utf8'))
    await writeFile(join(options().cacheDirectory, `${file.cases[0].cacheKey}.json`), '{}')
    await expect(
      generateKnowledgeEvaluation({...options(), outputPath: join(directory, 'failed.json')}),
    ).rejects.toBeDefined()
    expect(generateQuestions).toHaveBeenCalledTimes(1)
  })
})
describe('approveKnowledgeEvaluation', () => {
  it('should leave output absent when a selected candidate ID is unknown', async () => {
    await generateKnowledgeEvaluation(options())
    const outputPath = join(directory, 'golden.json')
    await expect(
      approveKnowledgeEvaluation({
        candidatePath: options().outputPath,
        ids: ['missing'],
        outputPath,
        reviewer: 'fixture',
      }),
    ).rejects.toMatchObject({result: {error: {code: 'invalid-evaluation-approval'}}})
    await expect(readFile(outputPath)).rejects.toMatchObject({code: 'ENOENT'})
  })
  it('should approve only explicitly selected fixture cases without contacting a model', async () => {
    await generateKnowledgeEvaluation(options())
    const file = JSON.parse(await readFile(options().outputPath, 'utf8'))
    vi.mocked(generateQuestions).mockClear()
    const outputPath = join(directory, 'golden.json')
    await approveKnowledgeEvaluation({
      candidatePath: options().outputPath,
      ids: [file.cases[0].id],
      outputPath,
      reviewer: 'test-fixture-reviewer',
    })
    const golden = JSON.parse(await readFile(outputPath, 'utf8'))
    expect(golden).toMatchObject({kind: 'golden', review: {reviewer: 'test-fixture-reviewer'}})
    expect(golden.cases).toHaveLength(1)
    expect(generateQuestions).not.toHaveBeenCalled()
    expect(JSON.parse(await readFile(options().outputPath, 'utf8')).kind).toBe('candidate')
  })
})
