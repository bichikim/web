import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument, serializeDocument} from '../../../player'
import {setParameterInfluences} from '../parameter-influences'

test('should update influence relations without changing keyforms', () => {
  const document = createDemoDocument()
  const binding = document.parameterBindings![0]!
  const influences = [
    {
      parameterId: 'angle-y',
      points: [
        {value: -30, weight: 1},
        {value: 30, weight: 0},
      ],
    },
  ]
  const result = setParameterInfluences({bindingId: binding.id, document, influences})!
  expect(result.parameterBindings![0]!.influences).toEqual(influences)
  expect(result.parameterBindings![0]!.keyforms).toBe(binding.keyforms)
  expect(parseDocument(serializeDocument(result)).ok).toBe(true)
  expect(setParameterInfluences({bindingId: 'missing', document, influences})).toBeUndefined()
  expect(
    setParameterInfluences({
      bindingId: binding.id,
      document,
      influences: [{...influences[0]!, parameterId: 'missing'}],
    }),
  ).toBeUndefined()
})
