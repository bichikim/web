/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseAlbumTranslation} from '../features/album-translation/output'

it('should parse translation JSON when explanatory text contains an earlier brace', () => {
  const output =
    'Here is {note} before the payload {"en":{"title":"Night","description":"Rest"},' +
    '"ja":{"title":"夜","description":"休息"},' +
    '"zh-Hans":{"title":"夜晚","description":"休息"}}'

  expect(parseAlbumTranslation(output)).toEqual({
    en: {description: 'Rest', title: 'Night'},
    ja: {description: '休息', title: '夜'},
    'zh-Hans': {description: '休息', title: '夜晚'},
  })
})
