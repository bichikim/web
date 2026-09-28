/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseAlbumTranslation} from '../features/album-translation/output'

it('should use the last valid translation JSON when the model self-corrects', () => {
  const output = `{"en":{"title":"Wrong","description":"x"},"ja":{"title":"a","description":"a"},"zh-Hans":{"title":"a","description":"a"}}
{"en":{"title":"Right","description":"y"},"ja":{"title":"b","description":"b"},"zh-Hans":{"title":"b","description":"b"}}`

  expect(parseAlbumTranslation(output).en.title).toBe('Right')
})
