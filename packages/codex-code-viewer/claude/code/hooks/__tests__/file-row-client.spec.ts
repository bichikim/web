import {expect, it, vi} from 'vitest'
import FileRowClient from '../file-row-client.js'

it('should recover hover when the host redraw loses pointer release after activating a row', () => {
  let pointer: (event: unknown) => void = vi.fn()
  let state
  const post = vi.fn()
  const surface = {
    elements: {Box: vi.fn(), Text: vi.fn()},
    onKey: vi.fn(),
    onPointer: (listener: typeof pointer) => {
      pointer = listener
    },
    post,
    setState: (next) => {
      state = next
    },
    get state() {
      return state
    },
  }
  const props = {
    columns: 30,
    index: 1,
    keyboard: {index: 1, row: {path: 'a.ts'}},
    row: {path: 'a.ts'},
  }
  FileRowClient(props, surface)
  pointer({button: 'left', type: 'down', x: 4, y: 0})
  FileRowClient(props, surface)
  pointer({type: 'move', x: 5, y: 0})
  expect(post).toHaveBeenLastCalledWith({active: true, index: 1, kind: 'hover', path: 'a.ts'})
  pointer({type: 'leave', x: 5, y: 0})
  expect(post).toHaveBeenLastCalledWith({active: false, index: 1, kind: 'hover', path: 'a.ts'})
})
