import {getWorkspacePath} from '../get-workspace-paths'
const testPath0 =
  '/Users/app/packages/vue-components/src/headless/form/__stories__/HForm.story.vue'
const testPath1 =
  '/Users/app/apps/vue-components/src/headless/form/__stories__/HForm.story.vue'
const root01 = /^\/Users\/app\/packages\//u
describe('get-workspace-path', () => {
  it('should return root regex', () => {
    const [regex] = getWorkspacePath([root01])
    expect(regex).toBe('^\\/Users\\/app\\/packages/[-._a-zA-Z0-9]*/')
    console.log(RegExp(regex, 'u'))
    expect(testPath0.replace(RegExp(regex, 'u'), '')).toBe(
      'src/headless/form/__stories__/HForm.story.vue',
    )
  })
  it('should return root', () => {
    const [regex] = getWorkspacePath(['/Users/app/apps/'])
    expect(regex).toBe('^/Users/app/apps/[-._a-zA-Z0-9]*/')
    expect(testPath1.replace(RegExp(regex, 'u'), '')).toBe(
      'src/headless/form/__stories__/HForm.story.vue',
    )
  })
})
