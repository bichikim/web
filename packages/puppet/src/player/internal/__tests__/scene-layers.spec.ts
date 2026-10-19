import {describe, expect, test} from 'vitest'

import {composeColorEffects} from '../../../deformation'
import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetGroupRenderProperties,
  type PuppetPart,
  type PuppetSceneNode,
} from '../../document'
import {parseDocumentValue} from '../../parse-document'
import {canReuseLayerResources, getPartRenderFrame} from '../render-plan'
import {gatherLayers} from '../scene-layers'

const createPart = (id: string): PuppetPart => ({
  id,
  mesh: {
    boundaryLoops: [[0, 1, 2]],
    indices: [0, 1, 2],
    uvs: [0, 0, 1, 0, 0, 1],
    vertices: [0, 0, 1, 0, 0, 1],
  },
  properties: id === 'mask' ? {renderWhenUsedAsMask: false} : undefined,
  texture: {height: 1, src: `${id}.png`, width: 1},
})

const part = (id: string): PuppetSceneNode => ({
  id,
  kind: 'part',
  locked: false,
  name: id,
  visible: true,
})

const group = (
  id: string,
  children: ReadonlyArray<PuppetSceneNode>,
  properties?: PuppetGroupRenderProperties,
): PuppetSceneNode => ({
  children,
  id,
  kind: 'group',
  locked: false,
  name: id,
  properties,
  visible: true,
})

const createDocument = (roots: ReadonlyArray<PuppetSceneNode>): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  layerOrderRules: [],
  motions: [],
  parameters: [{defaultValue: 1, id: 'p', maximum: 1, minimum: 0, name: 'P'}],
  parts: ['back', 'a', 'b', 'c', 'mask'].map(createPart),
  scene: {roots},
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

describe('composeColorEffects', () => {
  test('should equal applying the inner and then the outer color effect', () => {
    const inner = {multiplyColor: [0.5, 1, 0.2], opacity: 0.5, screenColor: [0.25, 0, 0.5]} as const
    const outer = {multiplyColor: [0.8, 0.5, 1], opacity: 0.4, screenColor: [0.5, 0.1, 0]} as const
    const apply = (effect: typeof inner | typeof outer, color: number, index: 0 | 1 | 2) =>
      color * effect.multiplyColor[index] * (1 - effect.screenColor[index]) +
      effect.screenColor[index]
    const composed = composeColorEffects(inner, outer)

    expect(composed.opacity).toBeCloseTo(0.2)
    for (const color of [0, 0.3, 1]) {
      for (const index of [0, 1, 2] as const) {
        expect(apply(composed, color, index)).toBeCloseTo(
          apply(outer, apply(inner, color, index), index),
        )
      }
    }
  })
})

describe('gatherLayers', () => {
  test('should paint nested layers contiguously at their first member', () => {
    const layersById: Record<string, ReadonlyArray<string>> = {
      a: ['outer'],
      b: [],
      c: ['outer', 'inner'],
      d: ['outer'],
      e: ['outer', 'inner'],
    }

    expect(gatherLayers(['c', 'b', 'a', 'e', 'd'], (id) => layersById[id] ?? [])).toEqual([
      'c',
      'e',
      'a',
      'd',
      'b',
    ])
  })
})

describe('getPartRenderFrame with groups', () => {
  test('should inherit plain group effects and composite offscreen groups once', () => {
    const document = createDocument([
      part('back'),
      group(
        'plain',
        [group('layer', [part('a'), part('b')], {offscreen: true, opacity: 0.5}), part('c')],
        {
          multiplyColor: [0.5, 0.5, 0.5],
          opacity: 0.8,
        },
      ),
      part('mask'),
    ])
    const frame = getPartRenderFrame(document)
    const planById = new Map(frame.plans.map((plan) => [plan.partId, plan]))

    expect(planById.get('a')).toMatchObject({layerIds: ['layer'], properties: {opacity: 1}})
    expect(planById.get('c')).toMatchObject({
      layerIds: [],
      properties: {multiplyColor: [0.5, 0.5, 0.5], opacity: 0.8},
    })
    expect(frame.layers.get('layer')).toMatchObject({
      groupId: 'layer',
      layerIds: [],
      properties: {multiplyColor: [0.5, 0.5, 0.5], opacity: 0.4},
      visible: true,
    })
  })

  test('should apply app overrides: own values first, then the nearest plain group', () => {
    const document = createDocument([
      part('back'),
      group(
        'plain',
        [group('layer', [part('a'), part('b')], {offscreen: true, opacity: 0.5}), part('c')],
        {multiplyColor: [0.5, 0.5, 0.5], opacity: 0.3},
      ),
    ])
    const overrides = {
      groups: new Map([
        ['plain', {multiplyColor: [1, 0, 0] as const, opacity: 0.8}],
        ['layer', {screenColor: [0, 0, 1] as const}],
      ]),
      parts: new Map([['b', {culling: true, multiplyColor: [0, 1, 0] as const, opacity: 0.25}]]),
    }
    const frame = getPartRenderFrame(document, undefined, undefined, {overrides})
    const plan = (id: string) => frame.plans.find((candidate) => candidate.partId === id)!
    // The plain group's color replaces its parts' final color; its opacity replaces its own.
    expect(plan('c').properties).toMatchObject({
      multiplyColor: [1, 0, 0],
      opacity: 0.8,
      screenColor: [0, 0, 0],
    })
    // Inside the offscreen layer the plain group's override applies to the layer instead.
    expect(plan('a').properties).toMatchObject({multiplyColor: [1, 1, 1], opacity: 1})
    expect(plan('b').properties).toMatchObject({
      culling: true,
      multiplyColor: [0, 1, 0],
      opacity: 0.25,
    })
    expect(frame.layers.get('layer')?.properties).toMatchObject({
      multiplyColor: [1, 0, 0],
      opacity: 0.4,
      screenColor: [0, 0, 1],
    })
    expect(plan('back').properties).toMatchObject({multiplyColor: [1, 1, 1], opacity: 1})
  })

  test('should gather layer members moved apart by layer order rules', () => {
    const document: PuppetDocument = {
      ...createDocument([
        part('back'),
        group('layer', [part('a'), part('b')], {offscreen: true}),
        part('c'),
        part('mask'),
      ]),
      layerOrderRules: [
        {
          partIds: ['b'],
          placement: 'after',
          referencePartId: 'c',
          when: {comparison: 'greater-than', parameterIds: ['p'], threshold: 0.5},
        },
      ],
    }

    expect(getPartRenderFrame(document).plans.map((plan) => plan.partId)).toEqual([
      'back',
      'a',
      'b',
      'c',
      'mask',
    ])
  })

  test('should mask offscreen groups and hide their mask sources', () => {
    const document = createDocument([
      group('layer', [part('a')], {clippingMaskIds: ['mask'], invertedMask: true, offscreen: true}),
      part('back'),
      part('b'),
      part('c'),
      part('mask'),
    ])
    const frame = getPartRenderFrame(document)

    expect(frame.layers.get('layer')).toMatchObject({
      mask: {sources: [{invertedMask: false, partId: 'mask'}]},
      properties: {invertedMask: true},
    })
    expect(frame.plans.find((plan) => plan.partId === 'mask')).toMatchObject({render: false})
  })

  test('should reuse renderer layers only while offscreen groups and masks are unchanged', () => {
    const plain = createDocument([group('layer', ['a', 'b', 'c', 'back', 'mask'].map(part))])
    const offscreen = createDocument([
      group('layer', ['a', 'b', 'c', 'back', 'mask'].map(part), {offscreen: true, opacity: 0.5}),
    ])
    const faded = createDocument([
      group('layer', ['a', 'b', 'c', 'back', 'mask'].map(part), {offscreen: true, opacity: 0.2}),
    ])

    expect(canReuseLayerResources(offscreen, faded)).toBe(true)
    expect(canReuseLayerResources(plain, offscreen)).toBe(false)
  })
})

describe('group render properties', () => {
  const parse = (properties: Record<string, unknown>) =>
    parseDocumentValue(
      createDocument([
        {
          children: ['a', 'b', 'c', 'back', 'mask'].map(part),
          id: 'layer',
          kind: 'group',
          locked: false,
          name: 'layer',
          // Deliberately loose: invalid properties must be rejected.
          properties: properties as PuppetGroupRenderProperties,
          visible: true,
        },
      ]),
    ).ok

  test('should accept offscreen compositing and plain group effects', () => {
    expect(parse({multiplyColor: [1, 0.5, 0.5], opacity: 0.5})).toBe(true)
    expect(
      parse({
        alphaBlendMode: 'atop',
        blendMode: 'add-glow',
        clippingMaskIds: ['mask'],
        offscreen: true,
      }),
    ).toBe(true)
  })

  test('should reject compositing without offscreen and unknown mask sources', () => {
    expect(parse({blendMode: 'multiply'})).toBe(false)
    expect(parse({clippingMaskIds: ['missing'], offscreen: true})).toBe(false)
    expect(parse({offscreen: true, renderWhenUsedAsMask: false})).toBe(false)
  })
})
