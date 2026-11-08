/** @vitest-environment node */
import {expect, test, vi} from 'vitest'
import {createEmptyDocument} from '@winter-love/puppet/player'
import {createModelBackend} from '../create-model-backend'
import {hashValue} from '../hash-value'
import {createCommandService} from '../create-command-service'

const setup = () => {
  const model = createModelBackend({document: createEmptyDocument(), sessionId: 'session'})
  return {model, service: createCommandService({model})}
}

test('should finish an accepted file write before reporting that commands are idle', async () => {
  const model = createModelBackend({document: createEmptyDocument(), sessionId: 'session'})
  let release!: () => void
  let started!: () => void
  const writing = new Promise<void>((resolve) => {
    release = resolve
  })
  const ready = new Promise<void>((resolve) => {
    started = resolve
  })
  const order: string[] = []
  const service = createCommandService({
    files: {
      read: async () => ({error: {code: 'unused'}, ok: false}),
      write: async () => {
        order.push('writing')
        started()
        await writing
        order.push('written')
      },
    },
    model,
  })
  const saved = service.execute({
    input: {expectedRevision: 0, format: 'json', path: 'model.json'},
    operation: 'document.save',
    requestId: 'save',
  })
  try {
    await ready
    const idle = service.whenIdle().then(() => {
      order.push('idle')
    })
    expect(order).toEqual(['writing'])
    release()
    await idle
    expect((await saved).ok).toBe(true)
    expect(order).toEqual(['writing', 'written', 'idle'])
  } finally {
    release()
    await saved
  }
})

test('should preview without changing the model and apply one shared undo step', async () => {
  const {model, service} = setup()
  const patch = [{op: 'add', path: '/framesPerSecond', value: 48}]
  const preview = await service.execute({
    input: {expectedRevision: 0, patch},
    operation: 'edit.preview',
    requestId: 'preview',
  })
  expect(preview.ok).toBe(true)
  if (
    !preview.ok ||
    typeof preview.value !== 'object' ||
    preview.value === null ||
    !('fingerprint' in preview.value)
  ) {
    throw new Error('Preview failed')
  }
  expect(model.read().revision).toBe(0)
  expect(model.read().document.framesPerSecond).not.toBe(48)
  expect(
    (
      await service.execute({
        input: {expectedRevision: 0, fingerprint: preview.value.fingerprint, patch},
        operation: 'edit.apply',
        requestId: 'apply',
      })
    ).ok,
  ).toBe(true)
  expect(model.read().document.framesPerSecond).toBe(48)
  expect(model.read().undoCount).toBe(1)
  await service.execute({
    input: {expectedRevision: 1},
    operation: 'history.undo',
    requestId: 'undo',
  })
  expect(model.read().document.framesPerSecond).not.toBe(48)
})

test('should reject a changed patch, a stale revision, and invalid document data without partial commits', async () => {
  const {model, service} = setup()
  const changed = await service.execute({
    input: {
      expectedRevision: 0,
      fingerprint: 'wrong',
      patch: [{op: 'add', path: '/framesPerSecond', value: 48}],
    },
    operation: 'edit.apply',
    requestId: 'wrong',
  })
  expect(changed).toMatchObject({error: {code: 'preview-mismatch'}, ok: false})
  const stale = await service.execute({
    input: {expectedRevision: 9},
    operation: 'history.undo',
    requestId: 'stale',
  })
  expect(stale).toMatchObject({error: {code: 'stale-revision'}, ok: false})
  const invalid = await service.execute({
    input: {expectedRevision: 0, patch: [{op: 'remove', path: '/viewport'}]},
    operation: 'edit.preview',
    requestId: 'invalid',
  })
  expect(invalid.ok).toBe(false)
  expect(model.read().revision).toBe(0)
  expect(model.read().undoCount).toBe(0)
})

test('should reject prototype modification without changing unrelated objects', async () => {
  const {model, service} = setup()
  const result = await service.execute({
    input: {expectedRevision: 0, patch: [{op: 'add', path: '/__proto__/polluted', value: true}]},
    operation: 'edit.preview',
    requestId: 'prototype',
  })
  expect(result.ok).toBe(false)
  expect('polluted' in {}).toBe(false)
  expect(model.read().revision).toBe(0)
})

test('should reuse a completed mutation receipt and reject reused IDs with different inputs', async () => {
  const {model, service} = setup()
  const action = {
    document: {...model.read().document, framesPerSecond: 48},
    expectedRevision: 0,
    ownerId: 'gui',
    requestId: 'edit',
    type: 'edit',
  }
  const request = {input: action, operation: 'model.request', requestId: 'retry'}
  const [first, duplicate] = await Promise.all([service.execute(request), service.execute(request)])
  expect(first).toEqual(duplicate)
  expect(model.read().undoCount).toBe(1)
  expect(
    await service.execute({...request, input: {...action, expectedRevision: 1}}),
  ).toMatchObject({error: {code: 'request-id-conflict'}, ok: false})
})

test('should reject remote resets during an owned gesture and stale-session deltas', async () => {
  const {model, service} = setup()
  model.request({ownerId: 'gui', requestId: 'begin', transactionId: 'drag', type: 'begin'})
  expect(
    await service.execute({
      input: {
        document: createEmptyDocument(),
        expectedRevision: 0,
        ownerId: 'other',
        requestId: 'reset',
        type: 'reset',
      },
      operation: 'model.request',
      requestId: 'reset',
    }),
  ).toMatchObject({error: {code: 'busy'}, ok: false})
  model.request({ownerId: 'gui', requestId: 'cancel', transactionId: 'drag', type: 'cancel'})
  expect(
    await service.execute({
      input: {
        expectedRevision: model.read().revision,
        expectedSessionId: 'previous',
        ownerId: 'gui',
        patch: [{op: 'add', path: '/framesPerSecond', value: 48}],
        requestId: 'patch',
        type: 'edit',
      },
      operation: 'model.patch',
      requestId: 'stale-session',
    }),
  ).toMatchObject({error: {code: 'stale-session'}, ok: false})
  expect(model.read().undoCount).toBe(0)
})

test('should acknowledge a native file save only for its exact current snapshot', async () => {
  const {model} = setup()
  const onSaved = vi.fn()
  const service = createCommandService({model, onSaved})
  const fingerprint = await hashValue(model.read().document)
  expect(
    await service.execute({
      input: {expectedRevision: 0, fingerprint},
      operation: 'document.saved',
      requestId: 'ack',
    }),
  ).toMatchObject({ok: true})
  expect(onSaved).toHaveBeenCalledWith(model.read().document, 0)
  expect(
    await service.execute({
      input: {expectedRevision: 0, fingerprint: 'wrong'},
      operation: 'document.saved',
      requestId: 'wrong-ack',
    }),
  ).toMatchObject({error: {code: 'snapshot-mismatch'}, ok: false})
  expect(onSaved).toHaveBeenCalledOnce()
})
