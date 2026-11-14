import {describe, expect, test} from 'vitest'

import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetGroupRenderProperties,
  type PuppetPart,
  type PuppetSceneNode,
} from '../../document'
import {parseDocumentValue} from '../../parse-document'
import {getDrawOrderedPartStates} from '../scene-draw-order'

const part = (id: string, drawOrder?: number): PuppetPart => ({
  id,
  mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
  properties: drawOrder === undefined ? undefined : {drawOrder},
  texture: {height: 1, src: `${id}.png`, width: 1},
})
const node = (id: string): PuppetSceneNode => ({
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

const createDocument = (
  parts: ReadonlyArray<PuppetPart>,
  roots: ReadonlyArray<PuppetSceneNode>,
  extra: Partial<PuppetDocument> = {},
): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parts,
  scene: {roots},
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
  ...extra,
})

const order = (document: PuppetDocument, values?: Readonly<Record<string, number>>) =>
  getDrawOrderedPartStates(document, values).map((state) => state.partId)

describe('scene draw order', () => {
  test('should preserve Cubism source order for ties across plain scene groups', () => {
    const parts = [part('a', 500), part('b', 500), part('c', 500)]
    const document = createDocument(parts, [group('g', [node('c'), node('a')]), node('b')], {
      drawOrderTieBreak: 'parts',
    })
    expect(order(document)).toEqual(['a', 'b', 'c'])
    expect(parseDocumentValue(document).ok).toBe(true)
    expect(order({...document, drawOrderTieBreak: undefined})).toEqual(['c', 'a', 'b'])
  })
  test('should quantize compiled orders before resolving stored ties and preserve legacy fractional orders', () => {
    const parts = [part('a', 500.9), part('b', 500)]
    const document = createDocument(
      parts,
      parts.map((part) => node(part.id)),
      {drawOrderRounding: 'cubism', drawOrderTieBreak: 'parts'},
    )
    expect(order(document)).toEqual(['a', 'b'])
    expect(order({...document, drawOrderRounding: undefined})).toEqual(['b', 'a'])
    expect(parseDocumentValue(document).ok).toBe(true)
  })

  test('should sort by draw order, keeping scene order for ties and without draw orders', () => {
    const parts = [part('a', 700), part('b'), part('c', 300), part('d')]
    const roots = parts.map((candidate) => node(candidate.id))
    expect(order(createDocument(parts, roots))).toEqual(['c', 'b', 'd', 'a'])
    const plain = parts.map((candidate) => part(candidate.id))
    expect(order(createDocument(plain, roots))).toEqual(['a', 'b', 'c', 'd'])
  })

  test('should sort plain groups’ parts with their siblings, draw order groups as one', () => {
    const parts = [part('a', 600), part('b', 100), part('c', 400), part('d', 900)]
    const plain = createDocument(parts, [group('g', [node('a'), node('b')]), node('c'), node('d')])
    expect(order(plain)).toEqual(['b', 'c', 'a', 'd'])
    // As a draw order group at 450, a and b sort inside it and the pair sits between c and d.
    const grouped = createDocument(parts, [
      group('g', [node('a'), node('b')], {drawOrder: 450}),
      node('c'),
      node('d'),
    ])
    expect(order(grouped)).toEqual(['c', 'b', 'a', 'd'])
    const offscreen = createDocument(parts, [
      group('g', [node('a'), node('b')], {offscreen: true}),
      node('c'),
      node('d'),
    ])
    expect(order(offscreen)).toEqual(['c', 'b', 'a', 'd'])
  })

  test('should move a part through another as its keyed draw order changes', () => {
    const parts = [part('arm'), part('body')]
    const document = createDocument(parts, [node('arm'), node('body')], {
      parameterBindings: [
        {
          id: 'swing',
          keyforms: [
            {parts: [{partId: 'arm', properties: {drawOrder: 300}, vertices: []}], values: [0]},
            {parts: [{partId: 'arm', properties: {drawOrder: 700}, vertices: []}], values: [1]},
          ],
          parameterIds: ['swing'],
          targetPartIds: ['arm'],
        },
      ],
      parameters: [{defaultValue: 0, id: 'swing', maximum: 1, minimum: 0, name: 'Swing'}],
    })
    expect(parseDocumentValue(document).ok).toBe(true)
    expect(order(document, {swing: 0})).toEqual(['arm', 'body'])
    // 0.5 keys 500: a tie with body, so scene order stands.
    expect(order(document, {swing: 0.5})).toEqual(['arm', 'body'])
    expect(order(document, {swing: 0.51})).toEqual(['body', 'arm'])
  })

  test('should validate draw order ranges and keyed group draw orders', () => {
    const parts = [part('a', 1000)]
    expect(parseDocumentValue(createDocument(parts, [node('a')])).ok).toBe(true)
    expect(parseDocumentValue(createDocument([part('a', 1001)], [node('a')])).ok).toBe(false)
    const keyed = (properties?: PuppetGroupRenderProperties) =>
      createDocument(parts, [group('g', [node('a')], properties)], {
        parameterBindings: [
          {
            id: 'b',
            keyforms: [
              {groups: [{groupId: 'g', properties: {drawOrder: 200}}], parts: [], values: [0]},
            ],
            parameterIds: ['p'],
            targetGroupIds: ['g'],
            targetPartIds: [],
          },
        ],
        parameters: [{defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'P'}],
      })
    expect(parseDocumentValue(keyed({drawOrder: 500})).ok).toBe(true)
    // A plain group has no draw order of its own to key.
    expect(parseDocumentValue(keyed()).ok).toBe(false)
  })
})

test('should preserve paint order from legacy triangulated channels with equal rest orders', () => {
  const document = createDocument(
    [part('plain', 500), part('keyed', 500)],
    [node('plain'), node('keyed')],
    {
      parameterBindings: [
        {
          id: 'opacity',
          keyforms: (
            [
              [0, 0],
              [1, 0],
              [0, 1],
            ] as const
          ).map((values) => ({
            parts: [{partId: 'keyed', properties: {opacity: 0.5}, vertices: []}],
            values,
          })),
          parameterIds: ['x', 'y'],
          targetPartIds: ['keyed'],
        },
      ],
      parameters: ['x', 'y'].map((id) => ({defaultValue: 0, id, maximum: 1, minimum: 0, name: id})),
    },
  )
  expect(parseDocumentValue(document).ok).toBe(true)
  expect(order(document, {x: 0.02, y: 0.17})).toEqual(['keyed', 'plain'])
  expect(order(document, {x: 0, y: 0})).toEqual(['plain', 'keyed'])
  expect(order(document, {x: 0.02, y: 0.17})).toEqual(['keyed', 'plain'])
})

test('should reuse paint order while unrelated geometry parameters change', () => {
  const document = createDocument([part('a', 200), part('b', 600)], [node('a'), node('b')], {
    parameterBindings: [
      {
        id: 'bend',
        interpolation: 'grid',
        keyforms: [0, 1].map((value) => ({
          parts: [{partId: 'a', properties: {drawOrder: 200}, vertices: []}],
          values: [value],
        })),
        parameterIds: ['bend'],
        targetPartIds: ['a'],
      },
    ],
    parameters: [{defaultValue: 0, id: 'bend', maximum: 1, minimum: 0, name: 'Bend'}],
  })
  const initial = getDrawOrderedPartStates(document, {bend: 0})
  expect(getDrawOrderedPartStates(document, {bend: 1})).toBe(initial)
  expect(initial.map((state) => state.partId)).toEqual(['a', 'b'])
  expect(
    order({...document, parameterBindings: [], parts: [part('a', 900), part('b', 600)]}),
  ).toEqual(['b', 'a'])
})

test('should reuse constant grid group orders across parameter changes', () => {
  const document = createDocument(
    [part('a'), part('b', 500)],
    [group('group', [node('a')], {drawOrder: 400}), node('b')],
    {
      parameterBindings: [
        {
          id: 'constant',
          interpolation: 'grid',
          keyforms: [0, 1].map((value) => ({
            groups: [{groupId: 'group', properties: {drawOrder: 400}}],
            parts: [],
            values: [value],
          })),
          parameterIds: ['p'],
          targetGroupIds: ['group'],
        },
      ],
      parameters: [{defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'P'}],
    },
  )
  const initial = getDrawOrderedPartStates(document, {p: 0})
  expect(initial.map((state) => state.partId)).toEqual(['a', 'b'])
  expect(getDrawOrderedPartStates(document, {p: 1})).toBe(initial)
})

test('should refresh group order for influence changes and inherited parameter visibility', () => {
  const document = createDocument(
    [part('a'), part('b', 500)],
    [
      {
        ...group('group', [node('a')], {drawOrder: 400}),
        parameterVisibility: [{maximum: 1, minimum: 0.5, parameterId: 'visible'}],
      },
      node('b'),
    ],
    {
      parameterBindings: [
        {
          id: 'order',
          influenceMode: 'multiply',
          influences: [
            {
              parameterId: 'weight',
              points: [
                {value: 0, weight: 0},
                {value: 1, weight: 1},
              ],
            },
          ],
          interpolation: 'grid',
          keyforms: [0, 1].map((value) => ({
            groups: [{groupId: 'group', properties: {drawOrder: 400 + value * 400}}],
            parts: [],
            values: [value],
          })),
          parameterIds: ['order'],
          targetGroupIds: ['group'],
        },
      ],
      parameters: ['order', 'weight', 'visible'].map((id) => ({
        defaultValue: 1,
        id,
        maximum: 1,
        minimum: 0,
        name: id,
      })),
    },
  )
  const values = {order: 1, visible: 1, weight: 0}
  expect(order(document, values)).toEqual(['a', 'b'])
  values.weight = 1
  expect(order(document, values)).toEqual(['b', 'a'])
  values.order = 0
  expect(order(document, values)).toEqual(['a', 'b'])
  values.visible = 0
  expect(getDrawOrderedPartStates(document, values)).toEqual([
    {locked: false, partId: 'a', visible: false},
    {locked: false, partId: 'b', visible: true},
  ])
})
