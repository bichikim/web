/** @vitest-environment jsdom */
import {createTrackedEffect, flush} from 'solid-js'
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
  flush()
  model.request({
    ...origin,
    document: {...initial, framesPerSecond: 48},
    expectedRevision: 0,
    type: 'edit',
  })
  flush()
  expect(editor()).toBe(studio())
  expect(studio()).toBe(viewer())
  expect(onCommit).not.toHaveBeenCalled()
  model.request({...origin, type: 'commit'})
  flush()
  expect(onCommit).toHaveBeenCalledOnce()
  expect(model.read().undoCount).toBe(1)
  model.request({ownerId: 'poffo', requestId: 'undo', type: 'undo'})
  flush()
  expect(viewer()).toBe(initial)
})

test('should retain completed history and omit recovery writes when an unfinished owner is released', () => {
  const onCommit = vi.fn()
  const initial = createDemoDocument()
  const {result: model} = renderHook(() =>
    createModelSession({document: initial, onCommit, sessionId: 'shared'}),
  )
  model.request({...origin, type: 'begin'})
  flush()
  model.request({
    ...origin,
    document: {...initial, framesPerSecond: 48},
    expectedRevision: 0,
    type: 'edit',
  })
  flush()
  model.request({...origin, type: 'release'})
  flush()
  expect(model.read().document).toBe(initial)
  expect(onCommit).not.toHaveBeenCalled()
  expect(model.read().undoCount).toBe(0)
})

test('should publish a document reset without enqueueing a recovery write', () => {
  const initial = createDemoDocument()
  const replacement = {...initial, framesPerSecond: 48}
  const documents = vi.fn()
  const onCommit = vi.fn()
  const {result: model} = renderHook(() => {
    const session = createModelSession({document: initial, onCommit, sessionId: 'shared'})
    createTrackedEffect(() => documents(session.document()))
    return session
  })

  expect(model.request({...origin, document: replacement, type: 'reset'})).toEqual({
    changed: true,
    ok: true,
    revision: 1,
  })
  flush()

  expect(documents.mock.lastCall?.[0]).toBe(replacement)
  expect(onCommit).not.toHaveBeenCalled()
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
    createTrackedEffect(() => {
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
  flush()
  expect(revisions).toEqual([1, 2])
  expect(model.read().document.framesPerSecond).toBe(60)
})

test('should notify document readers only when document identity changes', () => {
  const documents = vi.fn()
  const revisions = vi.fn()
  const {result: model} = renderHook(() => {
    const session = createModelSession({document: createDemoDocument(), sessionId: 'shared'})
    createTrackedEffect(() => documents(session.document()))
    createTrackedEffect(() => revisions(session.revision()))
    return session
  })
  model.request({...origin, type: 'begin'})
  flush()
  model.request({...origin, type: 'commit'})
  flush()
  expect(documents).toHaveBeenCalledOnce()
  expect(revisions).toHaveBeenCalledOnce()
  model.request({...origin, type: 'begin'})
  flush()
  model.request({
    ...origin,
    document: {...model.document(), framesPerSecond: 48},
    expectedRevision: 0,
    type: 'edit',
  })
  flush()
  model.request({...origin, type: 'commit'})
  flush()
  expect(documents).toHaveBeenCalledTimes(2)
  expect(revisions).toHaveBeenCalledTimes(3)
})
