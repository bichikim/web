import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createEvaluationReport} from '../../evaluation/index'
import {evaluateKnowledgeRepository} from '../evaluation'
import {runKnowledgeCli} from '../main'
import {KnowledgeCommandFailure} from '../runtime'

vi.mock('../evaluation', () => ({evaluateKnowledgeRepository: vi.fn()}))
beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  vi.spyOn(process.stderr, 'write').mockReturnValue(true)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
const original = createEvaluationReport({
  cutoff: 1,
  dataset: {cases: [{expected: [{docId: 'auth'}], id: 'ko', query: '인증'}], version: 1},
  rankings: [
    {hits: [{docId: 'auth', unitId: 'refresh'}], id: 'ko', repoId: 'repo', workspaceId: 'main'},
  ],
})

describe('runKnowledgeCli eval', () => {
  it('should print a baseline report as JSON with exit zero', async () => {
    if (!original.ok) {
      throw new Error('fixture failed')
    }
    vi.mocked(evaluateKnowledgeRepository).mockResolvedValue(original.value)
    expect(
      await runKnowledgeCli(['eval', 'cases.yml', '--repo', '/repo', '--k', '1', '--json']),
    ).toBe(0)
    expect(process.stdout.write).toHaveBeenCalledWith(`${JSON.stringify(original.value)}\n`)
    expect(process.stderr.write).not.toHaveBeenCalled()
  })
  it('should return nonzero and name individual regressions', async () => {
    if (!original.ok) {
      throw new Error('fixture failed')
    }
    vi.mocked(evaluateKnowledgeRepository).mockResolvedValue({
      ...original.value,
      comparison: {mrrDelta: -1, recallDelta: -1, regressions: ['ko']},
    })
    expect(await runKnowledgeCli(['eval', 'cases.yml', '--baseline', 'old.json'])).toBe(1)
    expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('Regressions: ko'))
  })
  it('should report no baseline or no regressions in text mode', async () => {
    if (!original.ok) {
      throw new Error('fixture failed')
    }
    vi.mocked(evaluateKnowledgeRepository)
      .mockResolvedValueOnce(original.value)
      .mockResolvedValueOnce({
        ...original.value,
        comparison: {mrrDelta: 0, recallDelta: 0, regressions: []},
      })
    expect(await runKnowledgeCli(['eval', 'cases.yml'])).toBe(0)
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('No baseline comparison.'),
    )
    expect(await runKnowledgeCli(['eval', 'cases.yml', '--baseline', 'old.json'])).toBe(0)
    expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('Regressions: none'))
  })
  it('should put evaluation failures on stderr without publishing a result', async () => {
    vi.mocked(evaluateKnowledgeRepository).mockRejectedValue(
      new KnowledgeCommandFailure({error: {code: 'invalid-evaluation-baseline'}, ok: false}),
    )
    expect(await runKnowledgeCli(['eval', 'cases.yml', '--json'])).toBe(1)
    expect(process.stdout.write).not.toHaveBeenCalled()
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('invalid-evaluation-baseline'),
    )
  })
})
