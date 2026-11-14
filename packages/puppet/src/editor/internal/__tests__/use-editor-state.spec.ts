/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createElementModel} from '../../../editor-element/create-element-model'
import {createDemoDocument, createEmptyDocument} from '../../../player'
import {createPlayerFixture} from '../../__tests__/fixtures/player'
import {useEditorState} from '../use-editor-state'

const frames = new Map<number, FrameRequestCallback>()
let frameId = 0
const paint = () => {
  const pending = [...frames.values()]
  frames.clear()
  pending.forEach((callback) => callback(0))
}
beforeEach(() => {
  localStorage.clear()
  frames.clear()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frameId += 1
    frames.set(frameId, callback)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const createFixture = () =>
  renderHook(() => {
    const model = createElementModel({document: createDemoDocument(), sessionId: 'host'})
    const [active, setActive] = createSignal(true)
    const onDispose = vi.fn()
    const state = useEditorState({
      get active() {
        return active()
      },
      model,
      onDispose,
    })
    return {model, onDispose, setActive, state}
  }).result

test('should retain the starting viewport time during playback and resume live time when paused', () => {
  const {state} = createFixture()
  const player = createPlayerFixture()
  state.handlePlayerChange(player)
  state.setCurrentTime(2)
  state.handlePlaybackToggle()
  state.setCurrentTime(3)
  expect(state.isPlaying()).toBe(true)
  expect(state.viewportTime()).toBe(2)
  expect(player.play).toHaveBeenCalledOnce()
  state.handlePlaybackToggle()
  expect(state.isPlaying()).toBe(false)
  expect(state.viewportTime()).toBe(3)
})

test('should ignore missing motions and seek a valid motion after pausing playback', () => {
  const {model, state} = createFixture()
  const player = createPlayerFixture()
  state.handlePlayerChange(player)
  state.handleMotionChange('missing')
  state.handleMotionSeek('missing', 5)
  expect(player.setMotion).not.toHaveBeenCalled()
  expect(player.seek).not.toHaveBeenCalled()
  state.handlePlaybackToggle()
  const motionId = model.document().motions[0]!.id
  state.handleMotionSeek(motionId, 2.5)
  expect(state.isPlaying()).toBe(false)
  expect(state.activeMotionId()).toBe(motionId)
  expect(state.currentTime()).toBe(2.5)
  expect(player.setMotion).toHaveBeenCalledWith(motionId)
  expect(player.seek).toHaveBeenCalledWith(2.5)
})

test('should expose requested mode feedback before applying the deferred workspace change', async () => {
  const {state} = createFixture()
  const selected = state.control.commands.selectMode('animation')
  expect(selected.status).toBe('accepted')
  expect(state.control.getState().mode).toBe('animation')
  expect(state.workspace()).toBe('modeling')
  paint()
  paint()
  if (selected.status !== 'accepted') {
    throw new Error('Mode change was not accepted')
  }
  await expect(selected.operation.finished).resolves.toEqual({
    status: 'completed',
    value: 'animation',
  })
  expect(state.workspace()).toBe('animation')
  expect(state.control.getState().modePending).toBe(false)
})

test('should clear old-model selection and playback state after a host replacement', () => {
  const {model, state} = createFixture()
  const player = createPlayerFixture()
  state.handlePlayerChange(player)
  state.handlePlaybackToggle()
  state.setActiveVertexIndex(2)
  state.handleMaskPickStart(model.document().parts[0]!.id)
  state.setCurrentTime(4)
  const document = createEmptyDocument()
  model.request({
    document,
    expectedRevision: 0,
    ownerId: 'host',
    requestId: 'replace',
    type: 'replace',
  })
  expect(state.sourceDocument()).toBe(document)
  expect(state.layerSelection()).toEqual({activeNodeId: null, nodeIds: []})
  expect(state.activeVertexIndex()).toBeNull()
  expect(state.maskPickSourcePartId()).toBeNull()
  expect(state.activeMotionId()).toBeNull()
  expect(state.currentTime()).toBe(0)
  expect(state.isPlaying()).toBe(false)
  expect(state.fitRevision()).toBe(1)
  expect(model.read().undoCount).toBe(1)
})

test('should keep an unfinished host edit active until it commits before deactivation', () => {
  const {model, setActive, state} = createFixture()
  state.handleDocumentEditStart()
  state.history.setDocument({...model.document(), framesPerSecond: 48})
  setActive(false)
  expect(state.control.getState().lifecycle).toBe('active')
  expect(model.read().transaction).not.toBeNull()
  state.history.endTransaction()
  expect(state.control.getState().lifecycle).toBe('inactive')
  expect(model.read().undoCount).toBe(1)
  expect(model.document().framesPerSecond).toBe(48)
  setActive(true)
  expect(state.control.getState().lifecycle).toBe('active')
})

test('should roll back unfinished editing and reject late changes after disposal', () => {
  const {model, onDispose, state} = createFixture()
  const original = model.document()
  state.handleDocumentEditStart()
  state.history.setDocument({...original, framesPerSecond: 48})
  state.control.lifecycle.dispose()
  expect(model.document()).toBe(original)
  expect(model.read().undoCount).toBe(0)
  expect(model.read().transaction).toBeNull()
  expect(onDispose).toHaveBeenCalledOnce()
  expect(state.history.setDocument({...original, framesPerSecond: 96})).toEqual({
    error: {code: 'inactive'},
    ok: false,
  })
})
