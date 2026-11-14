import {expect, test, vi} from 'vitest'
import type {PuppetMotion} from '../../document'
import {createSelectedPlayback} from '../create-selected-playback'

const motions: PuppetMotion[] = [
  {duration: 3, fadeOutTime: 1, id: 'walk', tracks: []},
  {duration: 2, id: 'idle', tracks: []},
]

test('should restore selected and fading motions using the receiving document identities', () => {
  const original = createSelectedPlayback({motionId: 'walk', motions})
  original.advance(0.4)
  original.playMotion('idle')
  original.advance(0.1)
  const copy = structuredClone(motions)
  const restored = createSelectedPlayback({motions: copy})
  restored.restore(original.capture())
  expect(restored.getFrame()).toEqual(original.getFrame())
  expect(restored.frames()).toEqual(original.frames())
  expect(restored.frames().every((frame) => copy.includes(frame.motion))).toBe(true)
  original.advance(0.2)
  restored.advance(0.2)
  expect(restored.frames()).toEqual(original.frames())
})

test('should report a caller completion callback without speculatively invoking it', () => {
  const playback = createSelectedPlayback({motions})
  const complete = vi.fn()
  playback.play({loop: false, onComplete: complete})
  structuredClone(playback.capture())
  expect(complete).not.toHaveBeenCalled()
  playback.advance(3)?.()
  expect(complete).toHaveBeenCalledOnce()
})

test('should transfer completion tokens and emit them only when the receiving runtime advances', () => {
  const source = createSelectedPlayback({motions})
  source.play({completion: 11, loop: false})
  const onCompletion = vi.fn()
  const receiver = createSelectedPlayback({motions: structuredClone(motions), onCompletion})
  receiver.restore(structuredClone(source.capture()))
  expect(onCompletion).not.toHaveBeenCalled()
  receiver.advance(3)?.()
  expect(onCompletion).toHaveBeenCalledExactlyOnceWith(11)
  receiver.advance(0.5)?.()
  expect(onCompletion).toHaveBeenCalledOnce()
})
