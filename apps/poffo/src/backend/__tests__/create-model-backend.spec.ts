/** @vitest-environment node */
import {expect, test, vi} from 'vitest'
import {createEmptyDocument} from '@winter-love/puppet/player'
import {createModelBackend} from '../create-model-backend'

const origin = {ownerId: 'gui', requestId: 'drag', transactionId: 'drag'}

test('should share document history and notify metadata changes without a UI runtime', () => {
  const initial = createEmptyDocument()
  const onCommit = vi.fn()
  const backend = createModelBackend({document: initial, onCommit, sessionId: 'model'})
  const listener = vi.fn()
  const unsubscribe = backend.subscribe(listener)
  expect(backend.request({...origin, type: 'begin'}).ok).toBe(true)
  expect(backend.read().transaction).toEqual({id: 'drag', ownerId: 'gui'})
  expect(
    backend.request({
      ...origin,
      document: {...initial, framesPerSecond: 60},
      expectedRevision: 0,
      type: 'edit',
    }).ok,
  ).toBe(true)
  expect(onCommit).not.toHaveBeenCalled()
  expect(backend.request({...origin, type: 'commit'}).ok).toBe(true)
  expect(onCommit).toHaveBeenCalledOnce()
  expect(backend.read().undoCount).toBe(1)
  backend.request({ownerId: 'cli', requestId: 'undo', type: 'undo'})
  expect(backend.read().document).toBe(initial)
  expect(listener).toHaveBeenCalledTimes(4)
  unsubscribe()
  backend.request({ownerId: 'cli', requestId: 'redo', type: 'redo'})
  expect(listener).toHaveBeenCalledTimes(4)
})

test('should reject competing writers and stale revisions', () => {
  const document = createEmptyDocument()
  const backend = createModelBackend({document, sessionId: 'model'})
  backend.request({...origin, type: 'begin'})
  expect(
    backend.request({
      document: {...document, framesPerSecond: 60},
      expectedRevision: 0,
      ownerId: 'cli',
      requestId: 'write',
      type: 'edit',
    }),
  ).toEqual({error: {code: 'busy'}, ok: false})
  backend.request({...origin, type: 'cancel'})
  backend.request({
    document: {...document, framesPerSecond: 60},
    expectedRevision: 0,
    ownerId: 'cli',
    requestId: 'first',
    type: 'edit',
  })
  expect(
    backend.request({
      document,
      expectedRevision: 0,
      ownerId: 'cli',
      requestId: 'stale',
      type: 'edit',
    }),
  ).toEqual({error: {code: 'stale-revision'}, ok: false})
})

test('should deliver reentrant mutations to every observer in revision order', () => {
  const model = createModelBackend({document: createEmptyDocument(), sessionId: 'ordered'})
  const revisions: number[] = []
  model.subscribe((view) => {
    if (view.revision === 1) {
      model.request({
        document: {...view.document, framesPerSecond: 60},
        expectedRevision: 1,
        ownerId: 'observer',
        requestId: 'nested',
        type: 'edit',
      })
    }
  })
  model.subscribe((view) => {
    revisions.push(view.revision)
  })
  model.request({
    document: {...model.read().document, framesPerSecond: 48},
    expectedRevision: 0,
    ownerId: 'caller',
    requestId: 'outer',
    type: 'edit',
  })
  expect(revisions).toEqual([1, 2])
})
