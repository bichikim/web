import {Container, MeshSimple, Texture} from 'pixi.js'
import {describe, expect, test} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import {getPartRenderFrame} from '../../internal/render-plan'
import {applyDocumentScene} from '../apply-document-scene'
import {createRuntimePartMask, destroyRuntimeMask} from '../part-mask'
import type {RuntimeLayer, RuntimePart} from '../types'

const createPart = (indices: ReadonlyArray<number>): RuntimePart => ({
  mesh: new MeshSimple({
    indices: new Uint32Array(indices),
    texture: Texture.WHITE,
    uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
    vertices: new Float32Array([0, 0, 10, 0, 0, 10]),
  }),
  partId: 'part',
  restVertices: [0, 0, 10, 0, 0, 10],
  vertices: new Float32Array([0, 0, 10, 0, 0, 10]),
})

const createScene = (runtimePart: RuntimePart) => {
  const document = {
    ...createEmptyDocument(),
    parts: [
      {
        id: 'part',
        mesh: {indices: [], uvs: [], vertices: []},
        texture: {height: 1, src: '', width: 1},
      },
    ],
    scene: undefined,
  }
  return {
    frame: getPartRenderFrame(document),
    layerById: new Map<string, RuntimeLayer>(),
    partById: new Map([['part', runtimePart]]),
    root: new Container(),
  }
}

describe('applyDocumentScene', () => {
  test('should retain an auxiliary part without submitting an empty index batch', () => {
    const part = createPart([])
    const scene = createScene(part)
    applyDocumentScene(scene)
    expect(scene.root.children).toContain(part.mesh)
    expect(part.mesh.renderable).toBe(false)
    expect(scene.partById.get('part')).toBe(part)
    part.mesh.destroy()
    scene.root.destroy()
  })

  test('should draw a retained auxiliary part after a document update adds triangles', () => {
    const part = createPart([])
    const scene = createScene(part)
    applyDocumentScene(scene)
    part.mesh.geometry.indices = new Uint32Array([0, 1, 2])
    applyDocumentScene(scene)
    expect(part.mesh.renderable).toBe(true)
    part.mesh.geometry.indices = new Uint32Array()
    applyDocumentScene(scene)
    expect(part.mesh.renderable).toBe(false)
    part.mesh.destroy()
    scene.root.destroy()
  })

  test('should retain the render instructions when paint order is unchanged', () => {
    const part = createPart([0, 1, 2])
    const other = {...createPart([0, 1, 2]), partId: 'other'}
    const scene = createScene(part)
    const plan = scene.frame.plans[0]!
    scene.partById.set('other', other)
    const frame = {...scene.frame, plans: [plan, {...plan, partId: 'other'}]}
    scene.root.enableRenderGroup()
    applyDocumentScene({...scene, frame})
    scene.root.renderGroup!.structureDidChange = false
    applyDocumentScene({...scene, frame})
    expect(scene.root.renderGroup!.structureDidChange).toBe(false)
    applyDocumentScene({...scene, frame: {...frame, plans: [...frame.plans].reverse()}})
    expect(scene.root.children).toEqual([other.mesh, part.mesh])
    expect(scene.root.renderGroup!.structureDidChange).toBe(true)
    scene.root.destroy({children: true})
  })

  test('should preserve mask placement and reparent parts when layer membership changes', () => {
    const mask = createRuntimePartMask({
      document: createEmptyDocument(),
      partById: new Map(),
      plan: {sources: []},
    })
    const part = {...createPart([0, 1, 2]), mask}
    const other = {...createPart([0, 1, 2]), partId: 'other'}
    const scene = createScene(part)
    scene.partById.set('other', other)
    const plan = scene.frame.plans[0]!
    const layer: RuntimeLayer = {container: new Container(), groupId: 'layer', memberPartIds: []}
    scene.layerById.set('layer', layer)
    const frame = {
      ...scene.frame,
      layers: new Map([
        ['layer', {groupId: 'layer', layerIds: [], properties: plan.properties, visible: true}],
      ]),
      plans: [plan, {...plan, layerIds: ['layer'], partId: 'other'}],
    }
    const retained = new Container()
    scene.root.addChild(retained)
    applyDocumentScene({...scene, frame})
    expect(scene.root.children).toEqual([retained, mask.sprite, part.mesh, layer.container])
    expect(layer.container.children).toEqual([other.mesh])
    const moved = {
      ...frame,
      plans: [
        {...plan, layerIds: ['layer']},
        {...plan, partId: 'other'},
      ],
    }
    applyDocumentScene({...scene, frame: moved})
    expect(scene.root.children).toEqual([retained, layer.container, other.mesh])
    expect(layer.container.children).toEqual([mask.sprite, part.mesh])
    destroyRuntimeMask(mask)
    scene.root.destroy({children: true})
  })
})

test('should skip transparent normal-over receivers while retaining inversion and other alpha modes', () => {
  const mask = createRuntimePartMask({
    document: createEmptyDocument(),
    partById: new Map(),
    plan: {sources: []},
  })
  const part = {...createPart([0, 1, 2]), mask}
  const scene = createScene(part)
  const plan = scene.frame.plans[0]!
  applyDocumentScene(scene)
  expect(part.mesh.renderable).toBe(false)
  expect(scene.root.children).toContain(part.mesh)
  const inverted = {...plan, properties: {...plan.properties, invertedMask: true}}
  applyDocumentScene({...scene, frame: {...scene.frame, plans: [inverted]}})
  expect(part.mesh.renderable).toBe(true)
  const alpha = {...plan, properties: {...plan.properties, alphaBlendMode: 'atop' as const}}
  applyDocumentScene({...scene, frame: {...scene.frame, plans: [alpha]}})
  expect(part.mesh.renderable).toBe(true)
  applyDocumentScene(scene)
  expect(part.mesh.renderable).toBe(false)
  destroyRuntimeMask(mask)
  scene.root.destroy({children: true})
})
