import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {inspectKnowledgeRepository} from '../inspection'
import {runKnowledgeCli} from '../main'
import {doctorKnowledgeRepository} from '../runtime'
vi.mock('../inspection', () => ({inspectKnowledgeRepository: vi.fn()}))
vi.mock('../runtime', async () => {
  const actual = await vi.importActual<typeof import('../runtime')>('../runtime')
  return {...actual, doctorKnowledgeRepository: vi.fn()}
})
beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  vi.spyOn(process.stderr, 'write').mockReturnValue(true)
  vi.mocked(doctorKnowledgeRepository).mockResolvedValue({
    checks: [{name: 'storage', status: 'pass'}],
    command: 'doctor',
    healthy: true,
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
it('should forward the selected inspection mode through doctor', async () => {
  vi.mocked(inspectKnowledgeRepository).mockResolvedValue({
    code: 'inspection-unavailable',
    status: 'unavailable',
  })
  expect(
    await runKnowledgeCli([
      'doctor',
      '/repo',
      '--model',
      'test',
      '--inspection-mode',
      'separated',
      '--json',
    ]),
  ).toBe(1)
  expect(inspectKnowledgeRepository).toHaveBeenCalledWith(
    expect.objectContaining({inspectionMode: 'separated'}),
  )
})
it('should leave ordinary doctor output and generation calls unchanged', async () => {
  expect(await runKnowledgeCli(['doctor', '/repo', '--json'])).toBe(0)
  expect(inspectKnowledgeRepository).not.toHaveBeenCalled()
  expect(JSON.parse(String(vi.mocked(process.stdout.write).mock.calls[0][0]))).not.toHaveProperty(
    'semantic',
  )
})
it('should preserve base health while reporting unavailable optional inspection with exit one', async () => {
  vi.mocked(inspectKnowledgeRepository).mockResolvedValue({
    code: 'inspection-model-unavailable',
    status: 'unavailable',
  })
  expect(await runKnowledgeCli(['doctor', '/repo', '--model', 'missing', '--json'])).toBe(1)
  expect(JSON.parse(String(vi.mocked(process.stdout.write).mock.calls[0][0]))).toMatchObject({
    healthy: true,
    semantic: {status: 'unavailable'},
  })
})
it('should show unavailable and partial diagnostics in text mode with nonzero status', async () => {
  vi.mocked(inspectKnowledgeRepository)
    .mockResolvedValueOnce({code: 'inspection-unavailable', status: 'unavailable'})
    .mockResolvedValueOnce({
      assessments: [],
      cached: 0,
      consideredUnits: 2,
      eligibleUnits: 2,
      errors: [{cacheKey: 'key', code: 'inspection-request-failed'}],
      limit: 10,
      promptVersion: 1,
      repoId: 'repo',
      retrieval: {
        candidatePairs: 1,
        errors: [{code: 'index-unavailable', pointId: 'a'}],
        neighborsPerUnit: 10,
        seedLimit: 20,
      },
      selectedPairs: 1,
      sourceUnits: [],
      status: 'partial',
      totalPairs: 1,
      truncated: false,
      workspaceId: 'main',
    })
  expect(await runKnowledgeCli(['doctor', '/repo', '--model', 'test'])).toBe(1)
  expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('SEMANTIC unavailable'))
  expect(await runKnowledgeCli(['doctor', '/repo', '--model', 'test'])).toBe(1)
  expect(process.stdout.write).toHaveBeenCalledWith(
    expect.stringContaining('SEMANTIC error inspection-request-failed'),
  )
  expect(process.stdout.write).toHaveBeenCalledWith(
    expect.stringContaining('SEMANTIC retrieval error index-unavailable'),
  )
})
it('should render tentative warnings without treating confidence as source status', async () => {
  vi.mocked(inspectKnowledgeRepository).mockResolvedValue({
    assessments: [
      {
        assessment: {
          confidence: 0.2,
          kind: 'conflict',
          leftQuote: 'A',
          reason: 'May conflict',
          rightQuote: 'B',
        },
        cacheKey: 'key',
        left: {contentHash: 'one', docId: 'a', unitId: 'one'},
        right: {contentHash: 'two', docId: 'b', unitId: 'two'},
      },
    ],
    cached: 0,
    consideredUnits: 2,
    eligibleUnits: 2,
    errors: [],
    limit: 10,
    promptVersion: 1,
    repoId: 'repo',
    retrieval: {candidatePairs: 1, errors: [], neighborsPerUnit: 10, seedLimit: 20},
    selectedPairs: 1,
    sourceUnits: [],
    status: 'complete',
    totalPairs: 1,
    truncated: false,
    workspaceId: 'main',
  })
  expect(await runKnowledgeCli(['doctor', '/repo', '--model', 'test'])).toBe(0)
  expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('CANDIDATE conflict'))
})
