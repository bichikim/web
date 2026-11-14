/** @vitest-environment jsdom */
import {createEffect} from 'solid-js'
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '@winter-love/puppet/player'
import {createModelSession} from '../create-model-session'

afterEach(cleanup)
const origin = {ownerId: 'editor', requestId: 'gesture', transactionId: 'gesture'}

test('should expose the same canonical document to every consumer while grouping a gesture into one commit', () => {
  const onCommit = vi.fn()
  const initial = createDemoDocument()
  const {result: model} = renderHook(() =>
    createModelSession({document: initial, onCommit, sessionId: 'shared'}),
  )
  const editor = () => model.read().document
  const studio = () => model.read().document
  const viewer = () => model.read().document
  model.request({...origin, type: 'begin'})
  model.request({
    ...origin,
    document: {...initial, framesPerSecond: 48},
    expectedRevision: 0,
    type: 'edit',
  })
  expect(editor()).toBe(studio())
  expect(studio()).toBe(viewer())
  expect(onCommit).not.toHaveBeenCalled()
  model.request({...origin, type: 'commit'})
  expect(onCommit).toHaveBeenCalledOnce()
  expect(model.read().undoCount).toBe(1)
  model.request({ownerId: 'poffo', requestId: 'undo', type: 'undo'})
  expect(viewer()).toBe(initial)
})

test('should retain completed history and omit recovery writes when an unfinished owner is released', () => {
  const onCommit = vi.fn()
  const initial = createDemoDocument()
  const {result: model} = renderHook(() =>
    createModelSession({document: initial, onCommit, sessionId: 'shared'}),
  )
  model.request({...origin, type: 'begin'})
  model.request({
    ...origin,
    document: {...initial, framesPerSecond: 48},
    expectedRevision: 0,
    type: 'edit',
  })
  model.request({...origin, type: 'release'})
  expect(model.read().document).toBe(initial)
  expect(onCommit).not.toHaveBeenCalled()
  expect(model.read().undoCount).toBe(0)
})

test('should enqueue completed snapshots in revision order when an observer performs another edit', () => {
  const revisions: number[] = []
  const initial = createDemoDocument()
  const {result: model} = renderHook(() => {
    const session = createModelSession({
      document: initial,
      onCommit: (_document, change) => {
        revisions.push(change.revision)
      },
      sessionId: 'shared',
    })
    createEffect(() => {
      const current = session.read()
      if (current.revision === 1) {
        session.request({
          document: {...current.document, framesPerSecond: 60},
          expectedRevision: current.revision,
          ownerId: 'observer',
          requestId: 'second',
          type: 'edit',
        })
      }
    })
    return session
  })
  model.request({
    document: {...initial, framesPerSecond: 48},
    expectedRevision: 0,
    ownerId: 'editor',
    requestId: 'first',
    type: 'edit',
  })
  expect(revisions).toEqual([1, 2])
  expect(model.read().document.framesPerSecond).toBe(60)
})

test('should notify document readers only when document identity changes', () => {
  const documents = vi.fn()
  const revisions = vi.fn()
  const {result: model} = renderHook(() => {
    const session = createModelSession({document: createDemoDocument(), sessionId: 'shared'})
    createEffect(() => documents(session.document()))
    createEffect(() => revisions(session.revision()))
    return session
  })
  model.request({...origin, type: 'begin'})
  model.request({...origin, type: 'commit'})
  expect(documents).toHaveBeenCalledOnce()
  expect(revisions).toHaveBeenCalledOnce()
  model.request({...origin, type: 'begin'})
  model.request({
    ...origin,
    document: {...model.document(), framesPerSecond: 48},
    expectedRevision: 0,
    type: 'edit',
  })
  model.request({...origin, type: 'commit'})
  expect(documents).toHaveBeenCalledTimes(2)
  expect(revisions).toHaveBeenCalledTimes(3)
})
