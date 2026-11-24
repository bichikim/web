import {
  constantOrderChannels,
  createOrderDocument,
  orderInputs,
} from '../../player/internal/__tests__/fixtures/draw-order'
import {expect, test} from 'vitest'
import {
  PUPPET_DEFAULT_DRAW_ORDER,
  PUPPET_DOCUMENT_FORMAT,
  type PuppetDocument,
  type PuppetParameterBinding2D,
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

test.each(constantOrderChannels)(
  'should keep exact rest orders in triangulated %s channels',
  (channel) => {
    for (const rest of [500, 500.125]) {
      const partDocument = createOrderDocument(channel, 'part', rest)
      const groupDocument = createOrderDocument(channel, 'group', rest)
      const group = groupDocument.scene!.roots[1]!
      if (group.kind !== 'group') {
        throw new Error('Expected a draw-order group')
      }
      for (const values of orderInputs) {
        expect(composeParameterPartDrawOrder(partDocument, 'keyed', values)).toBe(rest)
        expect(composeParameterGroupDrawOrder(groupDocument, group, values)).toBe(rest)
      }
    }
  },
)

test('should preserve authored fractional multiaxis orders and constant non-rest offsets', () => {
  const source = createOrderDocument('changing')
  expect(composeParameterPartDrawOrder(source, 'keyed', {x: 0.02, y: 0.17})).toBeCloseTo(499.77, 10)
  expect(composeParameterPartDrawOrder(source, 'keyed', {x: 0.5001, y: 0.17})).toBeCloseTo(
    500.2501,
    10,
  )
  const binding = source.parameterBindings![0]!
  const constant = {
    ...source,
    parameterBindings: [
      {
        ...binding,
        keyforms: binding.keyforms.map((form) => ({
          ...form,
          parts: form.parts.map((part) => ({...part, properties: {drawOrder: 600.125}})),
          values: [form.values[0], form.values[1]!],
        })),
        parameterIds: ['x', 'y'],
      } satisfies PuppetParameterBinding2D,
    ],
  }

  expect(composeParameterPartDrawOrder(constant, 'keyed', {x: 0.02, y: 0.17})).toBeCloseTo(
    600.125,
    10,
  )
})
