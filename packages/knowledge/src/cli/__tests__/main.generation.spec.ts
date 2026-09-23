import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {approveKnowledgeEvaluation, generateKnowledgeEvaluation} from '../generation'
import {runKnowledgeCli} from '../main'
vi.mock('../generation', () => ({
  approveKnowledgeEvaluation: vi.fn(),
  generateKnowledgeEvaluation: vi.fn(),
}))
beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  vi.spyOn(process.stderr, 'write').mockReturnValue(true)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
it('should dispatch generation and approval separately and print output paths', async () => {
  vi.mocked(generateKnowledgeEvaluation).mockResolvedValue({
    cached: 1,
    cases: 2,
    generated: 0,
    outputPath: 'candidates.json',
  })
  expect(
    await runKnowledgeCli([
      'eval-generate',
      '/repo',
      '--model',
      'test',
      '--output',
      'candidates.json',
    ]),
  ).toBe(0)
  expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('candidates.json'))
  expect(approveKnowledgeEvaluation).not.toHaveBeenCalled()
  vi.mocked(approveKnowledgeEvaluation).mockResolvedValue({approved: 1, outputPath: 'golden.json'})
  expect(
    await runKnowledgeCli([
      'eval-approve',
      'candidates.json',
      '--ids',
      'one',
      '--reviewer',
      'Human',
      '--output',
      'golden.json',
      '--json',
    ]),
  ).toBe(0)
  expect(approveKnowledgeEvaluation).toHaveBeenCalledWith(
    expect.objectContaining({ids: ['one'], reviewer: 'Human'}),
  )
  expect(process.stdout.write).toHaveBeenCalledWith(
    `${JSON.stringify({approved: 1, outputPath: 'golden.json'})}\n`,
  )
})
