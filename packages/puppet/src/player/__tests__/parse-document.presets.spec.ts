import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../create-demo-document'
import type {PuppetDocument} from '../document'
import {parseDocument} from '../parse-document'

const demo = createDemoDocument()
const [firstPart, secondPart] = demo.parts.map((part) => part.id)
const parameterId = demo.parameters![0]!.id

const withPresets = (changes: Partial<PuppetDocument>): PuppetDocument => ({
  ...demo,
  expressions: [
    {
      fadeInTime: 0.2,
      id: 'smile',
      parameters: [{blend: 'add', parameterId, value: 3}],
    },
  ],
  hitAreas: [{id: 'body', partIds: [firstPart!]}],
  poseGroups: [
    {
      entries: [
        {partIds: [firstPart!], value: 0},
        {partIds: [secondPart!], value: 1},
      ],
      id: 'pose',
      parameterId,
    },
  ],
  ...changes,
})

const parses = (document: PuppetDocument) => parseDocument(JSON.stringify(document)).ok

describe('parseDocument expressions, pose groups and hit areas', () => {
  test('should accept presets that reference existing parameters and parts', () => {
    const document = withPresets({})
    expect(parseDocument(JSON.stringify(document))).toEqual({document, ok: true})
  })

  test('should reject expressions with unknown parameters, blends or repeated parameters', () => {
    const expression = withPresets({}).expressions![0]!
    const variants = [
      {...expression, parameters: [{blend: 'add' as const, parameterId: 'missing', value: 1}]},
      {...expression, parameters: [{blend: 'screen', parameterId, value: 1}]},
      {...expression, parameters: [...expression.parameters, ...expression.parameters]},
      {...expression, fadeOutTime: -1},
      {...expression, composition: 'unknown'},
    ]
    for (const variant of variants) {
      expect(parses(withPresets({expressions: [variant as never]}))).toBe(false)
    }
    expect(parses(withPresets({expressions: [expression, expression]}))).toBe(false)
  })

  test('should reject pose groups that share parts, repeat values or miss references', () => {
    const group = withPresets({}).poseGroups![0]!
    const variants = [
      {...group, parameterId: 'missing'},
      {...group, entries: [group.entries[0]!, {...group.entries[1]!, value: 0}]},
      {...group, entries: [group.entries[0]!, {...group.entries[1]!, partIds: [firstPart!]}]},
      {...group, entries: [{partIds: ['missing'], value: 0}]},
      {...group, entries: []},
    ]
    for (const variant of variants) {
      expect(parses(withPresets({poseGroups: [variant]}))).toBe(false)
    }
  })

  test('should reject hit areas without known, distinct parts or with repeated IDs', () => {
    expect(parses(withPresets({hitAreas: [{id: 'body', partIds: []}]}))).toBe(false)
    expect(parses(withPresets({hitAreas: [{id: 'body', partIds: ['missing']}]}))).toBe(false)
    expect(
      parses(
        withPresets({
          hitAreas: [
            {id: 'body', partIds: [firstPart!]},
            {id: 'body', partIds: [secondPart!]},
          ],
        }),
      ),
    ).toBe(false)
  })
})

test('should preserve Cubism expression composition through document serialization', () => {
  const expression = withPresets({}).expressions![0]!
  const document = withPresets({expressions: [{...expression, composition: 'cubism'}]})
  expect(parseDocument(JSON.stringify(document))).toEqual({document, ok: true})
})
