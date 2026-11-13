import {expect, test} from 'vitest'
import {arrangeGraphNodes} from '../arrange-graph-nodes'
import type {Node} from '@dschz/solid-flow'
const card = (id: string, height: number): Node => ({
  data: {},
  id,
  measured: {height, width: 256},
  position: {x: 400, y: 900},
  type: 'correction',
})
test('should space collapsed and expanded cards using their measured heights', () => {
  const result = arrangeGraphNodes([
    card('collapsed', 100),
    card('expanded', 480),
    card('last', 100),
  ])
  expect(result.map((node) => node.position)).toEqual([
    {x: 270, y: 0},
    {x: 270, y: 140},
    {x: 270, y: 660},
  ])
})
test('should arrange each column independently and preserve group member coordinates', () => {
  const child = {
    ...card('member', 40),
    parentId: 'group',
    position: {x: 0, y: 40},
    type: 'parameters',
  }
  const result = arrangeGraphNodes([
    card('correction', 480),
    {...card('group', 40), type: 'parameterGroup'},
    {...card('group2', 200), type: 'parameterGroup'},
    child,
    {...card('output', 40), type: 'parameters'},
  ])
  expect(result.map((node) => node.position)).toEqual([
    {x: 270, y: 0},
    {x: 1000, y: 0},
    {x: 1000, y: 80},
    {x: 0, y: 40},
    {x: 650, y: 0},
  ])
  expect(result[3]).toBe(child)
})
