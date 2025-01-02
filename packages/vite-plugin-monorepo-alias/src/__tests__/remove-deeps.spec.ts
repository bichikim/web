import {removeDeeps} from '../remove-deeps'
const testPath0 =
  '/Users/app/packages/vue-components/src/headless/form/__stories__/HForm.story.vue'

describe('removeDeeps', () => {
  it('should return removed path', () => {
    expect(removeDeeps(testPath0, 0)).toBe(
      'Users/app/packages/vue-components/src/headless/form/__stories__',
    )
    expect(removeDeeps(testPath0, 1)).toBe(
      'Users/app/packages/vue-components/src/headless/form',
    )
    expect(removeDeeps(testPath0, 2)).toBe(
      'Users/app/packages/vue-components/src/headless',
    )
  })
})
