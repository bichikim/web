import {removeFile} from '../remove-file'
import {describe, expect, it} from 'vitest'

const testPath0 =
  '/Users/app/packages/vue-components/src/headless/form/__stories__/HForm.story.vue'

describe('removeFile', () => {
  it('should remove a file name', () => {
    expect(removeFile(testPath0)).toBe(
      '/Users/app/packages/vue-components/src/headless/form/__stories__/',
    )
  })
})
