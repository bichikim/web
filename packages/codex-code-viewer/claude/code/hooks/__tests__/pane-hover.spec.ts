import {expect, it} from 'vitest'
import {changePaneHover, paneHover} from '../pane-hover.js'

it('should keep the new row highlighted when the previous row leaves later', () => {
  const window = {nodes: [{path: 'a.ts'}, {path: 'b.ts'}], offset: 0, rows: 2}
  changePaneHover('file-tree', {active: true, index: 0, kind: 'hover', path: 'a.ts'}, window)
  changePaneHover('file-tree', {active: true, index: 1, kind: 'hover', path: 'b.ts'}, window)
  changePaneHover('file-tree', {active: false, index: 0, kind: 'hover', path: 'a.ts'}, window)
  expect(paneHover().tree).toBe('b.ts')
  changePaneHover('file-tree', {active: false, index: 1, kind: 'hover', path: 'b.ts'}, window)
  expect(paneHover().tree).toBe('')
})

it('should reject an outdated row after scrolling without clearing the current hover', () => {
  const window = {nodes: [{path: 'a.ts'}, {path: 'b.ts'}], offset: 1, rows: 1}
  changePaneHover('file-tree', {active: true, index: 0, kind: 'hover', path: 'b.ts'}, window)
  expect(
    changePaneHover('file-tree', {active: false, index: 0, kind: 'hover', path: 'a.ts'}, window),
  ).toBe(false)
  expect(paneHover().tree).toBe('b.ts')
  changePaneHover('file-tree', {active: false, index: 0, kind: 'hover', path: 'b.ts'}, window)
})

it('should accept a legacy leave only for the row that still owns the highlight', () => {
  const window = {nodes: [{path: 'a.ts'}, {path: 'b.ts'}], offset: 0, rows: 2}
  changePaneHover('file-tree', {index: 1, kind: 'hover', path: 'b.ts'}, window)
  changePaneHover('file-tree', {index: 0, kind: 'hover', path: ''}, window)
  expect(paneHover().tree).toBe('b.ts')
  changePaneHover('file-tree', {index: 1, kind: 'hover', path: ''}, window)
  expect(paneHover().tree).toBe('')
})
