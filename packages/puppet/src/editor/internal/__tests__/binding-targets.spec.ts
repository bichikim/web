import {expect, test} from 'vitest'
import {getParameterTargetNodeIds} from '../binding-targets'
import {createDemoDocument} from '../../../player'
import type {PuppetParameterBinding1D} from '../../../player/document'

const binding: PuppetParameterBinding1D = {
  id: 'join',
  keyforms: [{parts: [{partId: 'first', vertices: []}], values: [0]}],
  parameterIds: ['x'],
  targetGlueIds: ['seam'],
}

test('should reuse target membership while tracking replaced Glue endpoints and bindings', () => {
  const source = createDemoDocument()
  const glue = {
    first: {partId: 'first', vertexIndex: 0},
    id: 'seam',
    second: {partId: 'second', vertexIndex: 0},
    strength: 1,
    weight: 0.5,
  }
  const document = {...source, glue: [glue]}
  const targets = getParameterTargetNodeIds(binding, document)
  expect(targets).toEqual(['first', 'second'])
  expect(getParameterTargetNodeIds(binding, document)).toBe(targets)
  expect(getParameterTargetNodeIds(binding)).toEqual(['first'])
  expect(
    getParameterTargetNodeIds(binding, {
      ...document,
      glue: [{...glue, second: {...glue.second, partId: 'replacement'}}],
    }),
  ).toEqual(['first', 'replacement'])
  expect(getParameterTargetNodeIds({...binding, targetPartIds: []}, source)).toEqual([])
  expect(getParameterTargetNodeIds(binding, document)).toBe(targets)
})
