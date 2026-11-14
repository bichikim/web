/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createSignal} from 'solid-js'
import {createElementModel} from '../../editor-element/create-element-model'
import {createDemoDocument} from '../../player'
import {PuppetEditor} from '../PuppetEditor'
import type {EditorController} from '../control'
import {createPlayerFixture} from './fixtures/player'

const mocks = vi.hoisted(() => ({createPlayer: vi.fn()}))
vi.mock('../../player', async (original) => ({
  ...(await original<typeof import('../../player')>()),
  createPlayer: mocks.createPlayer,
}))
beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should dispose owned resources while retaining the host document and history', async () => {
  const player = createPlayerFixture()
  mocks.createPlayer.mockResolvedValue(player)
  const {result: model} = renderHook(() =>
    createElementModel({document: createDemoDocument(), sessionId: 'host'}),
  )
  let control: EditorController | undefined
  const view = render(() => (
    <PuppetEditor
      model={model}
      onControl={(next) => {
        control = next
      }}
    />
  ))
  await waitFor(() => expect(control?.getState().renderer).toBe('ready'))
  model.request({
    document: {...model.document(), framesPerSecond: 48},
    expectedRevision: 0,
    ownerId: 'host',
    requestId: 'edit',
    type: 'edit',
  })
  control?.lifecycle.dispose()
  expect(view.queryByRole('main')).toBeNull()
  expect(player.destroy).toHaveBeenCalledOnce()
  expect(model.read().undoCount).toBe(1)
  expect(model.document().framesPerSecond).toBe(48)
  const updates = vi.mocked(player.updateDocument).mock.calls.length
  model.request({ownerId: 'host', requestId: 'undo', type: 'undo'})
  expect(vi.mocked(player.updateDocument).mock.calls).toHaveLength(updates)
})

test('should release a player whose initialization completes after explicit disposal', async () => {
  const player = createPlayerFixture()
  let finish = (_player: typeof player) => undefined as void
  mocks.createPlayer.mockReturnValue(
    new Promise<typeof player>((resolve) => {
      finish = resolve
    }),
  )
  const {result: model} = renderHook(() =>
    createElementModel({document: createDemoDocument(), sessionId: 'host'}),
  )
  let control: EditorController | undefined
  const view = render(() => (
    <PuppetEditor
      model={model}
      onControl={(next) => {
        control = next
      }}
    />
  ))
  await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
  control?.lifecycle.dispose()
  finish(player)
  await waitFor(() => expect(player.destroy).toHaveBeenCalledOnce())
  expect(view.queryByRole('main')).toBeNull()
  expect(model.read().undoCount).toBe(0)
})

test('should keep input active until a blocked deactivation can finish the transaction', async () => {
  mocks.createPlayer.mockResolvedValue(createPlayerFixture())
  const {result: model} = renderHook(() =>
    createElementModel({document: createDemoDocument(), sessionId: 'host'}),
  )
  const {result: activation} = renderHook(() => createSignal(true))
  let control: EditorController | undefined
  const view = render(() => (
    <PuppetEditor
      model={model}
      active={activation[0]()}
      onControl={(next) => {
        control = next
      }}
    />
  ))
  await waitFor(() => expect(control?.getState().renderer).toBe('ready'))
  const origin = {ownerId: 'host', requestId: 'gesture', transactionId: 'gesture'}
  model.request({...origin, type: 'begin'})
  activation[1](false)
  expect(control?.getState().lifecycle).toBe('active')
  expect(view.getByRole('main')).toHaveProperty('inert', false)
  model.request({...origin, type: 'commit'})
  expect(control?.getState().lifecycle).toBe('inactive')
  expect(view.getByRole('main', {hidden: true})).toHaveProperty('inert', true)
})

test('should roll back an unfinished field edit before ordinary Solid unmount cleanup', async () => {
  mocks.createPlayer.mockResolvedValue(createPlayerFixture())
  const initial = createDemoDocument()
  const {result: model} = renderHook(() =>
    createElementModel({document: initial, sessionId: 'host'}),
  )
  const view = render(() => <PuppetEditor model={model} initialWorkspace="animation" />)
  const fps = view.getByRole('spinbutton', {name: '타임라인 FPS'})
  fireEvent.focus(fps)
  fireEvent.input(fps, {target: {value: '48'}})
  expect(model.document()).not.toBe(initial)
  expect(model.read().transaction).not.toBeNull()
  view.unmount()
  expect(model.document()).toBe(initial)
  expect(model.read().undoCount).toBe(0)
  expect(model.read().transaction).toBeNull()
})
