import {expect, test, vi} from 'vitest'
import {createRuntimeState} from '../create-runtime-state'
import {prepareDocument, puppetDocument} from '../../__tests__/fixtures/document'

const document = prepareDocument({
  ...puppetDocument,
  motions: [{duration: 2, id: 'walk', tracks: []}],
  parameters: [{defaultValue: 0, id: 'angle', maximum: 1, minimum: -1, name: 'Angle'}],
})

test('should round-trip numerical controls and independent motion identity without a renderer', () => {
  const store = createRuntimeState({document, onChange: vi.fn(), randomSeed: 42})
  const {state} = store
  const handle = state.playbacks.start('walk', {completion: 7})!
  state.playback.seek(0.3)
  state.playbacks.advance(0.25)
  state.parameterValues = {angle: 0.4}
  state.frameValues = {angle: 0.6}
  state.modelOpacity = 0.8
  state.lipSyncLevel = 0.5
  state.renderOverrides.parts.set('part', {opacity: 0.3})
  state.adjustments.setPhysicsOptions({wind: [0.1, 0.2]})
  state.lookAndBreath.setLookTarget({x: 0.2, y: 0.4})
  state.lookAndBreath.advance(0.1)
  state.notices.emit({completion: 7, kind: 'completion'})
  const checkpoint = structuredClone(store.capture())
  state.parameterValues = {}
  state.frameValues = {}
  state.modelOpacity = 1
  state.lipSyncLevel = undefined
  state.playback.seek(1)
  state.playbacks.advance(0.5)
  state.renderOverrides.parts.clear()
  state.adjustments.setPhysicsOptions(undefined)
  state.lookAndBreath.advance(1)
  state.notices.clear()
  store.restore(checkpoint)
  expect(store.capture()).toEqual(checkpoint)
  expect(handle.getState().time).toBe(0.25)
  expect(state.renderOverrides.parts).not.toBe(checkpoint.renderOverrides.parts)
})

test('should restore random checkpoints without consuming a new sample or notifying control listeners', () => {
  const onChange = vi.fn()
  const store = createRuntimeState({document, onChange, randomSeed: 42})
  store.state.random()
  const checkpoint = structuredClone(store.capture())
  const expected = [store.state.random(), store.state.random()]
  store.restore(checkpoint)
  expect([store.state.random(), store.state.random()]).toEqual(expected)
  expect(onChange).not.toHaveBeenCalled()
})

test('should leave document and lifecycle ownership unchanged when restoring a numeric checkpoint', () => {
  const store = createRuntimeState({document, onChange: vi.fn(), randomSeed: 42})
  const checkpoint = structuredClone(store.capture())
  const replacement = prepareDocument({...document, viewport: {height: 200, width: 400}})
  store.state.document = replacement
  store.state.destroyed = true
  store.state.deferred = true
  store.state.running = false
  store.state.settleRequested = true
  store.restore(checkpoint)
  expect(store.state.document).toBe(replacement)
  expect(store.state).toMatchObject({
    deferred: true,
    destroyed: true,
    running: false,
    settleRequested: true,
  })
})

test('should derive active numerical playback without modifying its checkpoint or notifying listeners', () => {
  const onChange = vi.fn()
  const store = createRuntimeState({document, onChange, physicsPreview: false, randomSeed: 42})
  expect(store.isRunning()).toBe(true)
  store.state.playback.pause()
  expect(store.isRunning()).toBe(false)
  const handle = store.state.playbacks.start('walk')!
  expect(store.isRunning()).toBe(true)
  handle.pause()
  onChange.mockClear()
  const checkpoint = structuredClone(store.capture())
  expect(store.isRunning()).toBe(false)
  expect(store.isRunning()).toBe(false)
  expect(store.capture()).toEqual(checkpoint)
  expect(onChange).not.toHaveBeenCalled()
})
