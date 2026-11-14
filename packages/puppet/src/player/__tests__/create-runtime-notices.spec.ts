import {expect, test} from 'vitest'
import {createRuntimeNotices} from '../create-runtime-notices'
test('should retain unacknowledged notices across skipped frames and remove acknowledged notices', () => {
  const queue = createRuntimeNotices()
  queue.emit({completion: 8, kind: 'completion'})
  queue.emit({event: {motionId: 'walk', time: 0.2, value: 'step'}, kind: 'event'})
  const snapshot = structuredClone(queue.capture())
  queue.acknowledge(1)
  expect(queue.capture().pending.map((row) => row.sequence)).toEqual([2])
  queue.restore(snapshot)
  queue.emit({completion: 9, kind: 'completion'})
  expect(queue.capture().pending.map((row) => row.sequence)).toEqual([1, 2, 3])
  queue.acknowledge(3)
  expect(queue.capture().pending).toEqual([])
})
