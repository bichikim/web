import {expect, test} from 'vitest'
import {createGraphElements} from '../create-graph-elements'
const parameters = [
  {defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'},
  {defaultValue: 0, id: 'other', maximum: 1, minimum: 0, name: 'Other'},
]
const mapping = {
  enabled: true,
  input: 'mouthOpen' as const,
  inputMaximum: 1,
  inputMinimum: 0,
  outputMaximum: 1,
  outputMinimum: 0,
  parameterId: 'mouth',
  smoothing: 0,
}
test('should retain measured geometry and user placement when connection settings change', () => {
  const previous = [
    {
      data: {},
      id: 'mapping:mouth',
      measured: {height: 200, width: 256},
      position: {x: 410, y: 150},
      type: 'correction',
    },
  ]
  const result = createGraphElements({
    mappings: [{...mapping, multiplier: 20}],
    parameters,
    preservePositions: true,
    previous,
  })
  expect(result.nodes.find((node) => node.id === 'mapping:mouth')).toMatchObject({
    measured: {height: 200, width: 256},
    position: {x: 410, y: 150},
  })
  expect(result.edges.map((edge) => [edge.source, edge.target])).toEqual([
    ['tracking', 'mapping:mouth'],
    ['mapping:mouth', 'parameter:mouth'],
  ])
})
test('should arrange a new group without reusing positions that overlap its new cards', () => {
  const previous = [{data: {}, id: 'mapping:mouth', position: {x: 270, y: 0}, type: 'correction'}]
  const result = createGraphElements({
    mappings: [{...mapping, parameterId: 'other'}, mapping],
    parameters,
    preservePositions: false,
    previous,
  })
  const positions = result.nodes
    .filter((node) => node.type === 'correction')
    .map((node) => node.position.y)
  expect(new Set(positions).size).toBe(2)
})

test('should create independent target nodes and remove parent constraints when ungrouping', () => {
  const grouped = createGraphElements({
    groups: [{id: 'folder', mode: 'folder', name: 'Folder', parameterIds: ['mouth']}],
    mappings: [mapping],
    parameters,
    preservePositions: false,
    previous: [],
  })
  const child = grouped.nodes.find((node) => node.id === 'parameter:mouth')!
  expect(child.parentId).toBe('parameter:group:folder')
  expect(grouped.nodes.some((node) => node.id === 'parameters')).toBe(false)
  const ungrouped = createGraphElements({
    mappings: [mapping],
    parameters,
    preservePositions: true,
    previous: grouped.nodes,
  })
  const independent = ungrouped.nodes.find((node) => node.id === 'parameter:mouth')!
  expect(independent.parentId).toBeUndefined()
  expect(independent.extent).toBeUndefined()
  expect(independent.position).not.toEqual(child.position)
})

test('should pack grouped parameters into full-width rows and close gaps after removal', () => {
  const group = {
    id: 'folder',
    mode: 'folder' as const,
    name: 'Folder',
    parameterIds: ['mouth', 'other'],
  }
  const grouped = createGraphElements({
    groups: [group],
    mappings: [mapping],
    parameters,
    preservePositions: false,
    previous: [],
  })
  expect(
    grouped.nodes.filter((node) => node.parentId !== undefined).map((node) => node.position),
  ).toEqual([
    {x: 0, y: 40},
    {x: 0, y: 80},
  ])
  const reduced = createGraphElements({
    groups: [{...group, parameterIds: ['other']}],
    mappings: [mapping],
    parameters,
    preservePositions: true,
    previous: grouped.nodes,
  })
  expect(reduced.nodes.find((node) => node.id === 'parameter:other')?.position).toEqual({
    x: 0,
    y: 40,
  })
})

test('should draw a direct input edge without a correction card', () => {
  const result = createGraphElements({
    mappings: [{...mapping, direct: true}],
    parameters,
    preservePositions: false,
    previous: [],
  })
  expect(result.nodes.some((node) => node.type === 'correction')).toBe(false)
  expect(result.edges).toMatchObject([
    {source: 'tracking', sourceHandle: 'mouthOpen', target: 'parameter:mouth'},
  ])
})

test('should retain existing card positions when appending a correction', () => {
  const previous = [{data: {}, id: 'mapping:mouth', position: {x: 410, y: 170}, type: 'correction'}]
  const result = createGraphElements({
    mappings: [mapping, {...mapping, parameterId: 'draft:new'}],
    parameters,
    preservePositions: true,
    previous,
  })
  expect(result.nodes.find((node) => node.id === 'mapping:mouth')?.position).toEqual({
    x: 410,
    y: 170,
  })
})
test('should hide collapsed group members and their edges while retaining the group node', () => {
  const group = {
    collapsed: true,
    id: 'one',
    mode: 'folder' as const,
    name: 'One',
    parameterIds: ['mouth'],
  }
  const result = createGraphElements({
    groups: [group],
    mappings: [mapping],
    parameters,
    preservePositions: false,
    previous: [],
  })
  expect(result.nodes.some((node) => node.id === 'parameter:group:one')).toBe(true)
  expect(result.nodes.some((node) => node.id === 'parameter:mouth')).toBe(false)
  expect(result.edges.some((edge) => edge.target === 'parameter:mouth')).toBe(false)
})
