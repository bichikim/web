import {afterEach, expect, it, vi} from 'vitest'
import {assertArtifactAbsent, readArtifact, writeArtifact} from '../artifacts'
import {createInspectionEvaluation} from '../../evaluation/index'
import {evaluateInspectionArtifact} from '../inspection-evaluation'
vi.mock('../artifacts', () => ({
  assertArtifactAbsent: vi.fn(),
  readArtifact: vi.fn(),
  writeArtifact: vi.fn(),
}))
vi.mock('../../evaluation/index', () => ({createInspectionEvaluation: vi.fn()}))
afterEach(() => vi.resetAllMocks())
it('should validate recorded artifacts before publishing output', async () => {
  vi.mocked(readArtifact)
    .mockResolvedValueOnce('labels')
    .mockResolvedValueOnce('doctor')
    .mockResolvedValueOnce('baseline')
  vi.mocked(createInspectionEvaluation).mockReturnValue({
    error: {code: 'invalid-inspection-dataset'},
    ok: false,
  })
  await expect(
    evaluateInspectionArtifact({
      baseline: 'baseline',
      datasetPath: 'labels',
      outputPath: 'new',
      reportPath: 'doctor',
    }),
  ).rejects.toThrow('Knowledge command failed')
  expect(createInspectionEvaluation).toHaveBeenCalledWith({
    baseline: 'baseline',
    dataset: 'labels',
    diagnostic: 'doctor',
  })
  expect(assertArtifactAbsent).toHaveBeenCalledWith('new')
  expect(writeArtifact).not.toHaveBeenCalled()
})
