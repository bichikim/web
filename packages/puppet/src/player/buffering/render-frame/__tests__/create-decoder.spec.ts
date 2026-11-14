import {expect, test} from 'vitest'
import {createDecoder} from '../create-decoder'
import type {PackedRenderFrame} from '../types'

const empty = (): PackedRenderFrame => ({
  layers: new Float64Array(),
  layerTemplates: [],
  parts: new Float64Array(),
  partTemplates: [],
  spatialPoses: new Map(),
})
const partPacket = (): PackedRenderFrame => ({
  ...empty(),
  parts: Float64Array.of(0, 1, 1, 0.25, 1, 1, 1, 0, 0, 0),
  partTemplates: [
    [
      0,
      {
        layerIds: [],
        partId: 'part',
        properties: {
          alphaBlendMode: 'over',
          blendMode: 'normal',
          clippingMaskIds: [],
          culling: false,
          invertedMask: false,
          renderWhenUsedAsMask: true,
        },
      },
    ],
  ],
})

test('should reuse unchanged part properties without mutating queued color snapshots', () => {
  const decode = createDecoder()
  const packet = partPacket()
  const first = decode(packet).plans[0]!.properties
  packet.parts[1] = 0
  packet.parts[2] = 0
  const second = decode({...packet, partTemplates: []}).plans[0]!
  expect(second.properties).toBe(first)
  expect(second.render).toBe(false)
  expect(second.visible).toBe(false)
  packet.parts[3] = 0.75
  const third = decode({...packet, partTemplates: []}).plans[0]!.properties
  expect(third).not.toBe(first)
  expect(third.opacity).toBe(0.75)
  expect(first.opacity).toBe(0.25)
})

test('should isolate replacement templates and delayed readers with equal numeric colors', () => {
  const decode = createDecoder()
  const packet = partPacket()
  const old = decode(packet)
  const template = packet.partTemplates[0]![1]
  const replaced = decode({
    ...packet,
    partTemplates: [
      [
        0,
        {
          ...template,
          properties: {...template.properties, culling: true},
        },
      ],
    ],
  })
  expect(replaced.plans[0]!.properties.culling).toBe(true)
  expect(old.plans[0]!.properties.culling).toBe(false)
  expect(old.plans[0]!.properties).not.toBe(replaced.plans[0]!.properties)
})

test('should preserve signed zero when colors change between otherwise equal frames', () => {
  const decode = createDecoder()
  const packet = partPacket()
  const first = decode(packet).plans[0]!.properties
  packet.parts[7] = -0
  const next = decode({...packet, partTemplates: []}).plans[0]!.properties
  expect(Object.is(first.screenColor[0], 0)).toBe(true)
  expect(Object.is(next.screenColor[0], -0)).toBe(true)
  expect(next).not.toBe(first)
})
test('should decode empty frames without retaining parts or layers from another stream', () => {
  expect(createDecoder()(empty())).toEqual({layers: new Map(), plans: [], spatialPoses: new Map()})
})
test('should reject a part whose template has not arrived', () => {
  expect(() => createDecoder()({...empty(), parts: new Float64Array(10)})).toThrow(
    'Missing playback part template',
  )
})
test('should reject a layer whose template has not arrived', () => {
  expect(() => createDecoder()({...empty(), layers: new Float64Array(9)})).toThrow(
    'Missing playback layer template',
  )
})

test('should snapshot queued values immediately and materialize display objects once on demand', () => {
  let reads = 0
  const properties = {
    alphaBlendMode: 'over' as const,
    blendMode: 'normal' as const,
    clippingMaskIds: [],
    culling: false,
    invertedMask: false,
    renderWhenUsedAsMask: true,
  }
  const packet: PackedRenderFrame = {
    ...empty(),
    layers: Float64Array.of(0, 1, 0.5, 1, 1, 1, 0, 0, 0),
    layerTemplates: [
      [
        0,
        {
          groupId: 'layer',
          layerIds: [],
          get properties() {
            reads += 1
            return properties
          },
        },
      ],
    ],
    parts: Float64Array.of(0, 1, 1, 0.25, 1, 1, 1, 0, 0, 0),
    partTemplates: [
      [
        0,
        {
          layerIds: ['layer'],
          partId: 'part',
          get properties() {
            reads += 1
            return properties
          },
        },
      ],
    ],
  }
  const frame = createDecoder()(packet)
  expect(reads).toBe(0)
  packet.parts.fill(0)
  packet.layers.fill(0)
  const plans = frame.plans
  expect(plans[0]?.properties.opacity).toBe(0.25)
  expect(frame.plans).toBe(plans)
  expect(frame.layers.get('layer')?.properties.opacity).toBe(0.5)
  expect(frame.layers).toBe(frame.layers)
  expect(reads).toBe(2)
})
