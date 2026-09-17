import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../create-demo-document'
import type {PuppetPendulum} from '../document'
import {parseDocument} from '../parse-document'

const createPendulum = (changes: Partial<PuppetPendulum> = {}): PuppetPendulum => ({
  damping: 1.2,
  gravity: 9.8,
  id: 'swing',
  inputParameterId: 'angle-x',
  inputScale: 1,
  length: 1,
  outputParameterId: 'angle-y',
  outputScale: 1,
  ...changes,
})

describe('parseDocument physics validation', () => {
  test('should parse optional pendulum physics with parameter references', () => {
    const document = {
      ...createDemoDocument(),
      physics: {
        pendulums: [
          {
            damping: 1.2,
            gravity: 9.8,
            id: 'swing',
            inputParameterId: 'angle-x',
            inputScale: 1,
            length: 1,
            outputParameterId: 'angle-y',
            outputScale: 0.5,
          },
        ],
      },
    }

    expect(parseDocument(JSON.stringify(document))).toEqual({document, ok: true})
  })

  test('should reject pendulum physics with unknown or duplicate output parameters', () => {
    const document = createDemoDocument()
    const pendulum = {
      damping: 1.2,
      gravity: 9.8,
      id: 'swing',
      inputParameterId: 'missing',
      inputScale: 1,
      length: 1,
      outputParameterId: 'angle-y',
      outputScale: 0.5,
    }

    expect(
      parseDocument(JSON.stringify({...document, physics: {pendulums: [pendulum]}})),
    ).toMatchObject({ok: false})

    const validPendulum = {...pendulum, inputParameterId: 'angle-x'}
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          physics: {
            pendulums: [validPendulum, {...validPendulum, id: 'second-swing'}],
          },
        }),
      ),
    ).toMatchObject({ok: false})
  })

  test('should reject a pendulum whose spring rate is not finite', () => {
    const document = createDemoDocument()

    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          physics: {pendulums: [createPendulum({length: Number.MIN_VALUE})]},
        }),
      ),
    ).toMatchObject({ok: false})
  })

  test('should reject a pendulum whose input target can overflow', () => {
    const document = createDemoDocument()

    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          physics: {pendulums: [createPendulum({inputScale: Number.MAX_VALUE})]},
        }),
      ),
    ).toMatchObject({ok: false})
  })
})
