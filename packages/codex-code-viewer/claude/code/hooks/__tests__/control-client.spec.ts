import {expect, it, vi} from 'vitest'
import ControlClient from '../control-client.js'

it('should activate a quick pointer gesture before the next surface frame exactly once', () => {
  const listeners: {
    pointer?: (event: {type: string; button?: string; x: number; y: number}) => void
  } = {}
  const post = vi.fn()
  ControlClient(
    {columns: 8, generation: 1, rows: 2},
    {
      columns: 8,
      elements: {Box: vi.fn(), Text: vi.fn()},
      onKey: vi.fn(),
      onPointer: (listener: NonNullable<typeof listeners.pointer>) => {
        listeners.pointer = listener
      },
      post,
      rows: 2,
      setState: vi.fn(),
      state: undefined,
    },
  )
  listeners.pointer?.({button: 'left', type: 'down', x: 1, y: 0})
  listeners.pointer?.({type: 'leave', x: 1, y: 0})
  listeners.pointer?.({type: 'enter', x: 1, y: 0})
  listeners.pointer?.({button: 'left', type: 'up', x: 1, y: 0})
  listeners.pointer?.({button: 'left', type: 'up', x: 1, y: 0})
  listeners.pointer?.({button: 'left', type: 'down', x: 1, y: 0})
  listeners.pointer?.({button: 'left', type: 'up', x: -1, y: 0})
  expect(post.mock.calls).toEqual([[{generation: 1, kind: 'press'}]])
})
