import {expect, test} from 'vitest'

import {PUPPET_SPATIAL_OBJECT_MAX_DEPTH, type PuppetSpatialObject} from '../../../player'
import {
  canCombineSpatialEditorObjects,
  combineSpatialEditorObjects,
  createSpatialEditorObject,
  duplicateSpatialEditorObject,
  removeSpatialEditorObject,
  splitSpatialEditorObject,
} from '../spatial-editor-objects'

const createNestedGroup = (depth: number): PuppetSpatialObject => {
  const bounds = {height: 100, width: 100, x: 0, y: 0}
  let object: PuppetSpatialObject = createSpatialEditorObject(bounds, 'box')
  for (let index = 0; index < depth; index += 1) {
    object = {
      children: [object, createSpatialEditorObject(bounds, 'sphere')],
      id: `group-${index}`,
      kind: 'group',
      mode: 'add',
      name: '합친 메시',
      visible: true,
    }
  }
  return object
}

test('should keep three primitives separate until two selected objects are combined and preserve the third', () => {
  const bounds = {height: 100, width: 100, x: 0, y: 0}
  const box = createSpatialEditorObject(bounds, 'box')
  const prism = createSpatialEditorObject(bounds, 'prism')
  const sphere = createSpatialEditorObject(bounds, 'sphere')
  const combined = combineSpatialEditorObjects([box, prism, sphere], [box.id, prism.id], 'add')

  expect(combined).toHaveLength(2)
  expect(combined[0]).toMatchObject({children: [{id: box.id}, {id: prism.id}], kind: 'group'})
  expect(combined[1]?.id).toBe(sphere.id)
  expect(splitSpatialEditorObject(combined, combined[0]!.id).map((object) => object.id)).toEqual([
    box.id,
    prism.id,
    sphere.id,
  ])
})

test('should give every child of a duplicated group a new identity', () => {
  const bounds = {height: 100, width: 100, x: 0, y: 0}
  const box = createSpatialEditorObject(bounds, 'box')
  const sphere = createSpatialEditorObject(bounds, 'sphere')
  const original = combineSpatialEditorObjects([box, sphere], [box.id, sphere.id], 'add')[0]!
  const copy = duplicateSpatialEditorObject(original)

  expect(copy.id).not.toBe(original.id)
  expect(copy.kind).toBe('group')
  if (copy.kind === 'group') {
    expect(copy.children.map((child) => child.id)).not.toEqual([box.id, sphere.id])
  }
})

test('should remove a child from a combined mesh and promote the next shape to its base', () => {
  const bounds = {height: 100, width: 100, x: 0, y: 0}
  const box = createSpatialEditorObject(bounds, 'box')
  const sphere = createSpatialEditorObject(bounds, 'sphere')
  const group = combineSpatialEditorObjects([box, sphere], [box.id, sphere.id], 'subtract')[0]!
  const remaining = removeSpatialEditorObject([group], box.id)

  expect(remaining).toMatchObject([{id: sphere.id, kind: 'primitive', mode: 'add'}])
  expect(removeSpatialEditorObject(remaining, sphere.id)).toEqual([])
})

test('should prevent combining objects beyond the persisted nesting limit', () => {
  const deepGroup = createNestedGroup(PUPPET_SPATIAL_OBJECT_MAX_DEPTH)
  const shape = createSpatialEditorObject({height: 100, width: 100, x: 0, y: 0}, 'box')
  const objects = [deepGroup, shape]

  expect(canCombineSpatialEditorObjects(objects, [deepGroup.id, shape.id])).toBe(false)
  expect(combineSpatialEditorObjects(objects, [deepGroup.id, shape.id], 'add')).toBe(objects)
})
