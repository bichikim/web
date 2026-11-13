/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useMemoSwipe} from '../use-memo-swipe'

const disposers: (() => void)[] = []
const mount = (props: Parameters<typeof useMemoSwipe>[0] = {}) =>
  createRoot((dispose) => {
    disposers.push(dispose)
    return useMemoSwipe(props)
  })
const start = {offset: 0, pointer: 1, x: 200, y: 0}
const position = {extent: 80, offset: 80}
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()))

it('should require eighty percent of the action extent and ignore a hidden zero-width row', async () => {
  const attach = vi.fn().mockResolvedValue(undefined)
  const swipe = mount({onAttach: attach})
  swipe.wheel({horizontal: 80, vertical: 0, zoom: false})
  await swipe.endNative({extent: 0, offset: 80})
  swipe.wheel({horizontal: 80, vertical: 0, zoom: false})
  await swipe.endNative({extent: 80, offset: 63})
  expect(attach).not.toHaveBeenCalled()
  swipe.wheel({horizontal: 80, vertical: 0, zoom: false})
  await swipe.endNative({extent: 80, offset: 64})
  expect(attach).toHaveBeenCalledExactlyOnceWith()
})

it.each([
  {centered: true, remaining: 0},
  {centered: false, remaining: 1},
])('should discard touch intent after an incomplete release: %j', async (release) => {
  const remove = vi.fn()
  const swipe = mount({onRemove: remove})
  swipe.startTouch({interactive: false, touches: 1})
  swipe.endTouch(release)
  await swipe.endNative({extent: 80, offset: -80})
  expect(remove).not.toHaveBeenCalled()
})

it('should attach once after a left pointer swipe and request recentering', async () => {
  const attach = vi.fn().mockResolvedValue(undefined)
  const swipe = mount({onAttach: attach})
  expect(swipe.startPointer(start)).toBe(true)
  expect(swipe.movePointer({pointer: 1, x: 110, y: 0})).toEqual({capture: true, offset: 90})
  expect(swipe.movePointer({pointer: 1, x: 100, y: 0})).toEqual({capture: false, offset: 100})
  expect(attach).not.toHaveBeenCalled()
  await swipe.endPointer({...position, pointer: 1})
  expect(attach).toHaveBeenCalledExactlyOnceWith()
  expect(swipe.dragging()).toBe(false)
  expect(swipe.resetRevision()).toBeGreaterThan(0)
})

it('should remove after a right swipe without attaching', async () => {
  const attach = vi.fn()
  const remove = vi.fn().mockResolvedValue(true)
  const swipe = mount({onAttach: attach, onRemove: remove})
  swipe.startPointer(start)
  swipe.movePointer({pointer: 1, x: 290, y: 0})
  await swipe.endPointer({extent: 80, offset: -80, pointer: 1})
  expect(remove).toHaveBeenCalledExactlyOnceWith()
  expect(attach).not.toHaveBeenCalled()
})

it('should ignore short, vertical and unrelated pointer movement', async () => {
  const attach = vi.fn()
  const remove = vi.fn()
  const swipe = mount({onAttach: attach, onRemove: remove})
  swipe.startPointer(start)
  expect(swipe.movePointer({pointer: 2, x: 100, y: 0})).toBeNull()
  expect(swipe.movePointer({pointer: 1, x: 198, y: 0})).toBeNull()
  await swipe.endPointer({extent: 80, offset: 20, pointer: 1})
  swipe.startPointer(start)
  expect(swipe.movePointer({pointer: 1, x: 198, y: 30})).toBeNull()
  await swipe.endPointer({...position, pointer: 1})
  expect(attach).not.toHaveBeenCalled()
  expect(remove).not.toHaveBeenCalled()
})

it('should cancel a matching pointer or an explicit cancellation', async () => {
  const remove = vi.fn()
  const swipe = mount({onRemove: remove})
  swipe.startPointer(start)
  swipe.movePointer({pointer: 1, x: 290, y: 0})
  swipe.cancelPointer(1)
  await swipe.endPointer({extent: 80, offset: -80, pointer: 1})
  swipe.startPointer(start)
  swipe.movePointer({pointer: 1, x: 290, y: 0})
  swipe.cancel()
  await swipe.endPointer({extent: 80, offset: -80, pointer: 1})
  expect(remove).not.toHaveBeenCalled()
})

it('should require horizontal native wheel intent and consume it only once', async () => {
  const attach = vi.fn().mockResolvedValue(undefined)
  const swipe = mount({onAttach: attach})
  await swipe.endNative(position)
  swipe.wheel({horizontal: 20, vertical: 80, zoom: false})
  await swipe.endNative(position)
  swipe.wheel({horizontal: 80, vertical: 0, zoom: true})
  await swipe.endNative(position)
  expect(attach).not.toHaveBeenCalled()
  swipe.wheel({horizontal: 80, vertical: 0, zoom: false})
  await swipe.endNative(position)
  await swipe.endNative(position)
  expect(attach).toHaveBeenCalledExactlyOnceWith()
})

it('should accept one-finger touch completion and ignore cancelled or interactive touches', async () => {
  const remove = vi.fn().mockResolvedValue(true)
  const swipe = mount({onRemove: remove})
  swipe.startTouch({interactive: true, touches: 1})
  await swipe.endNative({extent: 80, offset: -80})
  swipe.startTouch({interactive: false, touches: 2})
  await swipe.endNative({extent: 80, offset: -80})
  swipe.startTouch({interactive: false, touches: 1})
  swipe.cancel()
  await swipe.endNative({extent: 80, offset: -80})
  expect(remove).not.toHaveBeenCalled()
  swipe.startTouch({interactive: false, touches: 1})
  swipe.endTouch({centered: false, remaining: 0})
  await swipe.endNative({extent: 80, offset: -80})
  expect(remove).toHaveBeenCalledExactlyOnceWith()
})

it('should suppress overlapping actions and recover after a rejected action', async () => {
  const pending = Promise.withResolvers<void>()
  const attach = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(undefined)
  const swipe = mount({onAttach: attach})
  swipe.wheel({horizontal: 80, vertical: 0, zoom: false})
  const action = swipe.endNative(position)
  const failure = expect(action).rejects.toThrow('host unavailable')
  expect(swipe.pending()).toBe(true)
  expect(swipe.startPointer(start)).toBe(false)
  swipe.wheel({horizontal: 80, vertical: 0, zoom: false})
  await swipe.endNative(position)
  expect(attach).toHaveBeenCalledTimes(1)
  pending.reject(new Error('host unavailable'))
  await failure
  expect(swipe.pending()).toBe(false)
  swipe.wheel({horizontal: 80, vertical: 0, zoom: false})
  await swipe.endNative(position)
  expect(attach).toHaveBeenCalledTimes(2)
})

it('should cancel tracked movement when disabled and read the latest callback', async () => {
  const [disabled, setDisabled] = createSignal(false)
  const original = vi.fn()
  const changed = vi.fn().mockResolvedValue(undefined)
  const [attach, setAttach] = createSignal(original)
  const swipe = mount({
    disabled,
    get onAttach() {
      return attach()
    },
  })
  swipe.startPointer(start)
  swipe.movePointer({pointer: 1, x: 100, y: 0})
  setDisabled(true)
  expect(swipe.dragging()).toBe(false)
  await swipe.endPointer({...position, pointer: 1})
  expect(original).not.toHaveBeenCalled()
  setDisabled(false)
  setAttach(() => changed)
  swipe.wheel({horizontal: 80, vertical: 0, zoom: false})
  await swipe.endNative(position)
  expect(changed).toHaveBeenCalledExactlyOnceWith()
})
