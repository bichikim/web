import {expect, it} from 'vitest'
import {speechShapes} from '../speech-shapes'

it('should distinguish all five vowels, closures and silence without mouth-opening fallback', () => {
  expect(speechShapes('아 이 우 에 오')).toEqual(['a', null, 'i', null, 'u', null, 'e', null, 'o'])
  expect(speechShapes('마음.')).toEqual(['closed', 'a', 'i', 'closed', null])
  expect(speechShapes('A I U E O')).toEqual(['a', null, 'i', null, 'u', null, 'e', null, 'o'])
})

it('should keep unrounded Korean vowels apart from rounded o and u', () => {
  expect(speechShapes('어여워')).toEqual(['a', 'a', 'a'])
  expect(speechShapes('오요우유')).toEqual(['o', 'o', 'u', 'u'])
  expect(speechShapes('으의위')).toEqual(['i', 'i', 'i'])
  expect(speechShapes('어우')).toEqual(['a', 'u'])
})
