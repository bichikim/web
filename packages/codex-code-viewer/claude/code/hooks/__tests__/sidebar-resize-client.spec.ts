import {expect, it, vi} from 'vitest'
import SidebarResizeClient from '../sidebar-resize-client.js'

it('should retain a held drag across leave and enter events until pointer release', () => {
  const listeners: {
    pointer?: (event: {type: string; button?: string; x: number; y: number}) => void
  } = {}
  const post = vi.fn()
  SidebarResizeClient(
    {columns: 100, rows: 10, value: '288px'},
    {
      columns: 37,
      elements: {Box: vi.fn(), Text: vi.fn()},
      onKey: vi.fn(),
      onPointer: (listener: NonNullable<typeof listeners.pointer>) => {
        listeners.pointer = listener
      },
      post,
      setState: vi.fn(),
      state: undefined,
    },
  )
  listeners.pointer?.({button: 'left', type: 'down', x: 0, y: 0})
  listeners.pointer?.({type: 'leave', x: -2, y: 0})
  listeners.pointer?.({type: 'enter', x: -2, y: 0})
  listeners.pointer?.({button: 'left', type: 'move', x: -10, y: 0})
  listeners.pointer?.({button: 'left', type: 'up', x: -10, y: 0})
  listeners.pointer?.({type: 'leave', x: -10, y: 0})
  listeners.pointer?.({type: 'enter', x: 0, y: 0})
  listeners.pointer?.({type: 'move', x: -20, y: 0})
  expect(post.mock.calls).toEqual([[{commit: true, kind: 'resize', value: '368px'}]])
})

it('should begin from the visible constrained width after the outer pane becomes narrower', () => {
  const listeners: {
    pointer?: (event: {type: string; button?: string; x: number; y: number}) => void
  } = {}
  const post = vi.fn()
  SidebarResizeClient(
    {columns: 60, rows: 10, value: '320px'},
    {
      columns: 30,
      elements: {Box: vi.fn(), Text: vi.fn()},
      onKey: vi.fn(),
      onPointer: (listener: NonNullable<typeof listeners.pointer>) => {
        listeners.pointer = listener
      },
      post,
      setState: vi.fn(),
      state: {columns: 100, received: '320px', width: 320},
    },
  )
  listeners.pointer?.({button: 'left', type: 'down', x: 0, y: 0})
  listeners.pointer?.({button: 'left', type: 'move', x: 6, y: 0})
  listeners.pointer?.({button: 'left', type: 'up', x: 6, y: 0})
  expect(post.mock.calls).toEqual([[{commit: true, kind: 'resize', value: '200px'}]])
})

it('should use fine pointer coordinates and keep the latest drag across prop updates', () => {
  let pointer: (event: unknown) => void = vi.fn()
  let state
  const post = vi.fn()
  const surface = {
    get columns() {
      return ((state?.width ?? 288) + 8) / 8
    },
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
  SidebarResizeClient({columns: 100, rows: 10, value: '288px'}, surface)
  pointer({button: 'left', fine: {x: 0.25, y: 0}, type: 'down', x: 0, y: 0})
  pointer({button: 'left', fine: {x: -1, y: 0}, type: 'move', x: -1, y: 0})
  expect(state.width).toBe(298)
  expect(post).not.toHaveBeenCalled()
  SidebarResizeClient({columns: 100, rows: 10, value: '298px'}, surface)
  pointer({button: 'left', fine: {x: -1.25, y: 0}, type: 'move', x: -2, y: 0})
  pointer({button: 'left', type: 'up', x: -2, y: 0})
  expect(post).toHaveBeenLastCalledWith({commit: true, kind: 'resize', value: '310px'})
})

it('should keep dense drag input local and send only one final width per gesture', () => {
  let pointer: (event: unknown) => void = vi.fn()
  let state
  const post = vi.fn()
  const surface = {
    get columns() {
      return ((state?.width ?? 288) + 8) / 8
    },
    elements: {Box: (props) => props, Text: vi.fn()},
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
  const props = {columns: 100, rows: 10, value: '288px'}
  SidebarResizeClient(props, surface)
  pointer({button: 'left', type: 'down', x: 0, y: 0})
  const samples = 2000
  for (let index = 0; index < samples; index += 1) {
    const delta = (index % 20) - 10
    const x = surface.columns - 37 + delta
    pointer({button: 'left', fine: {x, y: 0}, type: 'move', x: Math.floor(x), y: 0})
    const drawing = SidebarResizeClient(props, surface)
    expect(drawing.width).toBe((288 - delta * 8) / 8 + 1)
  }
  expect(post).not.toHaveBeenCalled()
  pointer({button: 'left', type: 'up', x: 0, y: 0})
  expect(post.mock.calls).toEqual([[{commit: true, kind: 'resize', value: '216px'}]])
})
