import {expect, test} from 'vitest'
import {
  PUPPET_DEFAULT_DRAW_ORDER,
  PUPPET_DOCUMENT_FORMAT,
  type PuppetDocument,
  type PuppetSceneGroupNode,
} from '../../player/document'
import {composeParameterGroupDrawOrder, composeParameterPartDrawOrder} from '../draw-order'

const document: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameterBindings: [
    {
      id: 'order',
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
      keyforms: [
        {parts: [{partId: 'part', properties: {}, vertices: []}], values: [0]},
        {parts: [{partId: 'part', properties: {drawOrder: 800}, vertices: []}], values: [1]},
      ],
      parameterIds: ['p'],
      targetPartIds: ['part'],
    },
  ],
  parameters: [
    {defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'Position'},
    {defaultValue: 1, id: 'weight', maximum: 1, minimum: 0, name: 'Weight'},
  ],
  parts: [
    {
      id: 'part',
      mesh: {indices: [], uvs: [], vertices: []},
      properties: {drawOrder: 400},
      texture: {height: 1, src: '', width: 1},
    },
  ],
  version: 1,
  viewport: {height: 1, width: 1},
}

test.each(['__proto__', 'constructor', 'hasOwnProperty', 'toString'])(
  'should cache draw orders for prototype-like part IDs without dispatching object methods: %s',
  (id) => {
    const keyed: PuppetDocument = {
      ...document,
      parameterBindings: [],
      parts: [{...document.parts[0]!, id, properties: {drawOrder: 123}}],
    }
    expect(composeParameterPartDrawOrder(keyed, id)).toBe(123)
    expect(composeParameterPartDrawOrder(keyed, id)).toBe(123)
    expect(composeParameterPartDrawOrder(document, id)).toBe(PUPPET_DEFAULT_DRAW_ORDER)
    expect(composeParameterPartDrawOrder(document, id)).toBe(PUPPET_DEFAULT_DRAW_ORDER)
  },
)

test('should retain rest fallbacks and react to reused parameter records and influence-only changes', () => {
  const values = {p: 0.5, weight: 0.5}
  expect(composeParameterPartDrawOrder(document, 'part', values)).toBe(500)
  values.weight = 1
  expect(composeParameterPartDrawOrder(document, 'part', values)).toBe(600)
  values.p = 1
  expect(composeParameterPartDrawOrder(document, 'part', values)).toBe(800)
  expect(composeParameterPartDrawOrder(document, 'part')).toBe(400)
  const replacement = {
    ...document,
    parts: document.parts.map((part) => ({...part, properties: {drawOrder: 100}})),
  }
  expect(composeParameterPartDrawOrder(replacement, 'part', {p: 0.5})).toBe(450)
  expect(composeParameterPartDrawOrder(document, 'part', {p: 0.5})).toBe(600)
})

test('should retain group identity, cubism rounding, clamping and ordered additive bindings', () => {
  const group: PuppetSceneGroupNode = {
    children: [],
    id: 'group',
    kind: 'group',
    locked: false,
    name: 'Group',
    properties: {drawOrder: 300},
    visible: true,
  }
  const binding = {
    id: 'group-order',
    keyforms: [
      {groups: [{groupId: 'group', properties: {drawOrder: 400}}], parts: [], values: [0] as const},
    ],
    parameterIds: ['p'] as const,
    targetGroupIds: ['group'],
  }
  const keyed = {...document, parameterBindings: [binding, {...binding, id: 'second'}]}
  expect(composeParameterGroupDrawOrder(keyed, group)).toBe(500)
  expect(composeParameterGroupDrawOrder(keyed, {...group, properties: {drawOrder: 200}})).toBe(600)
  expect(
    composeParameterGroupDrawOrder(
      {...keyed, drawOrderRounding: 'cubism'},
      {...group, properties: {drawOrder: 300.9}},
    ),
  ).toBe(499)
  expect(
    composeParameterGroupDrawOrder(
      {
        ...keyed,
        parameterBindings: Array.from({length: 8}, (_, index) => ({...binding, id: String(index)})),
      },
      group,
    ),
  ).toBe(1000)
})

test('should preserve triangulated constant-channel arithmetic for part and group orders', () => {
  const keyed = {
    ...document,
    parameterBindings: [
      {
        id: 'triangles',
        keyforms: (
          [
            [0, 0],
            [1, 0],
            [0, 1],
          ] as const
        ).map((values) => ({
          groups: [{groupId: 'group', properties: {opacity: 0.5}}],
          parts: [{partId: 'part', properties: {opacity: 0.5}, vertices: []}],
          values,
        })),
        parameterIds: ['x', 'y'] as const,
        targetGroupIds: ['group'],
        targetPartIds: ['part'],
      },
    ],
    parameters: ['x', 'y'].map((id) => ({defaultValue: 0, id, maximum: 1, minimum: 0, name: id})),
    parts: document.parts.map((part) => ({...part, properties: {drawOrder: 500}})),
  }
  const values = {x: 0.02, y: 0.17}
  const group: PuppetSceneGroupNode = {
    children: [],
    id: 'group',
    kind: 'group',
    locked: false,
    name: 'Group',
    properties: {drawOrder: 500},
    visible: true,
  }
  expect(composeParameterPartDrawOrder(keyed, 'part', values)).toBe(499.99999999999994)
  expect(composeParameterGroupDrawOrder(keyed, group, values)).toBe(499.99999999999994)
})
