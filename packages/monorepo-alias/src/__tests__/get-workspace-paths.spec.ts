import {getWorkspacePath} from '../get-workspace-paths'
const testPath0 =
  '/Users/app/packages/vue-components/src/headless/form/__stories__/HForm.story.vue'
const testPath1 =
  '/Users/app/apps/vue-components/src/headless/form/__stories__/HForm.story.vue'
const root0 = /^\/Users\/app\/packages\/[-/._a-zA-Z0-9]*\/src\//u
const root1 = /^\/Users\/app\/apps\/[-/._a-zA-Z0-9]*\/src\//u
describe('get-workspace-path', () => {
  it('should return root', () => {
    expect(getWorkspacePath([root0, root1], testPath0)).toBe(
      'headless/form/__stories__/HForm.story.vue',
    )
    expect(getWorkspacePath([root0, root1], testPath1)).toBe(
      'headless/form/__stories__/HForm.story.vue',
    )
    expect(
      getWorkspacePath(
        [root0, root1],
        '/Users/app/packages2/vue-components/src/headless/form/__stories__/HForm.story.vue',
      ),
    ).toBe('')
  })
})
