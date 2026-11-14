import {afterEach, expect, test, vi} from 'vitest'
import {computeRenderFrame} from '../../internal/compute-render-frame'
import {createEmptyDocument} from '../../create-empty-document'
import {createBufferEngine} from '../create-buffer-engine'
vi.mock('../../internal/compute-render-frame', () => ({computeRenderFrame: vi.fn()}))
afterEach(() => vi.resetAllMocks())
test('should evaluate geometry once after applying a control checkpoint and settling physics', () => {
  vi.mocked(computeRenderFrame).mockReturnValue({
    layers: new Map(),
    plans: [],
    spatialPoses: new Map(),
  })
  const document = {
    ...createEmptyDocument(),
    parameters: [{defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'P'}],
  }
  const engine = createBufferEngine(document)
  expect(computeRenderFrame).not.toHaveBeenCalled()
  const initial = engine.step(0, new ArrayBuffer(0)).state
  vi.mocked(computeRenderFrame).mockClear()
  const result = engine.step(1 / 60, new ArrayBuffer(0), {
    revision: 4,
    settle: true,
    state: {...initial, parameterValues: {p: 0.75}},
  })
  expect(result.state.frameValues.p).toBe(0.75)
  expect(result.inputRevision).toBe(4)
  expect(result.playback).toEqual({duration: 0, motionId: null, time: 0})
  expect(computeRenderFrame).toHaveBeenCalledOnce()
})

test('should analyze decoded motion audio in the compute runtime without host audio output', () => {
  vi.mocked(computeRenderFrame).mockReturnValue({
    layers: new Map(),
    plans: [],
    spatialPoses: new Map(),
  })
  const engine = createBufferEngine({
    ...createEmptyDocument(),
    motions: [{duration: 1, id: 'talk', sound: {analysis: 'rms', src: 'talk.wav'}, tracks: []}],
    parameterRoles: {lipSync: ['mouth']},
    parameters: [{defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'}],
  })
  const mono = new Float32Array(800).fill(0.5)
  engine.updateAudio(new Map([['talk.wav', {channels: [mono], mono, sampleRate: 8000}]]))
  expect(engine.step(0.05, new ArrayBuffer(0)).state.frameValues.mouth).toBe(0.5)
})

test('should carry skipped-frame events forward and release them after the presented acknowledgement', () => {
  vi.mocked(computeRenderFrame).mockReturnValue({
    layers: new Map(),
    plans: [],
    spatialPoses: new Map(),
  })
  const engine = createBufferEngine({
    ...createEmptyDocument(),
    motions: [{duration: 2, events: [{time: 0.1, value: 'step'}], id: 'walk', tracks: []}],
  })
  const first = engine.step(0.2, new ArrayBuffer(0))
  expect(first.state.notices.pending).toHaveLength(1)
  const later = engine.step(0.2, new ArrayBuffer(0))
  expect(later.state.notices.pending).toEqual(first.state.notices.pending)
  const cleared = engine.step(0.2, new ArrayBuffer(0), undefined, later.state.notices.sequence)
  expect(cleared.state.notices.pending).toEqual([])
})
