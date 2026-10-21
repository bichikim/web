import {Container, MaskFilter, MeshSimple, RenderTexture, Sprite, Texture} from 'pixi.js'
import {describe, expect, test} from 'vitest'
import type {ResolvedPartRenderProperties} from '../../../deformation'
import type {PuppetPartBlendMode} from '../../document'
import {applyLayerRenderProperties, applyPartRenderProperties} from '../apply-effect-filters'
import type {RuntimeLayer, RuntimePart, RuntimePartMask} from '../types'

const createMask = (): RuntimePartMask => {
  const texture = RenderTexture.create({height: 1, width: 1})
  const sprite = new Sprite(texture)
  return {
    container: new Container(),
    filter: new MaskFilter({channel: 'alpha', sprite}),
    meshes: [],
    sprite,
    texture,
  }
}

const createPartProperties = (blendMode: PuppetPartBlendMode): ResolvedPartRenderProperties => ({
  alphaBlendMode: 'over',
  blendMode,
  clippingMaskIds: [],
  culling: false,
  invertedMask: false,
  multiplyColor: [1, 1, 1],
  opacity: 1,
  renderWhenUsedAsMask: true,
  screenColor: [0, 0, 0],
})

const createLayerProperties = (blendMode: PuppetPartBlendMode) => ({
  alphaBlendMode: 'over' as const,
  blendMode,
  clippingMaskIds: [],
  invertedMask: false,
  multiplyColor: [1, 1, 1] as const,
  opacity: 1,
  screenColor: [0, 0, 0] as const,
})

describe('applyPartRenderProperties', () => {
  test('should reset the reused mask filter to normal when a masked part switches to a backdrop blend', () => {
    const mask = createMask()
    const runtimePart: RuntimePart = {
      mask,
      mesh: new MeshSimple({
        indices: new Uint32Array([0, 1, 2]),
        texture: Texture.WHITE,
        uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
        vertices: new Float32Array([0, 0, 1, 0, 0, 1]),
      }),
      partId: 'part',
      restVertices: [0, 0, 1, 0, 0, 1],
      vertices: new Float32Array([0, 0, 1, 0, 0, 1]),
    }

    applyPartRenderProperties(createPartProperties('multiply'), runtimePart)
    expect(mask.filter.blendMode).toBe('multiply')

    applyPartRenderProperties(createPartProperties('overlay'), runtimePart)
    expect(mask.filter.blendMode).toBe('normal')
    expect(runtimePart.mesh.blendMode).toBe('normal')
    expect(runtimePart.mesh.filters).toEqual([mask.filter, runtimePart.blendFilter?.filter])
  })
})

describe('applyLayerRenderProperties', () => {
  test('should reset the reused mask filter to normal when a masked layer switches to a backdrop blend', () => {
    const mask = createMask()
    const runtimeLayer: RuntimeLayer = {
      container: new Container(),
      groupId: 'layer',
      mask,
      memberPartIds: [],
    }

    applyLayerRenderProperties(createLayerProperties('screen'), runtimeLayer)
    expect(mask.filter.blendMode).toBe('screen')

    applyLayerRenderProperties(createLayerProperties('lighten'), runtimeLayer)
    expect([runtimeLayer.colorFilter?.blendMode, mask.filter.blendMode]).toEqual([
      'normal',
      'normal',
    ])
    expect(runtimeLayer.container.blendMode).toBe('normal')
    expect(runtimeLayer.container.filters).toEqual([
      runtimeLayer.colorFilter,
      mask.filter,
      runtimeLayer.blendFilter?.filter,
    ])
  })
})
