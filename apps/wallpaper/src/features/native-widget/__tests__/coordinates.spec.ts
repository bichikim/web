import {expect, test} from 'vitest'
import {createCoordinateReceiver} from '../coordinates'

test('reconstructs exact words across independent frame buffers and resets', () => {
  const receiver = createCoordinateReceiver()
  const first = new Uint32Array(4)
  const second = new Uint32Array(4)
  const initial = [0, 4, 0, 0x80000000, 0x7fc00001, 0]
  receiver.apply(new Uint32Array(initial), first.buffer)
  receiver.apply(new Uint32Array([0, 1, 13, 3, 1, 15]), second.buffer)
  expect([...first]).toEqual(initial.slice(2))
  expect([...second]).toEqual([13, 0x80000000, 0x7fc00001, 15])
  receiver.apply(new Uint32Array(), first.buffer)
  expect(first).toEqual(second)
  receiver.clear()
  expect(() => receiver.apply(new Uint32Array(), first.buffer)).toThrow('Missing initial')
})
