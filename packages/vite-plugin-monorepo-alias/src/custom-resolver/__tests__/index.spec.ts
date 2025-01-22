import {createCustomResolver} from '../'
import {describe, expect, it, vi} from 'vitest'

describe('createCustomResolver', () => {
  const fakeResolve = vi.fn(() => ({id: 'fake-id'}))
  const fakeRollup = {
    resolve: fakeResolve,
  }

  it.each([
    //
    [
      '/Apps/app',
      'src',
      ['packages', 'apps'],
      {
        importer: '/Apps/app/packages/use/src/hooks/foo/index.ts',
        options: {
          assertions: {},
          custom: undefined,
          isEntry: false,
          scan: false,
          ssr: true,
        },
        source: 'refs/default-ref',
      },
      true,
      {id: 'fake-id'},
    ],
    [
      '/Apps/app',
      'src',
      [/^\/apps\//u, /^\/packages\//u],
      {
        importer: '/Apps/app/packages/use/src/hooks/foo/index.ts',
        options: {
          assertions: {},
          custom: undefined,
          isEntry: false,
          scan: false,
          ssr: true,
        },
        source: 'refs/default-ref',
      },
      false,
      {id: '/Apps/app/packages/use/src/refs/default-ref'},
    ],
    [
      '/Apps/app',
      'src',
      ['/apps', '/packages'],
      {
        importer: '/Apps/app/packages/use/src/hooks/foo/index.ts',
        options: {
          assertions: {},
          custom: undefined,
          isEntry: false,
          scan: false,
          ssr: true,
        },
        source: 'refs/default-ref',
      },
      false,
      {id: '/Apps/app/packages/use/src/refs/default-ref'},
    ],
  ])(
    'should create custom resolver',
    // eslint-disable-next-line max-params
    async (root, sourceRoot, workspacePaths, mockParams, hasResolver, result) => {
      const customResolver = createCustomResolver({
        root,
        sourceRoot,
        workspacePaths,
      })

      if (hasResolver) {
        expect(
          await customResolver.call(
            fakeRollup,
            mockParams.source,
            mockParams.importer,
            mockParams.options,
          ),
        ).toEqual(result)
      } else {
        expect(
          await customResolver.call(
            {},
            mockParams.source,
            mockParams.importer,
            mockParams.options,
          ),
        ).toEqual(result)
      }
    },
  )
})
