import {expect, test, vi} from 'vitest'
import {createDecoder} from '../../../buffering/render-frame/create-decoder'
import {createEncoder} from '../../../buffering/render-frame/create-encoder'
import {createEmptyDocument} from '../../../create-empty-document'
import {getPartRenderFrame, type PartRenderFrame} from '../../../internal/render-plan'
import {packDisplay} from '../display'

test('should preserve paint order, culling and supported blend modes in the GPU packet', () => {
  const frame = getPartRenderFrame({
    ...createEmptyDocument(),
    parts: [
      {
        id: 'part',
        mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
        properties: {blendMode: 'multiply-compatible', culling: true, opacity: 0.5},
        texture: {height: 1, src: 'part.png', width: 1},
      },
    ],
    scene: {roots: [{id: 'part', kind: 'part', locked: false, name: 'part', visible: true}]},
  })
  const values = packDisplay(frame, new Map([['part', 3]]))
  expect([...values]).toEqual([3, 1, 1, 0.5, 1, 1, 1, 0, 0, 0, 0, 1, 1])
})

test('should pack queued numeric rows with exact colors and flags without decoding plans', () => {
  const source: PartRenderFrame = {
    layers: new Map(),
    plans: [
      {
        layerIds: [],
        partId: 'mask',
        properties: {
          alphaBlendMode: 'over',
          blendMode: 'normal',
          clippingMaskIds: [],
          culling: false,
          invertedMask: false,
          multiplyColor: [1, 0.8, 0.7],
          opacity: 0.3,
          renderWhenUsedAsMask: false,
          screenColor: [0, 0, -0],
        },
        render: false,
        visible: true,
      },
      {
        layerIds: [],
        mask: {sources: [{invertedMask: false, partId: 'mask'}]},
        partId: 'part',
        properties: {
          alphaBlendMode: 'over',
          blendMode: 'multiply-compatible',
          clippingMaskIds: ['mask'],
          culling: true,
          invertedMask: true,
          multiplyColor: [0.1, 0.2, 0.9],
          opacity: 0.7,
          renderWhenUsedAsMask: true,
          screenColor: [0.4, 0.5, 0.6],
        },
        render: true,
        visible: false,
      },
    ],
    spatialPoses: new Map(),
  }
  const encode = createEncoder()
  const decode = createDecoder()
  const packet = encode(source)
  const queued = decode(packet)
  const readPlans = vi.spyOn(queued, 'plans', 'get')
  packet.parts.fill(0)
  const [mask, part] = source.plans
  const next = {
    ...source,
    plans: [{...part!, properties: {...part!.properties, culling: false}}, mask!],
  }
  const indices = new Map([
    ['part', 2],
    ['mask', 5],
  ])
  expect(new Uint32Array(packDisplay(decode(encode(next)), indices).buffer)).toEqual(
    new Uint32Array(packDisplay(next, indices).buffer),
  )
  expect(new Uint32Array(packDisplay(queued, indices).buffer)).toEqual(
    new Uint32Array(packDisplay(source, indices).buffer),
  )
  expect(readPlans).not.toHaveBeenCalled()
})
