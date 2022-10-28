import {histoireTree} from '../histoire-tree'

describe('histoire name', () => {
  it('should return tree', () => {
    const result = histoireTree('packages/vue-components/src/__stories__/create-story.story.vue', {
      removePaths: ['src', '__stories__'],
      skipHeadPaths: ['packages', 'apps'],
    })

    expect(result).toEqual('vue-components/create-story'.split('/'))
  })
  it('should return tree with empty path', () => {
    const result = histoireTree('', {
      removePaths: ['src', '__stories__'],
      skipHeadPaths: ['packages', 'apps'],
    })

    expect(result).toEqual(''.split('/'))
  })
})
