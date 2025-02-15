import {getWorkspacePath} from '../get-workspace-paths'
import {describe, expect, it} from 'vitest'

const testPath0 =
  '/Users/app/packages/vue-components/src/headless/form/__stories__/HForm.story.vue'

const testPath1 =
  '/Users/app/apps/vue-components/src/headless/form/__stories__/HForm.story.vue'
const root01 = /^\/Users\/app\/packages\//u

describe('get-workspace-path', () => {
  it('should return root regex', () => {
    const [regex] = getWorkspacePath([root01])

    expect(regex).toBe(String.raw`^\/Users\/app\/packages/[-._a-zA-Z0-9]*/`)

    expect(testPath0.replace(new RegExp(regex, 'u'), '')).toBe(
      'src/headless/form/__stories__/HForm.story.vue',
    )
  })

  it('should return root', () => {
    const [regex] = getWorkspacePath(['/Users/app/apps/'])

    expect(regex).toBe('^/Users/app/apps/[-._a-zA-Z0-9]*/')

    expect(testPath1.replace(new RegExp(regex, 'u'), '')).toBe(
      'src/headless/form/__stories__/HForm.story.vue',
    )
  })
})
