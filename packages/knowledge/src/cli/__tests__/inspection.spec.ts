import {mkdtemp, readdir, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {classifyInspectionPair} from '../../adapters/inspection'
import {
  classifyContextualPair,
  classifyResearchPair,
  classifySeparatedPair,
} from '../../adapters/experimental/index'
import {resolveQuestionModel} from '../../adapters/questions'
import {inspectKnowledgeRepository} from '../inspection'
import {type GenerationSourceResult, loadInspectionSource} from '../runtime'
import {runInquiryResearch, runInspectionResearch} from '../../inspection/index'
vi.mock('../../adapters/inspection', () => ({classifyInspectionPair: vi.fn()}))
vi.mock('../../adapters/experimental/index', () => ({
  classifyContextualPair: vi.fn(),
  classifyResearchPair: vi.fn(),
  classifySeparatedPair: vi.fn(),
}))
vi.mock('../../adapters/questions', () => ({resolveQuestionModel: vi.fn()}))
vi.mock('../runtime', async () => {
  const actual = await vi.importActual<typeof import('../runtime')>('../runtime')
  return {...actual, loadInspectionSource: vi.fn()}
})
const model = {digest: 'a'.repeat(64), name: 'test'}
const payload = {
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
  unitId: 'main',
  workspaceId: 'main',
} as const
const source = {
  ollamaUrl: 'http://localhost:11434',
  points: [
    {payload, pointId: 'a'},
    {payload: {...payload, docId: 'other'}, pointId: 'b'},
  ],
  repoId: 'repo',
  workspaceId: 'main',
}
const assessment = {
  confidence: 0.9,
  kind: 'duplicate',
  leftQuote: 'Refresh once.',
  reason: 'Same rule.',
  rightQuote: 'Refresh once.',
} as const
let directory: string
const withReader = (context: GenerationSourceResult) => ({
  ...context,
  reader: {
    findNeighbors: vi.fn().mockResolvedValue({
      ok: true,
      value: context.points.map((point) => ({...point, score: 0.9})),
    }),
  },
})
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'knowledge-inspection-test-'))
  vi.mocked(loadInspectionSource).mockResolvedValue(withReader(source))
  vi.mocked(resolveQuestionModel).mockResolvedValue({ok: true, value: model})
  vi.mocked(classifyInspectionPair).mockResolvedValue({ok: true, value: assessment})
})
afterEach(async () => {
  vi.resetAllMocks()
  await rm(directory, {force: true, recursive: true})
})
const options = () => ({cacheDirectory: directory, inputPath: '/repo', limit: 10, model: 'test'})
it('should pass the full knowledge snapshot to research and never reuse prior research output', async () => {
  const research = {
    initial: assessment,
    rounds: [],
    selection: {eligible: 0, sources: [], truncated: false},
    stop: 'resolved' as const,
    unresolved: [],
  }
  vi.mocked(classifyResearchPair).mockResolvedValue({ok: true, research, value: assessment})
  const reader = {search: vi.fn()}
  vi.mocked(loadInspectionSource).mockResolvedValue({...withReader(source), research: reader})
  const input = {...options(), inspectionMode: 'research' as const}
  expect(await inspectKnowledgeRepository(input)).toMatchObject({
    assessments: [{research}],
    cached: 0,
    promptVersion: 28,
  })
  expect(await inspectKnowledgeRepository(input)).toMatchObject({cached: 0, promptVersion: 28})
  expect(classifyResearchPair).toHaveBeenCalledTimes(2)
  expect(classifyResearchPair).toHaveBeenCalledWith(
    expect.objectContaining({points: source.points, reader}),
  )
  expect(await readdir(directory)).toHaveLength(0)
})
it('should persist cited research sources and use them on a second execution without another search', async () => {
  const supplemental = {
    payload: {...payload, docId: 'scope', text: 'Both rules apply to web storage.'},
    pointId: 'c',
  }
  const reader = {
    search: vi.fn().mockResolvedValue({ok: true, value: [{...supplemental, score: 1}]}),
  }
  const context = {
    ...withReader(source),
    points: [...source.points, supplemental],
    research: reader,
  }
  vi.mocked(loadInspectionSource).mockResolvedValue(context)
  vi.mocked(classifyResearchPair).mockImplementation((input) =>
    runInspectionResearch({
      ...input,
      assessor: async () => ({
        ok: true,
        value: {citations: ['context-1-left-1'], proposed: assessment, unresolved: []},
      }),
      initial: {...assessment, kind: 'uncertain'},
      planner: async () => ({ok: true, value: ['storage scope']}),
      questions: ['Scope?'],
    }),
  )
  const input = {...options(), inspectionMode: 'research' as const, limit: 1}
  expect(await inspectKnowledgeRepository(input)).toMatchObject({cached: 0, status: 'complete'})
  expect(reader.search).toHaveBeenCalledTimes(1)
  expect(await inspectKnowledgeRepository(input)).toMatchObject({
    assessments: [{research: {reused: {added: ['c']}, rounds: []}}],
    cached: 0,
    status: 'complete',
  })
  expect(reader.search).toHaveBeenCalledTimes(1)
  expect(classifyResearchPair).toHaveBeenCalledTimes(2)
  expect(context.points).toEqual([...source.points, supplemental])
  const changed = {
    ...supplemental,
    payload: {...supplemental.payload, contentHash: 'changed', text: 'Updated storage scope.'},
  }
  vi.mocked(loadInspectionSource).mockResolvedValue({
    ...context,
    points: [...source.points, changed],
  })
  reader.search.mockResolvedValue({ok: true, value: [{...changed, score: 1}]})
  expect(await inspectKnowledgeRepository(input)).toMatchObject({status: 'complete'})
  expect(classifyResearchPair).toHaveBeenLastCalledWith(expect.objectContaining({linked: []}))
  expect(reader.search).toHaveBeenCalledTimes(2)
  vi.mocked(loadInspectionSource).mockResolvedValue({...context, points: source.points})
  reader.search.mockResolvedValue({ok: true, value: []})
  expect(await inspectKnowledgeRepository(input)).toMatchObject({
    assessments: [{assessment: {kind: 'uncertain'}, research: {stop: 'no-new-queries'}}],
    status: 'complete',
  })
  expect(classifyResearchPair).toHaveBeenLastCalledWith(expect.objectContaining({linked: []}))
  expect(reader.search).toHaveBeenCalledTimes(3)
})
it('should pass persisted question history to the next diagnosis even when searches found nothing', async () => {
  const reader = {search: vi.fn().mockResolvedValue({ok: true, value: []})}
  vi.mocked(loadInspectionSource).mockResolvedValue({...withReader(source), research: reader})
  vi.mocked(classifyResearchPair).mockImplementation((input) =>
    runInquiryResearch({
      ...input,
      assessor: async () => ({error: {code: 'unexpected-assessment'}, ok: false}),
      initial: assessment,
      planner: async (state) => ({
        ok: true,
        value: [{query: 'scope', questionId: state.inquiries[0].id}],
      }),
      questions: ['Which scope?'],
    }),
  )
  const input = {...options(), inspectionMode: 'research' as const, limit: 1}
  expect(await inspectKnowledgeRepository(input)).toMatchObject({
    assessments: [{assessment: {kind: 'uncertain'}}],
    status: 'complete',
  })
  expect(await inspectKnowledgeRepository(input)).toMatchObject({
    assessments: [{assessment: {kind: 'uncertain'}, research: {stop: 'no-new-queries'}}],
    status: 'complete',
  })
  expect(reader.search).toHaveBeenCalledTimes(1)
  expect(classifyResearchPair).toHaveBeenLastCalledWith(
    expect.objectContaining({
      history: expect.objectContaining({
        questions: [
          expect.objectContaining({attempts: [{clues: [], query: 'scope'}], text: 'Which scope?'}),
        ],
      }),
    }),
  )
})
it('should report unreadable links before generation and keep old links when generation fails', async () => {
  const supplemental = {payload: {...payload, docId: 'scope', text: 'Scope.'}, pointId: 'c'}
  const reader = {search: vi.fn()}
  vi.mocked(loadInspectionSource).mockResolvedValue({
    ...withReader(source),
    points: [...source.points, supplemental],
    research: reader,
  })
  vi.mocked(classifyResearchPair).mockImplementation((input) =>
    runInspectionResearch({
      ...input,
      assessor: async () => ({
        ok: true,
        value: {citations: ['context-1-left-1'], proposed: assessment, unresolved: []},
      }),
      initial: assessment,
      linked: [supplemental],
      planner: async () => ({ok: true, value: []}),
      questions: [],
    }),
  )
  const input = {...options(), inspectionMode: 'research' as const, limit: 1}
  expect(await inspectKnowledgeRepository(input)).toMatchObject({status: 'complete'})
  vi.mocked(classifyResearchPair).mockResolvedValue({
    error: {code: 'inspection-model-changed'},
    ok: false,
  })
  expect(await inspectKnowledgeRepository(input)).toMatchObject({
    errors: [{code: 'inspection-model-changed'}],
    status: 'partial',
  })
  const [name] = await readdir(join(directory, 'links'))
  await writeFile(join(directory, 'links', name), '{}')
  expect(await inspectKnowledgeRepository(input)).toMatchObject({
    errors: [{code: 'inspection-links-read-failed'}],
    status: 'partial',
  })
  expect(classifyResearchPair).toHaveBeenCalledTimes(2)
})
it('should report link write failures without claiming a completed assessment', async () => {
  const supplemental = {payload: {...payload, docId: 'scope', text: 'Scope.'}, pointId: 'c'}
  vi.mocked(loadInspectionSource).mockResolvedValue({
    ...withReader(source),
    points: [...source.points, supplemental],
    research: {search: vi.fn()},
  })
  vi.mocked(classifyResearchPair).mockImplementation(async (input) => {
    const result = await runInspectionResearch({
      ...input,
      assessor: async () => ({
        ok: true,
        value: {citations: ['context-1-left-1'], proposed: assessment, unresolved: []},
      }),
      initial: assessment,
      linked: [supplemental],
      planner: async () => ({ok: true, value: []}),
      questions: [],
    })
    await writeFile(join(directory, 'links'), 'directory blocked')
    return result
  })
  expect(
    await inspectKnowledgeRepository({...options(), inspectionMode: 'research', limit: 1}),
  ).toMatchObject({
    assessments: [],
    errors: [{code: 'inspection-links-write-failed'}],
    status: 'partial',
  })
})
it('should cache contextual traces and invalidate them when supplemental source text changes', async () => {
  const review = {
    citations: [],
    initial: assessment,
    questions: [],
    selection: {eligible: 0, sources: [], truncated: false},
    unresolved: [],
  }
  vi.mocked(classifyContextualPair).mockResolvedValue({ok: true, review, value: assessment})
  const input = {...options(), inspectionMode: 'contextual' as const, limit: 1}
  const points = [
    ...source.points,
    {payload: {...payload, text: 'Definition.', unitId: 'definition'}, pointId: 'c'},
  ]
  vi.mocked(loadInspectionSource).mockResolvedValue(withReader({...source, points}))
  expect(await inspectKnowledgeRepository(input)).toMatchObject({
    assessments: [{review}],
    cached: 0,
    promptVersion: 8,
  })
  expect(await inspectKnowledgeRepository(input)).toMatchObject({cached: 1, promptVersion: 8})
  expect(classifyContextualPair).toHaveBeenCalledTimes(1)
  expect(classifyContextualPair).toHaveBeenCalledWith(
    expect.objectContaining({points: [points[2]]}),
  )
  vi.mocked(loadInspectionSource).mockResolvedValue(
    withReader({
      ...source,
      points: [
        points[0],
        points[1],
        {...points[2], payload: {...points[2].payload, text: 'Changed definition.'}},
      ],
    }),
  )
  expect(await inspectKnowledgeRepository(input)).toMatchObject({cached: 0})
  expect(classifyContextualPair).toHaveBeenCalledTimes(2)
  expect(classifyInspectionPair).not.toHaveBeenCalled()
})
it('should reject invalid runtime modes before reading source or invoking models', async () => {
  const input = options()
  Reflect.set(input, 'inspectionMode', 'unknown')
  expect(await inspectKnowledgeRepository(input)).toEqual({
    code: 'invalid-inspection-mode',
    status: 'unavailable',
  })
  expect(loadInspectionSource).not.toHaveBeenCalled()
  expect(classifyInspectionPair).not.toHaveBeenCalled()
  expect(classifySeparatedPair).not.toHaveBeenCalled()
})
it('should report separated failures without caching or falling back to the default classifier', async () => {
  vi.mocked(classifySeparatedPair).mockResolvedValue({
    error: {code: 'inspection-request-failed'},
    ok: false,
  })
  expect(
    await inspectKnowledgeRepository({...options(), inspectionMode: 'separated'}),
  ).toMatchObject({
    cached: 0,
    errors: [{code: 'inspection-request-failed'}],
    promptVersion: 7,
    status: 'partial',
  })
  expect(classifyInspectionPair).not.toHaveBeenCalled()
  expect(await readdir(directory)).toHaveLength(0)
})
it('should isolate separated and default caches while recording the actual prompt version', async () => {
  vi.mocked(classifySeparatedPair).mockResolvedValue({ok: true, value: assessment})
  const combined = await inspectKnowledgeRepository(options())
  const separated = await inspectKnowledgeRepository({...options(), inspectionMode: 'separated'})
  expect(combined).toMatchObject({cached: 0, promptVersion: 3, status: 'complete'})
  expect(separated).toMatchObject({cached: 0, promptVersion: 7, status: 'complete'})
  expect(
    await inspectKnowledgeRepository({...options(), inspectionMode: 'separated'}),
  ).toMatchObject({cached: 1, promptVersion: 7})
  expect(
    await inspectKnowledgeRepository({...options(), inspectionMode: 'combined'}),
  ).toMatchObject({cached: 1, promptVersion: 3})
  expect(classifyInspectionPair).toHaveBeenCalledTimes(1)
  expect(classifySeparatedPair).toHaveBeenCalledTimes(1)
  expect(await readdir(directory)).toHaveLength(2)
})
it('should cache scoped diagnostics and invalidate model or source changes', async () => {
  expect(await inspectKnowledgeRepository(options())).toMatchObject({
    assessments: [{assessment}],
    cached: 0,
    limit: 10,
    sourceUnits: source.points.map(({payload: unit}) => ({
      contentHash: unit.contentHash,
      docId: unit.docId,
      unitId: unit.unitId,
    })),
    status: 'complete',
  })
  expect(await inspectKnowledgeRepository(options())).toMatchObject({cached: 1, status: 'complete'})
  expect(classifyInspectionPair).toHaveBeenCalledTimes(1)
  vi.mocked(resolveQuestionModel).mockResolvedValue({
    ok: true,
    value: {...model, digest: 'c'.repeat(64)},
  })
  expect(await inspectKnowledgeRepository(options())).toMatchObject({cached: 0})
  expect(classifyInspectionPair).toHaveBeenCalledTimes(2)
  vi.mocked(loadInspectionSource).mockResolvedValue(
    withReader({
      ...source,
      points: [
        source.points[0],
        {
          ...source.points[1],
          payload: {
            ...source.points[1].payload,
            contentHash: `sha256:${'d'.repeat(64)}`,
            text: 'Refresh once. New details.',
          },
        },
      ],
    }),
  )
  expect(await inspectKnowledgeRepository(options())).toMatchObject({cached: 0})
  expect(classifyInspectionPair).toHaveBeenCalledTimes(3)
})
it('should report model failure separately without throwing and reject corrupted cache', async () => {
  vi.mocked(resolveQuestionModel).mockResolvedValueOnce({
    error: {code: 'question-model-unavailable'},
    ok: false,
  })
  expect(await inspectKnowledgeRepository(options())).toMatchObject({
    code: 'inspection-model-unavailable',
    status: 'unavailable',
  })
  await inspectKnowledgeRepository(options())
  const [file] = (await readdir(directory)).filter((name) => name.endsWith('.json'))
  await writeFile(join(directory, file), '{}')
  expect(await inspectKnowledgeRepository(options())).toMatchObject({
    errors: [{code: 'invalid-inspection-cache'}],
    status: 'partial',
  })
  expect(classifyInspectionPair).toHaveBeenCalledTimes(1)
})
it('should retain independent results when one pair fails and never mutate indexed payloads', async () => {
  vi.mocked(loadInspectionSource).mockResolvedValue(
    withReader({
      ...source,
      points: [...source.points, {payload: {...payload, docId: 'third'}, pointId: 'c'}],
    }),
  )
  vi.mocked(classifyInspectionPair).mockResolvedValueOnce({
    error: {code: 'inspection-request-failed'},
    ok: false,
  })
  const snapshot = JSON.stringify(source)
  expect(await inspectKnowledgeRepository(options())).toMatchObject({
    assessments: [{assessment}, {assessment}],
    errors: [{code: 'inspection-request-failed'}],
    status: 'partial',
  })
  expect(JSON.stringify(source)).toBe(snapshot)
})
it('should report context failures and avoid model requests when no pair exists', async () => {
  expect(await inspectKnowledgeRepository({...options(), limit: 0})).toMatchObject({
    status: 'unavailable',
  })
  vi.mocked(loadInspectionSource).mockRejectedValueOnce(new Error('secret'))
  expect(await inspectKnowledgeRepository(options())).toEqual({
    code: 'inspection-unavailable',
    status: 'unavailable',
  })
  vi.mocked(loadInspectionSource).mockResolvedValue(withReader({...source, points: []}))
  expect(await inspectKnowledgeRepository(options())).toMatchObject({
    selectedPairs: 0,
    status: 'complete',
  })
  expect(resolveQuestionModel).not.toHaveBeenCalled()
})
it('should preserve retrieval failures as partial diagnostics even when no pair can be classified', async () => {
  const context = withReader(source)
  context.reader.findNeighbors.mockResolvedValue({error: {code: 'index-unavailable'}, ok: false})
  vi.mocked(loadInspectionSource).mockResolvedValue(context)
  expect(await inspectKnowledgeRepository(options())).toMatchObject({
    retrieval: {
      errors: [
        {code: 'index-unavailable', pointId: 'a'},
        {code: 'index-unavailable', pointId: 'b'},
      ],
    },
    selectedPairs: 0,
    status: 'partial',
  })
  expect(classifyInspectionPair).not.toHaveBeenCalled()
  expect(resolveQuestionModel).not.toHaveBeenCalled()
})
it('should keep partial status after classifying remaining retrieved candidates successfully', async () => {
  const context = withReader(source)
  context.reader.findNeighbors.mockResolvedValueOnce({
    error: {code: 'index-unavailable'},
    ok: false,
  })
  vi.mocked(loadInspectionSource).mockResolvedValue(context)
  expect(await inspectKnowledgeRepository(options())).toMatchObject({
    assessments: [{assessment}],
    retrieval: {errors: [{code: 'index-unavailable', pointId: 'a'}]},
    status: 'partial',
  })
  expect(classifyInspectionPair).toHaveBeenCalledTimes(1)
})
it('should isolate malformed cache files and locked cache storage as diagnostic failures', async () => {
  await inspectKnowledgeRepository(options())
  const [file] = (await readdir(directory)).filter((name) => name.endsWith('.json'))
  await writeFile(join(directory, file), '{invalid')
  expect(await inspectKnowledgeRepository(options())).toMatchObject({
    errors: [{code: 'inspection-pair-unavailable'}],
    status: 'partial',
  })
  await writeFile(join(directory, 'index.lock'), 'test fixture lock')
  expect(await inspectKnowledgeRepository(options())).toEqual({
    code: 'inspection-unavailable',
    status: 'unavailable',
  })
})
