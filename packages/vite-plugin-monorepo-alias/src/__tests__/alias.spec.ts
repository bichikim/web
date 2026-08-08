import {describe, expect, it, vi} from 'vitest'
import {
  createAlias,
  getAliasId,
  getWorkspaceRegex,
  getWorkspaceRegexList,
  getWorkspaceRegexString,
  matchWorkspace,
  normalizeAlias,
  normalizeAliasKey,
  normalizeAliasTree,
  normalizeAliasTreeKey,
  trimFirstSlash,
  trimLastSlash,
} from '../alias'

describe('trimFirstSlash / trimLastSlash', () => {
  it('should trim slashes at the start and end', () => {
    expect(trimFirstSlash('///packages', '/')).toBe('/packages')
    expect(trimLastSlash('/packages///', '/')).toBe('/packages/')
  })

  it('should trim a single leading backslash', () => {
    expect(trimFirstSlash(String.raw`\packages`, '')).toBe('packages')
  })

  it('should trim a single trailing backslash', () => {
    expect(trimLastSlash('C:\\packages\\', '')).toBe(String.raw`C:\packages`)
  })
})

describe('getWorkspaceRegexString / getWorkspaceRegexList', () => {
  it('should build a regex from workspace path string', () => {
    expect(getWorkspaceRegexString('packages')).toEqual(/\/packages\/[-._a-zA-Z0-9]+\//u)
    expect(getWorkspaceRegexString('/packages/')).toEqual(/\/packages\/[-._a-zA-Z0-9]+\//u)
  })

  it('should build a list of workspace regexes', () => {
    const list = getWorkspaceRegexList(['packages/', /apps/u])

    expect(list).toHaveLength(2)
    expect(list[0]).toEqual(/\/packages\/[-._a-zA-Z0-9]+\//u)
    expect(list[1]).toEqual(/\/apps\/[-._a-zA-Z0-9]+\//u)
  })
})

describe('getAliasId', () => {
  it('should replace alias prefix when matched', () => {
    const result = getAliasId('#utils/index.ts', [[/^#utils/u, 'src/utils']])

    expect(result).toBe('src/utils/index.ts')
  })

  it('should use default empty alias list when alias is omitted', () => {
    const result = getAliasId('src/index.ts')

    expect(result).toBe('src/index.ts')
  })

  it('should return original source when no alias matched', () => {
    const result = getAliasId('src/index.ts', [[/^#utils/u, 'src/utils']])

    expect(result).toBe('src/index.ts')
  })

  it('should not match an alias that is only a partial segment prefix', () => {
    const result = getAliasId('srcset/index.ts', [[normalizeAliasKey('src'), 'source']])

    expect(result).toBe('srcset/index.ts')
  })
})

describe('normalizeAliasKey / normalizeAliasTreeKey', () => {
  it('should normalize alias key to regex', () => {
    expect(normalizeAliasKey('#utils')).toEqual(/^#utils(?=\/|$)/u)
  })

  it('should escape regex metacharacters in alias key so only literal path matches', () => {
    const key = normalizeAliasKey('src/utils')

    expect('src/utils/index.ts'.replace(key, '')).toBe('/index.ts')
    expect('srcXutils/index.ts'.replace(key, '')).toBe('srcXutils/index.ts')
  })

  it('should normalize alias tree key to /.../', () => {
    expect(normalizeAliasTreeKey('packages/web')).toBe('/packages/web/')
    expect(normalizeAliasTreeKey('/packages/web/')).toBe('/packages/web/')
  })
})

describe('getWorkspaceRegex', () => {
  it.each([
    {
      workspacePath: '/packages',
    },
    {
      workspacePath: 'packages/',
    },
    {
      workspacePath: '/packages',
    },
    {
      workspacePath: /packages/u,
    },
    {
      workspacePath: /\/packages\//u,
    },
    {
      workspacePath: /\/packages/u,
    },
    {
      workspacePath: /packages\//u,
    },
  ])('should return regex', ({workspacePath}) => {
    const path =
      '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/index.ts'
    const result = getWorkspaceRegex(workspacePath)

    const [first, last] = path.split(result)

    expect(first).toBe('/Users/user-name/Documents/Apps/web')
    expect(last).toBe('src/index.ts')
  })
})

describe('matchWorkspace', () => {
  it('should return relative path', () => {
    const result = matchWorkspace(
      '/Users/user-name/Documents/Apps/web',
      [getWorkspaceRegex(/\/packages\//u)],
      '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/index.ts',
    )

    expect(result).toEqual({
      relativePath: 'src/index.ts',
      relativeWorkspaceRoot: '/packages/vite-plugin-monorepo-alias/',
      root: '/Users/user-name/Documents/Apps/web',
      workspaceRoot: '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias',
    })
  })

  it('should return relative path on window os', () => {
    const result = matchWorkspace(
      String.raw`C:/Users/user-name/Documents/Apps/web`,
      [getWorkspaceRegex(/\/packages\//u)],
      String.raw`C:/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/foo.ts`,
    )

    expect(result).toEqual({
      relativePath: 'src/foo.ts',
      relativeWorkspaceRoot: '/packages/vite-plugin-monorepo-alias/',
      root: String.raw`C:/Users/user-name/Documents/Apps/web`,
      workspaceRoot: String.raw`C:/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias`,
    })
  })

  it('should return undefined when no workspace matched', () => {
    const result = matchWorkspace(
      '/Users/user-name/Documents/Apps/web',
      [getWorkspaceRegex(/\/packages\//u)],
      '/Users/user-name/Documents/Apps/web/src/index.ts',
    )

    expect(result).toBeUndefined()
  })

  it('should keep searching when a match exists but root mismatch', () => {
    const root = '/Users/user-name/Documents/Apps/web'
    const fullPath = `${root}/packages/vite-plugin-monorepo-alias/src/index.ts`

    const result = matchWorkspace(
      root,
      [/\/Users\/user-name\/Documents\//u, getWorkspaceRegexString('packages')],
      fullPath,
    )

    expect(result).toEqual({
      relativePath: 'src/index.ts',
      relativeWorkspaceRoot: '/packages/vite-plugin-monorepo-alias/',
      root,
      workspaceRoot: '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias',
    })
  })

  it('should use the apps workspace after /apps/web/ in the repo root path (Vitest-style root)', () => {
    const root = '/Users/bichi/apps/web'
    const appsWorkspace = getWorkspaceRegexString('apps')

    const result = matchWorkspace(
      root,
      [appsWorkspace],
      '/Users/bichi/apps/web/apps/coong/src/use/storage/index.ts',
    )

    expect(result).toEqual({
      relativePath: 'src/use/storage/index.ts',
      relativeWorkspaceRoot: '/apps/coong/',
      root,
      workspaceRoot: '/Users/bichi/apps/web/apps/coong',
    })
  })
})

describe('createAlias', () => {
  it('returns source when workspacePaths is not configured', async () => {
    const plugin: any = createAlias({})
    const resolve = vi.fn(() => Promise.resolve({id: 'resolved'}))

    const result = await plugin.resolveId.call(
      {resolve},
      'src/index.ts',
      '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/foo.ts',
      undefined,
    )

    expect(result).toBe('src/index.ts')
    expect(resolve).not.toHaveBeenCalled()
  })

  it('should return source when importer is undefined', async () => {
    const plugin: any = createAlias({
      root: '/Users/user-name/Documents/Apps/web',
      workspacePaths: ['packages/'],
    })
    const resolve = vi.fn(() => Promise.resolve({id: 'resolved'}))

    const result = await plugin.resolveId.call({resolve}, 'src/index.ts', undefined, {})

    expect(result).toBe('src/index.ts')
    expect(resolve).not.toHaveBeenCalled()
  })

  it('should return source when source is virtual module', async () => {
    const plugin: any = createAlias({
      root: '/Users/user-name/Documents/Apps/web',
      workspacePaths: ['packages/'],
    })
    const resolve = vi.fn(() => Promise.resolve({id: 'resolved'}))

    const result = await plugin.resolveId.call(
      {resolve},
      'virtual:foo',
      '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/foo.ts',
      {},
    )

    expect(result).toBe('virtual:foo')
    expect(resolve).not.toHaveBeenCalled()
  })

  it(String.raw`should return null when source includes \0`, async () => {
    const plugin: any = createAlias({
      root: '/Users/user-name/Documents/Apps/web',
      workspacePaths: ['packages/'],
    })
    const resolve = vi.fn(() => Promise.resolve({id: 'resolved'}))

    const result = await plugin.resolveId.call(
      {resolve},
      'foo\0bar',
      '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/foo.ts',
      {},
    )

    expect(result).toBeNull()
    expect(resolve).not.toHaveBeenCalled()
  })

  it('should return source when importer is outside of configured workspace', async () => {
    const plugin: any = createAlias({
      root: '/Users/user-name/Documents/Apps/web',
      workspacePaths: ['packages/'],
    })
    const resolve = vi.fn(() => Promise.resolve({id: 'resolved'}))

    const result = await plugin.resolveId.call(
      {resolve},
      'src/index.ts',
      '/Users/user-name/Documents/Apps/web/src/foo.ts',
      {},
    )

    expect(result).toBe('src/index.ts')
    expect(resolve).not.toHaveBeenCalled()
  })

  it('should ignore imports that do not match a configured alias', async () => {
    const plugin: any = createAlias({
      root: '/Users/user-name/Documents/Apps/web',
      workspacePaths: ['packages/'],
    })
    const resolve = vi.fn(() => Promise.resolve(null))
    const importer =
      '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/foo.ts'

    const result = await plugin.resolveId.call({resolve}, 'solid-js', importer, {})

    expect(result).toBeNull()
    expect(resolve).not.toHaveBeenCalled()
  })

  it.each([
    {
      id: '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/index.ts',
      importer:
        '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/foo.ts',
      root: '/Users/user-name/Documents/Apps/web',
      separator: '/',
      workspacePaths: ['packages/'],
    },
    {
      id: `C:\\Users\\user-name\\Documents\\Apps\\web\\packages\\vite-plugin-monorepo-alias\\src\\index.ts`,
      importer: `C:\\Users\\user-name\\Documents\\Apps\\web\\packages\\vite-plugin-monorepo-alias\\src\\foo.ts`,
      root: `C:\\Users\\user-name\\Documents\\Apps\\web`,
      separator: '\\',
      workspacePaths: ['packages/'],
    },
  ])('should return alias plugin', ({root, workspacePaths, importer, id, separator}) => {
    const result: any = createAlias({root, separator, workspacePaths})

    const {resolveId} = result

    const resolved = {id: 'resolved-id'}
    const resolve = vi.fn(() => Promise.resolve(resolved))

    const source = 'src/index.ts'

    return resolveId
      .call(
        {
          resolve,
        },
        source,
        importer,
        {custom: 'value'},
      )
      .then((value: unknown) => {
        expect(resolve).toHaveBeenCalledWith(id, importer, {custom: 'value', skipSelf: true})
        expect(value).toBe(resolved)
      })
  })

  it('should return alias plugin with alias options', async () => {
    const result: any = createAlias({
      alias: {
        'packages/vite-plugin-monorepo-alias': {
          '#utils': 'src/utils',
        },
      },
      root: '/Users/user-name/Documents/Apps/web',
      workspacePaths: ['packages/'],
    })

    const {resolveId} = result

    const resolve = vi.fn(() => Promise.resolve({id: ''}))

    const importer =
      '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/foo.ts'
    const source = '#utils/index.ts'

    const returned = await resolveId.call(
      {
        resolve,
      },
      source,
      importer,
      {},
    )

    expect(resolve).toHaveBeenCalledWith(
      '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/utils/index.ts',
      importer,
      {skipSelf: true},
    )
    expect(returned).toEqual({id: ''})
  })

  it('should return {id} when resolve returns null', async () => {
    const result: any = createAlias({
      root: '/Users/user-name/Documents/Apps/web',
      workspacePaths: ['packages/'],
    })

    const {resolveId} = result
    const resolve = vi.fn(() => Promise.resolve(null))

    const importer =
      '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/foo.ts'
    const source = 'src/index.ts'

    const returned = await resolveId.call({resolve}, source, importer, {})

    expect(returned).toEqual({
      id: '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/index.ts',
    })
  })

  it('should allow resolveOptions to override skipSelf', async () => {
    const result: any = createAlias({
      root: '/Users/user-name/Documents/Apps/web',
      workspacePaths: ['packages/'],
    })

    const {resolveId} = result
    const resolve = vi.fn(() => Promise.resolve({id: 'resolved'}))

    const importer =
      '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/foo.ts'
    const source = 'src/index.ts'

    await resolveId.call({resolve}, source, importer, {custom: 'value', skipSelf: false})

    expect(resolve).toHaveBeenCalledWith(
      '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/index.ts',
      importer,
      {custom: 'value', skipSelf: false},
    )
  })
})

describe('normalizeAlias', () => {
  it('should return normalized alias', () => {
    const result = normalizeAlias({
      '#components': 'src/components',
      '#utils': 'src/utils',
    })

    expect(result).toEqual([
      [/^#components(?=\/|$)/u, 'src/components'],
      [/^#utils(?=\/|$)/u, 'src/utils'],
    ])
  })
})

describe('normalizeAliasTree', () => {
  it('should return normalized alias tree', () => {
    const result = normalizeAliasTree({
      'packages/web': {
        '#utils': 'src/utils',
      },
    })

    expect(result).toEqual({
      '/packages/web/': [[/^#utils(?=\/|$)/u, 'src/utils']],
    })
  })
})
