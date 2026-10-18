import {expect, test} from 'vitest'
import {applyWorkspacePositions, parseWorkspaceLayout} from '../workspace-layout'
const layout = {
  collapsedCorrections: [],
  collapsedGroups: [],
  collapsedInputs: [],
  extraPorts: [],
  hiddenIds: [],
  positions: [{id: 'card', x: -12, y: 34}],
  signature: 'model',
  version: 1,
}
test('should reject another model, invalid positions and duplicate identifiers', () => {
  expect(parseWorkspaceLayout(layout, 'model')).toEqual(layout)
  expect(parseWorkspaceLayout(layout, 'other')).toBeUndefined()
  expect(
    parseWorkspaceLayout({...layout, positions: [{id: 'card', x: Infinity, y: 0}]}, 'model'),
  ).toBeUndefined()
  expect(
    parseWorkspaceLayout(
      {...layout, positions: [...layout.positions, ...layout.positions]},
      'model',
    ),
  ).toBeUndefined()
})
test('should restore root positions while preserving group member layout', () => {
  const nodes = [
    {data: {}, id: 'card', position: {x: 0, y: 0}},
    {data: {}, id: 'child', parentId: 'group', position: {x: 0, y: 40}},
  ]
  const restored = applyWorkspacePositions(nodes, [
    ...layout.positions,
    {id: 'child', x: 999, y: 999},
  ])
  expect(restored[0]?.position).toEqual({x: -12, y: 34})
  expect(restored[1]).toBe(nodes[1])
})
