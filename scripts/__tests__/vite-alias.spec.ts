import {
  createAliasRegexp,
  getParentPath,
  getPathDeeps,
  getPathFromWorkspace,
  removeDeeps,
  removeFile,
  viteAlias,
  viteAliasCustomResolver,
} from '../vite-alias'

jest.mock('../vite-alias', () => {
  const actual = jest.requireActual('../vite-alias')
  return {
    ...actual,
    createAliasRegexp: jest.fn(actual.createAliasRegexp),
    viteAliasCustomResolver: jest.fn(actual.viteAliasCustomResolver),
  }
})

const testPath0 =
  '/Users/bichi/Apps/bluchip-x/packages/vue-components/src/headless/form/__stories__/HForm.story.vue'

const testPath1 =
  '/Users/bichi/Apps/bluchip-x/apps/vue-components/src/headless/form/__stories__/HForm.story.vue'

const root0 = /^\/Users\/bichi\/Apps\/bluchip-x\/packages\/[-/._a-zA-Z0-9]*\/src\//u
const root1 = /^\/Users\/bichi\/Apps\/bluchip-x\/apps\/[-/._a-zA-Z0-9]*\/src\//u

describe('removeFile', () => {
  it('should remove a file name', () => {
    expect(removeFile(testPath0)).toBe(
      '/Users/bichi/Apps/bluchip-x/packages/vue-components/src/headless/form/__stories__/',
    )
  })
})

describe('getPathFromWorkspace', () => {
  it('should return root', () => {
    expect(getPathFromWorkspace([root0, root1], testPath0)).toBe(
      'headless/form/__stories__/HForm.story.vue',
    )
    expect(getPathFromWorkspace([root0, root1], testPath1)).toBe(
      'headless/form/__stories__/HForm.story.vue',
    )
    expect(
      getPathFromWorkspace(
        [root0, root1],
        '/Users/bichi/Apps/bluchip-x/apps1/vue-components/src/headless/form/__stories__/HForm.story.vue',
      ),
    ).toBe('')
  })
})

describe('removeDeeps', () => {
  it('should return removed path', () => {
    expect(removeDeeps(testPath0, 0)).toBe(
      'Users/bichi/Apps/bluchip-x/packages/vue-components/src/headless/form/__stories__',
    )
    expect(removeDeeps(testPath0, 1)).toBe(
      'Users/bichi/Apps/bluchip-x/packages/vue-components/src/headless/form',
    )
    expect(removeDeeps(testPath0, 2)).toBe(
      'Users/bichi/Apps/bluchip-x/packages/vue-components/src/headless',
    )
  })
})

describe('getPathDeeps', () => {
  it('should return count of deeps', () => {
    expect(getPathDeeps('john')).toBe(0)
    expect(getPathDeeps('john/foo')).toBe(1)
    expect(getPathDeeps('foo/bar/john')).toBe(2)
    expect(getPathDeeps('/foo/bar/john/')).toBe(2)
    expect(getPathDeeps('foo/bar/john/')).toBe(2)
    expect(getPathDeeps('foo/bar/john///')).toBe(2)
    expect(getPathDeeps('foo//bar/john///')).toBe(2)
  })
})

describe('getParentPath', () => {
  it('should return parent path ', () => {
    expect(getParentPath(3)).toBe('../../../')
    expect(getParentPath(1)).toBe('../')
    expect(getParentPath(0)).toBe('')
  })
})

describe('viteAliasCustomResolver', () => {
  it('should return alias ', () => {
    const root0 = '/packages/vue-components/src'
    const root1 = /^\/apps\/[/\-_a-z]*\/src\//u
    const resolve = viteAliasCustomResolver({
      root: '/Users/bichi/Apps/bluchip-x',
      workspacePaths: [root0, root1],
    })

    expect(resolve('/foo/bar', testPath0)).toBe(
      '/Users/bichi/Apps/bluchip-x/packages/vue-components/src/foo/bar',
    )
    expect(resolve('foo/bar', testPath1)).toBe(
      '/Users/bichi/Apps/bluchip-x/apps/vue-components/src/foo/bar',
    )
    expect(resolve('foo/bar', undefined)).toBe('foo/bar')
  })
})

describe('viteAlias', () => {
  it('should return vite alias', () => {
    const path = /^\/apps\/[/\-_a-z]*\/src\//u

    const result = viteAlias({
      alias: 'foo',
      root: '/Users/bichi/Apps/bluchip-x',
      workspacePaths: [path],
    })

    expect(result).toEqual({
      customResolver: expect.any(Function),
      find: expect.any(RegExp),
      replacement: '$1',
    })
  })
})

describe('createAliasRegexp', () => {
  it('should return alias regex with /', () => {
    const result = createAliasRegexp('/src')

    expect(result.test('src/foo')).toBeTruthy()
    expect(result.test('src/')).toBeTruthy()
  })

  it('should return alias regex with ./', () => {
    const result = createAliasRegexp('./src/foo')

    expect(result.test('src/foo/')).toBeTruthy()
    expect(result.test('src/foo/bar')).toBeTruthy()
  })
})
