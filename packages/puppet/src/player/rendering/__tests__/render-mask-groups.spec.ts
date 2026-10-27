import {MeshSimple, type Renderer, Texture} from 'pixi.js'
import {describe, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import {createRuntimePartMask, destroyRuntimeMask} from '../part-mask'
import {renderMaskGroups} from '../render-mask-groups'

const createMask = (id = 'source') => {
  const vertices = [0, 0, 100, 0, 0, 100]
  const mesh = new MeshSimple({
    indices: new Uint32Array([0, 1, 2]),
    texture: Texture.WHITE,
    uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
    vertices: new Float32Array(vertices),
  })
  const mask = createRuntimePartMask({
    document: {
      ...createEmptyDocument(),
      parts: [
        {
          id,
          mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices},
          texture: {height: 1, src: '', width: 1},
        },
      ],
    },
    partById: new Map([
      [id, {mesh, partId: id, restVertices: vertices, vertices: new Float32Array(vertices)}],
    ]),
    plan: {sources: [{invertedMask: false, partId: id}]},
  })
  mesh.destroy()
  return mask
}

describe('renderMaskGroups', () => {
  test('should rasterize matching masks once over all receivers while retaining independent inversion', () => {
    const first = createMask()
    const second = createMask()
    second.filter.inverse = true
    const render = vi.fn()
    const requests = [
      {mask: first, vertexSets: [[0, 0, 10, 10]]},
      {mask: second, vertexSets: [[80, 60, 100, 100]]},
    ]
    renderMaskGroups({renderer: {render} as unknown as Renderer, requests, resolution: 1})
    expect(render).toHaveBeenCalledTimes(1)
    expect(second.sprite.texture).toBe(first.texture)
    expect([second.sprite.x, second.sprite.y]).toEqual([first.sprite.x, first.sprite.y])
    expect(first.texture.width).toBeGreaterThanOrEqual(100)
    expect(first.texture.height).toBeGreaterThanOrEqual(100)
    expect(second.filter.inverse).toBe(true)
    expect(first.filter.inverse).toBe(false)
    destroyRuntimeMask(first)
    destroyRuntimeMask(second)
  })

  test('should keep different mask sources separate and rebind when the active representative changes', () => {
    const first = createMask()
    const second = createMask()
    const other = createMask('other')
    const render = vi.fn()
    const renderer = {render} as unknown as Renderer
    const request = (mask: ReturnType<typeof createMask>) => ({
      mask,
      vertexSets: [[10, 20, 30, 40]],
    })
    renderMaskGroups({
      renderer,
      requests: [request(first), request(second), request(other)],
      resolution: 1,
    })
    expect(render).toHaveBeenCalledTimes(2)
    expect(second.sprite.texture).toBe(first.texture)
    expect(other.sprite.texture).toBe(other.texture)
    renderMaskGroups({renderer, requests: [request(second)], resolution: 2})
    expect(second.sprite.texture).toBe(second.texture)
    expect(second.texture.source.resolution).toBe(2)
    expect(first.texture.source.pixelWidth).toBe(1)
    expect(first.texture.source.pixelHeight).toBe(1)
    destroyRuntimeMask(first)
    expect(second.texture.destroyed).toBe(false)
    renderMaskGroups({renderer, requests: [], resolution: 2})
    expect(second.texture.source.pixelWidth).toBe(1)
    expect(second.texture.source.pixelHeight).toBe(1)
    destroyRuntimeMask(second)
    destroyRuntimeMask(other)
  })

  test('should keep different nested clipping and current nested inversion separate', () => {
    const first = createMask()
    const second = createMask()
    const nested = createMask('nested')
    const deep = createMask('nested')
    const firstSource = first.meshes[0]!
    const secondSource = second.meshes[0]!
    const firstMask = {...first, meshes: [{...firstSource, mask: nested}]}
    const secondMask = {...second, meshes: [{...secondSource, mask: deep}]}
    deep.filter.inverse = true
    const render = vi.fn()
    renderMaskGroups({
      renderer: {render} as unknown as Renderer,
      requests: [
        {mask: firstMask, vertexSets: [[0, 0, 10, 10]]},
        {mask: secondMask, vertexSets: [[0, 0, 10, 10]]},
      ],
      resolution: 1,
    })
    expect(first.sprite.texture).not.toBe(second.sprite.texture)
    expect(render).toHaveBeenCalledTimes(3)
    expect(deep.sprite.texture).toBe(nested.texture)
    expect(deep.filter.inverse).toBe(true)
    destroyRuntimeMask(firstMask)
    destroyRuntimeMask(secondMask)
  })
})

test('should share nested mask pixels before rendering distinct parent receivers', () => {
  const first = createMask('first')
  const second = createMask('second')
  const nested = createMask('nested')
  const duplicate = createMask('nested')
  const firstMask = {...first, meshes: [{...first.meshes[0]!, mask: nested}]}
  const secondMask = {...second, meshes: [{...second.meshes[0]!, mask: duplicate}]}
  const render = vi.fn()
  renderMaskGroups({
    renderer: {render} as unknown as Renderer,
    requests: [
      {mask: firstMask, vertexSets: [[0, 0, 20, 20]]},
      {mask: secondMask, vertexSets: [[10, 10, 40, 40]]},
    ],
    resolution: 1,
  })
  expect(render).toHaveBeenCalledTimes(3)
  expect(duplicate.sprite.texture).toBe(nested.texture)
  expect(render.mock.calls[0]![0].container).toBe(nested.container)
  expect(render.mock.calls[1]![0].container).toBe(first.container)
  expect(render.mock.calls[2]![0].container).toBe(second.container)
  destroyRuntimeMask(firstMask)
  destroyRuntimeMask(secondMask)
})
