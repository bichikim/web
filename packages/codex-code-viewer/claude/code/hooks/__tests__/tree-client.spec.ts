import {readField} from './read-field'
import {expect, it, vi} from 'vitest'
import TreeClient from '../tree-client.js'

const setup = () => {
  let state: unknown
  let pointer: (event: unknown) => void = vi.fn()
  const post = vi.fn()
  const surface = {
    columns: 40,
    elements: {Box: (props: unknown) => props, Text: vi.fn()},
    onKey: vi.fn(),
    onPointer: (listener: typeof pointer) => {
      pointer = listener
    },
    post,
    setState: (next: unknown) => {
      state = next
    },
    get state() {
      return state
    },
  }
  const props = {
    active: 'a.ts',
    columns: 40,
    cursor: '',
    rows: [{path: 'a.ts'}, {path: 'b.ts'}, {path: 'c.ts'}],
  }
  return {pointer: (event: unknown) => pointer(event), post, props, surface}
}

it('should route the painted row after repeated local width changes without posting from renders', () => {
  const {pointer, post, props, surface} = setup()
  const samples = 2000
  for (let index = 0; index < samples; index += 1) {
    surface.columns = index % 2 === 0 ? 25 : 60
    const drawing = TreeClient(props, surface)
    expect(drawing.children).toHaveLength(props.rows.length)
    expect(
      drawing.children.every(
        (row: unknown) => readField(row, 'height') === 1 && readField(row, 'flexShrink') === 0,
      ),
    ).toBe(true)
  }
  expect(post).not.toHaveBeenCalled()
  pointer({button: 'left', type: 'down', x: 4, y: 1})
  expect(post).toHaveBeenLastCalledWith({
    index: 1,
    kind: 'activate',
    path: 'b.ts',
    point: {x: 4, y: 1},
  })
})

it('should change hover only across rows and ignore a late leave from the previous row', () => {
  const {pointer, post, props, surface} = setup()
  TreeClient(props, surface)
  pointer({type: 'move', x: 4, y: 1})
  pointer({type: 'move', x: 8, y: 1})
  pointer({type: 'move', x: 4, y: 2})
  pointer({type: 'leave', x: 4, y: 1})
  pointer({type: 'leave', x: 4, y: 2})
  expect(post.mock.calls).toEqual([
    [{active: true, index: 1, kind: 'hover', path: 'b.ts'}],
    [{active: true, index: 2, kind: 'hover', path: 'c.ts'}],
    [{active: false, index: 2, kind: 'hover', path: 'c.ts'}],
  ])
})
