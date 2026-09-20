import {expect, it} from 'vitest'
import {parseLanguageLearningTags} from '../tags'

it('should discard empty values and preserve the first casing after trimming', () => {
  expect(parseLanguageLearningTags(' ,\n ')).toEqual([])
  expect(parseLanguageLearningTags(' Home,HOME\n home,Work ')).toEqual(['Home', 'Work'])
})

it('should deduplicate after truncation and count only unique tags toward the limit', () => {
  const prefix = 'X'.repeat(30)
  expect(parseLanguageLearningTags(`${prefix}first,${prefix}second,a,A,b,c,d,e,f,g,h,i,j`)).toEqual(
    [prefix, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
  )
})
