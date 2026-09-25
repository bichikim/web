/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseAlbumTranslation} from '../features/album-translation/output'

it('should parse valid translation JSON when the model adds prose containing a closing brace after it', () => {
  const translations = {
    en: {description: 'Rest', title: 'Night'},
    ja: {description: '休息', title: '夜'},
    'zh-Hans': {description: '休息', title: '夜晚'},
  }
  const output = `${JSON.stringify(translations)}\n\n참고: JSON 예시에는 } 문자가 들어갈 수 있습니다.`

  expect(parseAlbumTranslation(output)).toEqual(translations)
})
