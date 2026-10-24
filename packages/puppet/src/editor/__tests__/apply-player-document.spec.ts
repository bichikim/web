import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player'
import {createPlayerFixture} from './fixtures/player'
import {applyPlayerDocument} from '../apply-player-document'

test('should select the requested motion after restoring the full runtime document', () => {
  const document = createDemoDocument()
  const player = createPlayerFixture()
  expect(applyPlayerDocument(player, document, {motionId: 'tap'})).toBe(true)
  expect(player.setMotion).toHaveBeenCalledExactlyOnceWith('tap')
  expect(player.seek).not.toHaveBeenCalled()
})

test('should restore a recorded position only when the motion exists in the updated document', () => {
  const document = createDemoDocument()
  const player = createPlayerFixture()
  vi.mocked(player.setMotion).mockReturnValueOnce(false)
  applyPlayerDocument(player, document, {motionId: 'missing', resumeTime: 2.5})
  expect(player.seek).not.toHaveBeenCalled()
  applyPlayerDocument(player, document, {motionId: 'idle', resumeTime: 2.5})
  expect(player.seek).toHaveBeenCalledExactlyOnceWith(2.5)
})

test('should leave incompatible renderers and omitted motion controls untouched', () => {
  const document = createDemoDocument()
  const player = createPlayerFixture()
  vi.mocked(player.updateDocument).mockReturnValueOnce(false)
  expect(applyPlayerDocument(player, document, {motionId: 'idle'})).toBe(false)
  expect(player.setMotion).not.toHaveBeenCalled()
  expect(applyPlayerDocument(player, document, {})).toBe(true)
  expect(player.setMotion).not.toHaveBeenCalled()
})

test('should keep playback progressing when an edit preserves the motion collection', () => {
  const previous = createDemoDocument()
  const document = {...previous, parts: previous.parts.slice()}
  const player = createPlayerFixture()
  applyPlayerDocument(player, document, {motionId: 'idle'}, previous)
  expect(player.setMotion).not.toHaveBeenCalled()
  expect(player.seek).not.toHaveBeenCalled()
})
