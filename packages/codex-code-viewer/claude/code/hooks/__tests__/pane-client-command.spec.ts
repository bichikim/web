import {expect, it} from 'vitest'
import {paneClientCommand} from '../pane-client-command'
const nodes = Array.from({length: 6}, (_, index) => ({
  kind: 'file' as const,
  name: `${index}.ts`,
  openable: true,
  path: `${index}.ts`,
}))

it('should move past the visible tree window and reveal the focused row', () => {
  expect(
    paneClientCommand(
      {direction: 'down', index: 1, kind: 'move', path: '2.ts'},
      {nodes, offset: 1, rows: 2},
    ),
  ).toEqual({kind: 'treeFocus', offset: 2, path: '3.ts'})
  expect(
    paneClientCommand(
      {direction: 'end', index: 0, kind: 'move', path: '1.ts'},
      {nodes, offset: 1, rows: 2},
    ),
  ).toEqual({kind: 'treeFocus', offset: 4, path: '5.ts'})
})
it('should reject stale rows, offscreen activation and unrecognized movement', () => {
  const window = {nodes, offset: 1, rows: 2}
  expect(paneClientCommand({index: 0, kind: 'activate', path: '0.ts'}, window)).toBeUndefined()
  expect(paneClientCommand({index: 2, kind: 'activate', path: '3.ts'}, window)).toBeUndefined()
  expect(
    paneClientCommand({direction: 'anything', index: 0, kind: 'move', path: '1.ts'}, window),
  ).toBeUndefined()
  expect(
    paneClientCommand({action: 'rename', index: 0, kind: 'action', path: '0.ts'}, window),
  ).toBeUndefined()
  expect(
    paneClientCommand({action: 'execute', index: 0, kind: 'action', path: '1.ts'}, window),
  ).toBeUndefined()
})
