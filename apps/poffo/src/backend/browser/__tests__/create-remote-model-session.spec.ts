/** @vitest-environment jsdom */
import {expect, test} from 'vitest'
import {renderHook} from '@solidjs/testing-library'
import {createEmptyDocument} from '@winter-love/puppet/player'
import {createModelBackend} from '../../create-model-backend'
import {createCommandService} from '../../create-command-service'
import {encodeModelEvent} from '../../model-events'
import {createRemoteModelSession} from '../create-remote-model-session'

test('should group queued remote gesture edits into one authoritative history step', async () => {
  const initial = createEmptyDocument()
  const host = createModelBackend({document: initial, sessionId: 'shared'})
  const service = createCommandService({model: host})
  let sequence = 0
  let previous = host.read()
  const {result: remote} = renderHook(() =>
    createRemoteModelSession({
      initial: host.read(),
      send: async (operation, input) => ({
        ...(await service.execute({input, operation, requestId: crypto.randomUUID()})),
        sequence,
      }),
    }),
  )
  const unsubscribe = host.subscribe((view) => {
    sequence += 1
    remote.receive(encodeModelEvent(view, sequence, previous))
    previous = view
  })
  const origin = {ownerId: 'gui', requestId: 'begin', transactionId: 'drag'}
  const begin = remote.binding.request({...origin, type: 'begin'})
  const edit = remote.binding.request({
    ...origin,
    document: {...initial, framesPerSecond: 48},
    expectedRevision: 0,
    requestId: 'edit',
    type: 'edit',
  })
  const commit = remote.binding.request({...origin, requestId: 'commit', type: 'commit'})
  expect(remote.binding.document().framesPerSecond).toBe(48)
  expect((await begin).ok).toBe(true)
  expect((await edit).ok).toBe(true)
  expect((await commit).ok).toBe(true)
  expect(host.read().document.framesPerSecond).toBe(48)
  expect(host.read().undoCount).toBe(1)
  expect(remote.binding.read().undoCount).toBe(1)
  expect(remote.failure()).toBeNull()
  unsubscribe()
})

test('should wait for host completion and resolve a disconnected in-flight request', async () => {
  const {result: remote} = renderHook(() =>
    createRemoteModelSession({
      initial: createModelBackend({document: createEmptyDocument(), sessionId: 'shared'}).read(),
      send: () => new Promise(() => {}),
    }),
  )
  let settled = false
  const pending = Promise.resolve(
    remote.binding.request({
      ownerId: 'gui',
      requestId: 'begin',
      transactionId: 'drag',
      type: 'begin',
    }),
  ).then((result) => {
    settled = true
    return result
  })
  expect(settled).toBe(false)
  remote.disconnect('connection lost')
  expect(await pending).toEqual({error: {code: 'inactive'}, ok: false})
  expect(remote.failure()).toBe('connection lost')
})
