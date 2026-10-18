import {expect, it, vi} from 'vitest'
import {receivePaneMessage} from '../pane-messages.js'

vi.mock('../pane-editor.js', () => ({receiveEditor: vi.fn(), scrollEditorHorizontal: vi.fn()}))
vi.mock('../control-state.js', () => ({controlCommand: vi.fn()}))
vi.mock('../pane-popover.js', () => ({closePopover: vi.fn()}))

it('should update divider motion without entering the ordered document I/O queue', async () => {
  const resize = vi.fn().mockResolvedValue(undefined)
  const execute = vi.fn()
  const context = {execute, resize, tree: () => ({nodes: [], offset: 0, rows: 0})}
  const engine = {ui: {invalidate: vi.fn()}}
  await receivePaneMessage(
    engine,
    {data: {commit: false, kind: 'resize', value: '310px'}, element: 'panel-divider'},
    context,
  )
  await receivePaneMessage(
    engine,
    {data: {commit: true, kind: 'resize', value: '310px'}, element: 'panel-divider'},
    context,
  )
  expect(resize.mock.calls).toEqual([
    ['310px', false],
    ['310px', true],
  ])
  expect(execute).not.toHaveBeenCalled()
})

it('should reject malformed widths before they reach layout state', async () => {
  const resize = vi.fn()
  await receivePaneMessage(
    {ui: {invalidate: vi.fn()}},
    {data: {commit: true, kind: 'resize', value: '1px'}, element: 'panel-divider'},
    {resize, tree: () => ({nodes: [], offset: 0, rows: 0})},
  )
  expect(resize).not.toHaveBeenCalled()
})

it('should accept the replacement divider without dropping legacy final-width messages', async () => {
  const resize = vi.fn().mockResolvedValue(undefined)
  const execute = vi.fn()
  const context = {execute, resize, tree: () => ({nodes: [], offset: 0, rows: 0})}
  const engine = {ui: {invalidate: vi.fn()}}
  await receivePaneMessage(
    engine,
    {data: {commit: true, kind: 'resize', value: '200px'}, element: 'panel-divider:local-width'},
    context,
  )
  await receivePaneMessage(
    engine,
    {data: {commit: true, kind: 'resize', value: '336px'}, element: 'panel-divider'},
    context,
  )
  expect(resize.mock.calls).toEqual([
    ['200px', true],
    ['336px', true],
  ])
  expect(execute).not.toHaveBeenCalled()
})
