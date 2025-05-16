import {describe, expect, it, vi} from 'vitest'
import {createAlias, getWorkspaceRegex, matchWorkspace, normalizeAlias, normalizeAliasTree} from './alias'

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
    const path = '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/index.ts'
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
})

describe('createAlias', () => {
  it.each([
    {
      id: '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/index.ts',
      importer: '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/foo.ts',
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

    const resolve = vi.fn(() => Promise.resolve({id: ''}))

    const source = 'src/index.ts'

    resolveId.call(
      {
        resolve,
      },
      source,
      importer,
      {},
    )
    expect(resolve).toHaveBeenCalledWith(id, importer, {skipSelf: true})
  })

  it('should return alias plugin with alias options', () => {
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

    const importer = '/Users/user-name/Documents/Apps/web/packages/vite-plugin-monorepo-alias/src/foo.ts'
    const source = '#utils/index.ts'

    resolveId.call(
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
  })
})

describe('normalizeAlias', () => {
  it('should return normalized alias', () => {
    const result = normalizeAlias({
      '#components': 'src/components',
      '#utils': 'src/utils',
    })

    expect(result).toEqual([
      [/^#components/u, 'src/components'],
      [/^#utils/u, 'src/utils'],
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
      '/packages/web/': [[/^#utils/u, 'src/utils']],
    })
  })
})
