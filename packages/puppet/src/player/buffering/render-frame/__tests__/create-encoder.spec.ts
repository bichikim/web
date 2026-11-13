import {expect, test} from 'vitest'
import {getPartRenderProperties} from '../../../../deformation/part-properties'
import type {PartRenderFrame} from '../../../internal/render-plan'
import {createEncoder} from '../create-encoder'
import {createDecoder} from '../create-decoder'

const source = (): PartRenderFrame => ({
  layers: new Map([
    [
      'layer',
      {
        groupId: 'layer',
        layerIds: [],
        properties: {
          alphaBlendMode: 'over',
          blendMode: 'normal',
          clippingMaskIds: [],
          invertedMask: false,
          multiplyColor: [1, 0.25, 1],
          opacity: 0.75,
          screenColor: [0, 0, 0.125],
        },
        visible: true,
      },
    ],
  ]),
  plans: ['first', 'second'].map((partId) => ({
    layerIds: ['layer'],
    mask: {sources: [{invertedMask: false, partId: 'mask'}]},
    partId,
    properties: {
      ...getPartRenderProperties({id: partId} as Parameters<typeof getPartRenderProperties>[0]),
      multiplyColor: [-0, 1 / 3, 1],
      opacity: Math.PI,
      screenColor: [0, 0.5, 0.75],
    },
    render: true,
    visible: true,
  })),
  spatialPoses: new Map([
    ['first', {depth: 0.25, depths: [0.25, 0.5], facing: true, vertices: [1 / 3, 2, -0, 4]}],
  ]),
})

test('should retain exact frames and paint order while reusing unchanged structural templates', () => {
  const encode = createEncoder()
  const decode = createDecoder()
  const first = source()
  const packet = encode(first)
  const restored = decode(structuredClone(packet))
  expect(restored).toEqual(first)
  expect(packet.partTemplates).toHaveLength(2)
  const second = {
    ...first,
    plans: [...first.plans]
      .reverse()
      .map((plan) => ({...plan, properties: {...plan.properties, opacity: 0.2}, visible: false})),
  }
  const update = encode(second)
  expect(update.partTemplates).toEqual([])
  expect(update.layerTemplates).toEqual([])
  expect(decode(structuredClone(update))).toEqual(second)
  expect(restored).toEqual(first)
})

test('should replace changed mask, blend, culling and layer templates without mutating queued frames', () => {
  const encode = createEncoder()
  const decode = createDecoder()
  const first = source()
  const previous = decode(structuredClone(encode(first)))
  const next: PartRenderFrame = {
    ...first,
    layers: new Map(
      [...first.layers].map(([id, layer]) => [
        id,
        {...layer, layerIds: ['outer'], properties: {...layer.properties, invertedMask: true}},
      ]),
    ),
    plans: first.plans.map((plan) => ({
      ...plan,
      layerIds: [],
      mask: {sources: [{invertedMask: true, partId: 'different'}]},
      properties: {
        ...plan.properties,
        blendMode: 'multiply',
        clippingMaskIds: ['different'],
        culling: true,
      },
    })),
  }
  const update = encode(next)
  expect(update.partTemplates).toHaveLength(2)
  expect(update.layerTemplates).toHaveLength(1)
  expect(decode(structuredClone(update))).toEqual(next)
  expect(previous).toEqual(first)
  expect(decode(structuredClone(encode({...next, plans: []})))).toEqual({...next, plans: []})
})
