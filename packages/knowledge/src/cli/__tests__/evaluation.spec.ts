import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {EvalCommand} from '../arguments'
import {createCandidateSet} from '../../evaluation/index'
import {evaluateKnowledgeRepository} from '../evaluation'
import {KnowledgeCommandFailure, searchKnowledgeRepository} from '../runtime'

vi.mock('../runtime', async () => {
  const actual = await vi.importActual<typeof import('../runtime')>('../runtime')
  return {...actual, searchKnowledgeRepository: vi.fn()}
})
const dataset = {
  cases: [{expected: [{docId: 'auth', unitId: 'refresh'}], id: 'ko', query: '인증 갱신'}],
  version: 1,
}
let directory: string
let options: EvalCommand
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'knowledge-evaluation-test-'))
  options = {
    command: 'eval',
    cutoff: 3,
    datasetPath: join(directory, 'cases.yml'),
    inputPath: '/repo',
    json: true,
  }
})
const response = {
  command: 'search',
  hits: [
    {
      payload: {
        contentHash: 'hash',
        docId: 'auth',
        path: 'auth.md',
        relations: [],
        repoId: 'repo',
        status: 'active',
        tags: [],
        text: 'refresh tokens',
        title: 'Auth',
        type: 'rule',
        unitId: 'refresh',
        workspaceId: 'main',
      },
      pointId: 'point',
      score: 1,
    },
  ],
  query: '인증 갱신',
  repoId: 'repo',
  workspaceId: 'main',
} as const

afterEach(async () => {
  vi.resetAllMocks()
  await rm(directory, {force: true, recursive: true})
})

describe('evaluateKnowledgeRepository', () => {
  it('should evaluate generated candidates and reject a different repository scope', async () => {
    const candidate = createCandidateSet({
      entries: [
        {
          model: {digest: 'a'.repeat(64), name: 'test'},
          questions: {en: 'When should a token refresh?', ko: '토큰은 언제 갱신하나?'},
          repoId: 'repo',
          source: {
            contentHash: `sha256:${'b'.repeat(64)}`,
            docId: 'auth',
            text: 'Refresh once.',
            title: 'Auth',
            unitId: 'refresh',
          },
          workspaceId: 'main',
        },
      ],
      repoId: 'repo',
      workspaceId: 'main',
    })
    await writeFile(options.datasetPath, JSON.stringify(candidate))
    vi.mocked(searchKnowledgeRepository).mockResolvedValue(response)
    expect(await evaluateKnowledgeRepository(options)).toMatchObject({summary: {mrr: 1, recall: 1}})
    vi.mocked(searchKnowledgeRepository).mockResolvedValue({...response, repoId: 'other'})
    await expect(evaluateKnowledgeRepository(options)).rejects.toMatchObject({
      result: {error: {code: 'evaluation-scope-mismatch'}},
    })
  })
  it('should use the existing search path and compare a saved JSON report', async () => {
    await writeFile(options.datasetPath, JSON.stringify(dataset))
    vi.mocked(searchKnowledgeRepository).mockResolvedValue(response)
    const report = await evaluateKnowledgeRepository(options)
    expect(report.summary).toEqual({mrr: 1, recall: 1})
    expect(searchKnowledgeRepository).toHaveBeenCalledWith({
      inputPath: '/repo',
      limit: 3,
      query: '인증 갱신',
    })
    const baseline = join(directory, 'report.json')
    await writeFile(baseline, JSON.stringify(report))
    expect(await evaluateKnowledgeRepository({...options, baseline})).toMatchObject({
      comparison: {regressions: []},
    })
  })
  it.each(['invalid: [', 'version: 1\ncases: []', 'x'.repeat(16_777_217)])(
    'should reject malformed or oversized files before searching',
    async (source) => {
      await writeFile(options.datasetPath, source)
      await expect(evaluateKnowledgeRepository(options)).rejects.toBeInstanceOf(
        KnowledgeCommandFailure,
      )
      expect(searchKnowledgeRepository).not.toHaveBeenCalled()
    },
  )
  it('should sanitize file errors and preserve search failures without a partial report', async () => {
    await expect(evaluateKnowledgeRepository(options)).rejects.toMatchObject({
      result: {error: {code: 'evaluation-file-invalid'}, ok: false},
    })
    await writeFile(options.datasetPath, JSON.stringify(dataset))
    const failure = new KnowledgeCommandFailure({
      error: {code: 'embedding-request-failed'},
      ok: false,
    })
    vi.mocked(searchKnowledgeRepository).mockRejectedValue(failure)
    await expect(evaluateKnowledgeRepository(options)).rejects.toBe(failure)
  })
  it('should reject a repository scope change during evaluation', async () => {
    await writeFile(
      options.datasetPath,
      JSON.stringify({
        ...dataset,
        cases: [...dataset.cases, {...dataset.cases[0], id: 'en', query: 'refresh'}],
      }),
    )
    vi.mocked(searchKnowledgeRepository)
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce({...response, workspaceId: 'other'})
    await expect(evaluateKnowledgeRepository(options)).rejects.toMatchObject({
      result: {error: {code: 'invalid-evaluation-ranking'}},
    })
  })
})
