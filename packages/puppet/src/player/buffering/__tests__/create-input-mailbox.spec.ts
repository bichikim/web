import {expect, test} from 'vitest'
import {createInputMailbox} from '../create-input-mailbox'
test('should retain newer fields while acknowledging an older in-flight result', () => {
  const mailbox = createInputMailbox()
  mailbox.add({look: {lookTarget: {x: 0.1, y: 0}}, playback: {speed: 2}}, true)
  mailbox.add({look: {lookTarget: {x: 0.7, y: 0}}})
  mailbox.acknowledge(1)
  expect(mailbox.snapshot()).toEqual({
    patch: {look: {lookTarget: {x: 0.7, y: 0}}},
    revision: 2,
    settle: false,
  })
  expect(mailbox.pending()).toBe(true)
  mailbox.acknowledge(2)
  expect(mailbox.pending()).toBe(false)
})
test('should bound accumulated input to the latest control values including explicit clearing', () => {
  const mailbox = createInputMailbox()
  for (let index = 0; index < 1000; index += 1) {
    mailbox.add({lipSyncLevel: index / 1000})
  }
  mailbox.add({lipSyncLevel: undefined, playback: {time: 0}})
  expect(mailbox.snapshot().patch).toEqual({lipSyncLevel: undefined, playback: {time: 0}})
  expect(mailbox.revision()).toBe(1001)
  mailbox.clear()
  expect(mailbox.pending()).toBe(false)
})

test('should acknowledge independent timeline fields separately and replace pending starts with stops', () => {
  const mailbox = createInputMailbox()
  mailbox.add({additional: {1: {speed: 2, time: 0.5}}})
  mailbox.add({additional: {1: {weight: 0.7}}})
  mailbox.acknowledge(1)
  expect(mailbox.snapshot().patch).toEqual({additional: {1: {weight: 0.7}}})
  mailbox.add({additional: {1: null}})
  expect(mailbox.snapshot().patch).toEqual({additional: {1: null}})
})
