import {expect, test} from 'vitest'
import {createDemoDocument, getDocumentScene, type PuppetSceneNode} from '../../../player'
import {updateChildren, updateNode} from '../scene-tree'

const createScene = () => {
  const scene = getDocumentScene(createDemoDocument())
  const group = scene.roots.find((node) => node.kind === 'group')!
  return {roots: [...scene.roots, {...group, children: [], id: 'unrelated'}]}
}

test('should preserve untouched branches when updating a nested node', () => {
  const scene = createScene()
  const next = updateNode(scene.roots, 'shape-circle', (node) => ({...node, visible: false}))
  expect(next).not.toBe(scene.roots)
  expect(next[0]).toBe(scene.roots[0])
  expect(next.at(-1)).toBe(scene.roots.at(-1))
  const group = next.find((node) => node.id === 'shapes')!
  const previousGroup = scene.roots.find((node) => node.id === 'shapes')!
  expect(group).toMatchObject({
    children: expect.arrayContaining([
      expect.objectContaining({id: 'shape-circle', visible: false}),
    ]),
  })
  if (group.kind === 'group' && previousGroup.kind === 'group') {
    expect(group.children.find((node) => node.id === 'shape-diamond')).toBe(
      previousGroup.children.find((node) => node.id === 'shape-diamond'),
    )
  }
  expect(updateNode(scene.roots, 'missing', (node) => ({...node}))).toBe(scene.roots)
})

test('should preserve untouched branches and no-op identity when updating children', () => {
  const scene = createScene()
  const next = updateChildren(scene, 'shapes', (children) => children.slice(0, 1))!
  expect(next.roots.at(-1)).toBe(scene.roots.at(-1))
  expect(next.roots[0]).toBe(scene.roots[0])
  expect(next.roots.find((node) => node.id === 'shapes')).toMatchObject({
    children: [expect.objectContaining({id: 'shape-circle'})],
  })
  const identity = (nodes: ReadonlyArray<PuppetSceneNode>) => nodes
  expect(updateChildren(scene, 'shapes', identity)).toBe(scene)
  expect(updateChildren(scene, null, identity)).toBe(scene)
  expect(updateChildren(scene, 'missing', identity)).toBeUndefined()
})
