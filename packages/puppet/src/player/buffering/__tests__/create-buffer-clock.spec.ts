import {expect, test} from 'vitest'
import {createBufferClock} from '../create-buffer-clock'

test('should predict beyond 30fps when computation and refresh allow it', () => {
  const clock = createBufferClock(1000)
  clock.observeCompute(10)
  clock.observeRefresh(1000 / 120)
  const first = clock.next(1000)
  const second = clock.next(1001)
  expect(first.time - 1000).toBeLessThan(1000 / 30)
  expect(second.deltaTime).toBeLessThan(1 / 30)
  expect(second.time).toBeGreaterThan(first.time)
})

test('should catch up to elapsed wall time rather than slow the motion when computation is late', () => {
  const clock = createBufferClock(0)
  const first = clock.next(0)
  const delayed = clock.next(200)
  expect(delayed.time).toBeGreaterThanOrEqual(200)
  expect((delayed.time - first.time) / 1000).toBe(delayed.deltaTime)
})

test('should retain increasing simulation timestamps while three frames are predicted ahead', () => {
  const clock = createBufferClock(0)
  clock.observeCompute(5)
  const frames = [clock.next(0), clock.next(1), clock.next(2)]
  expect(frames[0]!.time).toBeLessThan(frames[1]!.time)
  expect(frames[1]!.time).toBeLessThan(frames[2]!.time)
  expect(frames.reduce((sum, frame) => sum + frame.deltaTime, 0)).toBeCloseTo(
    frames[2]!.time / 1000,
  )
})

test('should rebase discarded predictions while retaining measured compute capacity', () => {
  const clock = createBufferClock(0)
  clock.observeCompute(20)
  clock.observeRefresh(10)
  clock.next(100)
  clock.rebase(50)
  expect(clock.next(70)).toEqual({deltaTime: 0.04, time: 90})
})
