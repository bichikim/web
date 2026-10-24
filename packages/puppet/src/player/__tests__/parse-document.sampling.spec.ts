import {expect, test} from 'vitest'
import {createDemoDocument, parseDocumentValue} from '../index'

test('should round trip explicit precision, sampling and sound policies', () => {
  const demo = createDemoDocument()
  const document = {
    ...demo,
    motionParameterPrecision: 'float64',
    motions: demo.motions.map((motion) => ({
      ...motion,
      sound: {analysis: 'voice', src: 'talk.wav', volume: 'source'},
    })),
    parameterBindings: demo.parameterBindings!.map((binding) => ({
      ...binding,
      sampling: {continuousPrecision: 'float32', discretePrecision: 'float64', keyTolerance: 0},
    })),
  }
  const parsed = parseDocumentValue(JSON.parse(JSON.stringify(document)))
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) {
    throw new Error('Expected policy document')
  }
  expect(parsed.document.motionParameterPrecision).toBe('float64')
  expect(parsed.document.parameterBindings![0]!.sampling).toEqual(
    document.parameterBindings[0]!.sampling,
  )
  expect(parsed.document.motions[0]!.sound).toEqual(document.motions[0]!.sound)
})

test.each([
  null,
  'bad',
  {continuousPrecision: 'bad'},
  {discretePrecision: 32},
  {keyTolerance: -1},
  {keyTolerance: 0.5},
  {keyTolerance: Number.NaN},
])('should reject invalid sampling policy %j', (sampling) => {
  const demo = createDemoDocument()
  expect(
    parseDocumentValue({
      ...demo,
      parameterBindings: demo.parameterBindings!.map((binding) => ({...binding, sampling})),
    }).ok,
  ).toBe(false)
})

test('should reject invalid document precision and sound policies', () => {
  const demo = createDemoDocument()
  expect(parseDocumentValue({...demo, motionParameterPrecision: 'bad'}).ok).toBe(false)
  for (const sound of [
    {src: 'talk.wav', volume: 'bad'},
    {analysis: 'bad', src: 'talk.wav'},
  ]) {
    expect(
      parseDocumentValue({...demo, motions: demo.motions.map((motion) => ({...motion, sound}))}).ok,
    ).toBe(false)
  }
})
