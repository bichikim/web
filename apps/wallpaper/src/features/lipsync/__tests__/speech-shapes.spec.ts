import {expect, it} from 'vitest'
import {speechShapes} from '../speech-shapes'

it('should distinguish all five vowels, closures and silence without mouth-opening fallback', () => {
  expect(speechShapes('아 이 우 에 오')).toEqual(['a', null, 'i', null, 'u', null, 'e', null, 'o'])
  expect(speechShapes('마음.')).toEqual(['closed', 'a', 'u', 'closed', null])
  expect(speechShapes('A I U E O')).toEqual(['a', null, 'i', null, 'u', null, 'e', null, 'o'])
})
