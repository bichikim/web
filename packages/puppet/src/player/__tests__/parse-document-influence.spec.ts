import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../create-demo-document'
import {parseDocument} from '../parse-document'
import {serializeDocument} from '../serialize-document'

describe('parseDocument parameter influence relations', () => {
  test('should round-trip influence composition modes and reject unknown modes', () => {
    const document = createDemoDocument()
    const withMode = (influenceMode: unknown) => ({
      ...document,
      parameterBindings: document.parameterBindings!.map((binding) => ({
        ...binding,
        influenceMode,
      })),
    })
    for (const mode of ['minimum', 'multiply']) {
      const parsed = parseDocument(JSON.stringify(withMode(mode)))
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) {
        throw new Error('Expected influence mode to parse')
      }
      expect(parseDocument(serializeDocument(parsed.document))).toEqual(parsed)
      expect(parsed.document.parameterBindings![0]).toHaveProperty('influenceMode', mode)
    }
    expect(parseDocument(JSON.stringify(withMode('unknown'))).ok).toBe(false)
  })

  const createInfluenced = (influences: unknown) => {
    const document = createDemoDocument()
    return {
      ...document,
      parameterBindings: document.parameterBindings!.map((binding) => ({...binding, influences})),
    }
  }

  test('should preserve influence curves through serialization and parsing', () => {
    const document = createDemoDocument()
    const influenced = {
      ...document,
      parameterBindings: document.parameterBindings!.map((binding) => ({
        ...binding,
        influences: [
          {
            parameterId: 'angle-y',
            points: [
              {value: -30, weight: 1},
              {value: 30, weight: 0},
            ],
          },
        ],
      })),
    }
    expect(parseDocument(serializeDocument(influenced))).toEqual({document: influenced, ok: true})
  })

  test.each(
    [
      null,
      [{parameterId: 'missing', points: [{value: 0, weight: 1}]}],
      [{parameterId: 'angle-y', points: []}],
      [{parameterId: 'angle-y', points: [{value: 0, weight: 2}]}],
      [{parameterId: 'angle-y', points: [{value: -31, weight: 1}]}],
      [
        {
          parameterId: 'angle-y',
          points: [
            {value: 0, weight: 1},
            {value: 0, weight: 0},
          ],
        },
      ],
      [
        {
          parameterId: 'angle-y',
          points: [
            {value: 30, weight: 1},
            {value: 0, weight: 0},
          ],
        },
      ],
      [
        {parameterId: 'angle-y', points: [{value: 0, weight: 1}]},
        {parameterId: 'angle-y', points: [{value: 0, weight: 0}]},
      ],
    ].map((value) => [value]),
  )('should reject invalid influence contracts: %j', (influences) => {
    expect(parseDocument(JSON.stringify(createInfluenced(influences))).ok).toBe(false)
  })
})
