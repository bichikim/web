import {expect, test} from 'vitest'
import {dropParameter} from '../drop-parameter'
const groups = [
  {id: 'one', mode: 'folder' as const, name: 'One', parameterIds: [] as string[]},
  {id: 'two', mode: 'broadcast' as const, name: 'Two', parameterIds: [] as string[]},
]
const containers = groups.map((group, index) => ({
  data: {},
  id: `parameter:group:${group.id}`,
  measured: {height: 200, width: 288},
  position: {x: index * 400, y: 0},
  type: 'parameterGroup',
}))
test('should include a dropped parameter below the group header', () => {
  const node = {data: {}, id: 'parameter:mouth', position: {x: 30, y: 60}, type: 'parameters'}
  const result = dropParameter({groups, node, nodes: [...containers, node]})!
  expect(result.groups[0].parameterIds).toEqual(['mouth'])
  expect(result.node).toMatchObject({parentId: 'parameter:group:one', position: {x: 0, y: 40}})
})
test('should move between groups without duplicate membership', () => {
  const node = {
    data: {},
    id: 'parameter:mouth',
    parentId: 'parameter:group:one',
    position: {x: 430, y: 60},
    type: 'parameters',
  }
  const result = dropParameter({
    groups: [{...groups[0], parameterIds: ['mouth']}, groups[1]],
    node,
    nodes: [...containers, node],
  })!
  expect(result.groups.map((group) => group.parameterIds)).toEqual([[], ['mouth']])
  expect(result.node.position).toEqual({x: 0, y: 64})
})
test('should detach outside a group and retain the dropped placement', () => {
  const node = {
    data: {},
    id: 'parameter:mouth',
    parentId: 'parameter:group:two',
    position: {x: 400, y: 60},
    type: 'parameters',
  }
  const result = dropParameter({
    groups: [groups[0], {...groups[1], parameterIds: ['mouth']}],
    node,
    nodes: [...containers, node],
  })!
  expect(result.groups[1].parameterIds).toEqual([])
  expect(result.node.parentId).toBeUndefined()
  expect(result.node.position).toEqual({x: 800, y: 60})
})

const bindings = ['mouth', 'other', 'group:two'].map((parameterId) => ({
  enabled: true,
  input: 'manualValue' as const,
  inputMaximum: 1,
  inputMinimum: 0,
  outputMaximum: 1,
  outputMinimum: 0,
  parameterId,
  smoothing: 0,
}))
test('should disconnect only the entering parameter when dropped into a broadcast group', () => {
  const node = {data: {}, id: 'parameter:mouth', position: {x: 430, y: 60}, type: 'parameters'}
  const result = dropParameter({groups, mappings: bindings, node, nodes: [...containers, node]})!
  expect(result.mappings.map((mapping) => mapping.parameterId)).toEqual(['other', 'group:two'])
})
test('should keep individual bindings when dropped into an organizing group', () => {
  const node = {data: {}, id: 'parameter:mouth', position: {x: 30, y: 60}, type: 'parameters'}
  const result = dropParameter({groups, mappings: bindings, node, nodes: [...containers, node]})!
  expect(result.mappings).toEqual(bindings)
})
